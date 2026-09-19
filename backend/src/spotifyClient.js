'use strict';

/**
 * spotifyClient.js — Rate-limit-aware wrapper around the Spotify Web API.
 *
 * Guarantees:
 *  - Never logs access/refresh tokens.
 *  - On 429: honors the Retry-After header, then falls back to exponential
 *    backoff (base 1s, capped at 32s, max 5 attempts) for 429/5xx.
 *  - On 401: refreshes the access token once via accounts.spotify.com and
 *    retries the original request a single time.
 *
 * Exports get/post/put/delete helpers with the signature:
 *   (session, url, data?, params?) -> Promise<axios response>
 */

const axios = require('axios');
const config = require('./config');

const SPOTIFY_API_BASE = 'https://api.spotify.com';
const SPOTIFY_ACCOUNTS_BASE = 'https://accounts.spotify.com';

const api = axios.create({
  baseURL: SPOTIFY_API_BASE,
  timeout: 20_000,
});

const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);
const MAX_ATTEMPTS = 5;
const BACKOFF_BASE_MS = 1000;
const BACKOFF_MAX_MS = 32_000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Jittered exponential backoff delay for a given attempt (1-based). */
function backoffDelayMs(attempt, retryAfterSeconds) {
  if (typeof retryAfterSeconds === 'number' && retryAfterSeconds >= 0) {
    return Math.min(retryAfterSeconds * 1000, BACKOFF_MAX_MS);
  }
  const exp = Math.min(BACKOFF_BASE_MS * 2 ** (attempt - 1), BACKOFF_MAX_MS);
  const jitter = Math.floor(Math.random() * 250);
  return exp + jitter;
}

function isNetworkError(err) {
  return !err.response && (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT' || !err.code);
}

/**
 * Exchange a refresh token for a new access token.
 * @param {string} refreshToken
 * @returns {Promise<{accessToken, refreshToken?, expiresInSec}|null>} null on failure
 */
async function refreshAccessToken(refreshToken) {
  try {
    const res = await axios.post(
      `${SPOTIFY_ACCOUNTS_BASE}/api/token`,
      new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }).toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization:
            'Basic ' +
            Buffer.from(
              `${config.spotifyClientId}:${config.spotifyClientSecret}`
            ).toString('base64'),
        },
        timeout: 15_000,
      }
    );
    return {
      accessToken: res.data.access_token,
      refreshToken: res.data.refresh_token || null,
      expiresInSec: res.data.expires_in || 3600,
    };
  } catch (err) {
    // Never log tokens; log only status for diagnostics.
    // eslint-disable-next-line no-console
    console.error(
      '[spotifyClient] token refresh failed',
      err.response ? `status=${err.response.status}` : 'network error'
    );
    return null;
  }
}

/**
 * Raw request with retry/backoff handling.
 * @param {object} session - mutable session object from sessionStore
 * @param {string} method - get|post|put|delete
 * @param {string} url - path like /v1/me/playlists (baseURL prepended)
 * @param {object} [options] - { data, params }
 */
async function request(session, method, url, options = {}) {
  let refreshedOnce = false;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      return await api.request({
        method,
        url,
        headers: { Authorization: `Bearer ${session.accessToken}` },
        data: options.data,
        params: options.params,
      });
    } catch (err) {
      const status = err.response ? err.response.status : null;

      // 401 -> refresh token once, then retry the original request once.
      if (status === 401 && !refreshedOnce && session.refreshToken) {
        const tokens = await refreshAccessToken(session.refreshToken);
        if (tokens) {
          session.accessToken = tokens.accessToken;
          if (tokens.refreshToken) session.refreshToken = tokens.refreshToken;
          session.expiresAt =
            Date.now() + (tokens.expiresInSec || 3600) * 1000;
          refreshedOnce = true;
          continue;
        }
        throw err; // refresh failed; surface the 401
      }

      const retryable =
        (status && RETRYABLE_STATUS.has(status)) || isNetworkError(err);

      if (!retryable || attempt === MAX_ATTEMPTS) {
        throw err;
      }

      const retryAfter =
        status === 429 && err.response.headers['retry-after']
          ? Number(err.response.headers['retry-after'])
          : undefined;
      const delay = backoffDelayMs(attempt, retryAfter);
      // eslint-disable-next-line no-console
      console.warn(
        `[spotifyClient] ${method.toUpperCase()} ${url} -> ${
          status || 'network'
        }; retry ${attempt}/${MAX_ATTEMPTS} in ${delay}ms`
      );
      await sleep(delay);
    }
  }
  // Unreachable: loop either returns or throws.
  throw new Error('spotifyClient: exhausted retries');
}

const get = (session, url, params) => request(session, 'get', url, { params });
const post = (session, url, data) => request(session, 'post', url, { data });
const put = (session, url, data) => request(session, 'put', url, { data });
const del = (session, url, data) => request(session, 'delete', url, { data });

module.exports = {
  get,
  post,
  put,
  delete: del,
  refreshAccessToken,
  request,
};
