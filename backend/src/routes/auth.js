'use strict';

/**
 * routes/auth.js — Spotify OAuth login flow.
 *
 * GET  /auth/login    -> redirect to Spotify authorization page
 * GET  /auth/callback -> exchange code for tokens, create session, set cookie
 * GET  /auth/status   -> { authenticated, displayName }
 * POST /auth/logout   -> destroy session, clear cookie
 *
 * No tokens are ever sent to the browser; the browser only holds a random
 * session id in an httpOnly cookie.
 */

const express = require('express');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');
const sessionStore = require('../sessionStore');

const router = express.Router();

const SPOTIFY_AUTHORIZE_URL = 'https://accounts.spotify.com/authorize';
const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';
const SPOTIFY_ME_URL = 'https://api.spotify.com/v1/me';

const SCOPES = [
  'user-library-read',
  'playlist-read-private',
  'playlist-read-collaborative',
  'playlist-modify-public',
  'playlist-modify-private',
].join(' ');

/** In-memory OAuth state store (prevents CSRF on the callback). Short-lived. */
const pendingStates = new Map(); // state -> createdAt
const STATE_TTL_MS = 10 * 60 * 1000;

function rememberState(state) {
  pendingStates.set(state, Date.now());
  // opportunistic cleanup
  for (const [s, t] of pendingStates) {
    if (Date.now() - t > STATE_TTL_MS) pendingStates.delete(s);
  }
}

function consumeState(state) {
  const t = pendingStates.get(state);
  if (!t) return false;
  pendingStates.delete(state);
  return Date.now() - t <= STATE_TTL_MS;
}

function cookieOptions() {
  return {
    httpOnly: true,
    secure: config.isProduction, // https only in production
    sameSite: 'lax',
    maxAge: sessionStore.SESSION_TTL_MS,
    path: '/',
  };
}

router.get('/login', (req, res) => {
  const state = uuidv4();
  rememberState(state);
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: config.spotifyClientId,
    scope: SCOPES,
    redirect_uri: config.redirectUri,
    state,
    show_dialog: 'false',
  });
  res.redirect(`${SPOTIFY_AUTHORIZE_URL}?${params.toString()}`);
});

router.get('/callback', async (req, res, next) => {
  try {
    const { code, state, error } = req.query;

    if (error) {
      return res.redirect(`${config.frontendUrl}/?auth=denied`);
    }
    if (!code || !state || !consumeState(state)) {
      return res.status(400).send('Invalid or expired OAuth state.');
    }

    // Exchange the authorization code for tokens.
    const tokenRes = await axios.post(
      SPOTIFY_TOKEN_URL,
      new URLSearchParams({
        grant_type: 'authorization_code',
        code: String(code),
        redirect_uri: config.redirectUri,
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

    const { access_token, refresh_token, expires_in } = tokenRes.data;

    // Fetch the Spotify profile for identity/display name.
    const meRes = await axios.get(SPOTIFY_ME_URL, {
      headers: { Authorization: `Bearer ${access_token}` },
      timeout: 15_000,
    });

    const sessionId = sessionStore.create({
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresInSec: expires_in,
      spotifyUserId: meRes.data.id,
      displayName: meRes.data.display_name || meRes.data.id,
    });

    // eslint-disable-next-line no-console
    console.log(
      `[auth] login ok (user id hidden in logs for privacy)`
    );
    res.cookie('sws_session', sessionId, cookieOptions());
    res.redirect(`${config.frontendUrl}/dashboard`);
  } catch (err) {
    next(err);
  }
});

router.get('/status', (req, res) => {
  const session = sessionStore.get(req.cookies.sws_session);
  if (!session) {
    return res.json({ authenticated: false, displayName: null });
  }
  res.json({ authenticated: true, displayName: session.displayName });
});

router.post('/logout', (req, res) => {
  sessionStore.destroy(req.cookies.sws_session);
  res.clearCookie('sws_session', { path: '/' });
  res.json({ ok: true });
});

module.exports = router;
