'use strict';

/**
 * sessionStore.js — In-memory server-side session storage.
 *
 * Sessions live ONLY on the server. The browser holds a random session id in
 * an httpOnly cookie; tokens are never exposed to the client and nothing is
 * written to disk.
 *
 * Sessions expire lazily after 24h (TTL). Expired entries are removed on read.
 */

const { v4: uuidv4 } = require('uuid');

const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/** @type {Map<string, object>} */
const sessions = new Map();

function now() {
  return Date.now();
}

function isExpired(session) {
  return now() >= session.expiresAt;
}

/**
 * Create a session after a successful Spotify login.
 * @param {object} data - { accessToken, refreshToken, expiresInSec, spotifyUserId, displayName }
 * @returns {string} sessionId
 */
function create(data) {
  const sessionId = uuidv4();
  sessions.set(sessionId, {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken || null,
    expiresAt: now() + (data.expiresInSec || 3600) * 1000,
    spotifyUserId: data.spotifyUserId,
    displayName: data.displayName || null,
    createdAt: now(),
  });
  return sessionId;
}

/**
 * Get a session by id; returns null if missing or expired (lazy expiry).
 * @param {string} sessionId
 * @returns {object|null}
 */
function get(sessionId) {
  if (!sessionId) return null;
  const session = sessions.get(sessionId);
  if (!session) return null;
  if (isExpired(session)) {
    sessions.delete(sessionId);
    return null;
  }
  return session;
}

/**
 * Destroy a session (logout).
 * @param {string} sessionId
 */
function destroy(sessionId) {
  if (sessionId) sessions.delete(sessionId);
}

/**
 * Update stored tokens after a refresh.
 * @param {string} sessionId
 * @param {object} data - { accessToken, refreshToken?, expiresInSec? }
 */
function updateTokens(sessionId, data) {
  const session = sessions.get(sessionId);
  if (!session || isExpired(session)) return false;
  session.accessToken = data.accessToken;
  if (data.refreshToken) session.refreshToken = data.refreshToken;
  session.expiresAt = now() + (data.expiresInSec || 3600) * 1000;
  return true;
}

/**
 * Refresh the access token if it is expired (or expiring within a minute).
 * Mutates the stored session in place.
 * @param {string} sessionId
 * @returns {Promise<boolean>} true if the session now has a fresh token
 */
async function refreshIfNeeded(sessionId) {
  const session = sessions.get(sessionId);
  if (!session || isExpired(session)) return false;

  const marginMs = 60 * 1000;
  if (now() + marginMs < session.expiresAt) return true; // still fresh

  if (!session.refreshToken) return false;

  // Lazy-require to avoid a circular dependency with spotifyClient.js
  const spotifyClient = require('./spotifyClient');
  const tokens = await spotifyClient.refreshAccessToken(session.refreshToken);
  if (!tokens) return false;
  return updateTokens(sessionId, tokens);
}

function size() {
  return sessions.size;
}

module.exports = {
  create,
  get,
  destroy,
  updateTokens,
  refreshIfNeeded,
  size,
  SESSION_TTL_MS,
};
