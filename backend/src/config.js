'use strict';

/**
 * config.js — Loads environment variables and validates required ones at boot.
 *
 * The app refuses to start if any required variable is missing so a
 * misconfigured deploy fails loudly instead of half-working.
 */

require('dotenv').config();

const REQUIRED_VARS = [
  'SPOTIFY_CLIENT_ID',
  'SPOTIFY_CLIENT_SECRET',
  'REDIRECT_URI',
  'FRONTEND_URL',
  'SESSION_SECRET',
];

function loadConfig() {
  const missing = REQUIRED_VARS.filter(
    (name) => !process.env[name] || String(process.env[name]).trim() === ''
  );

  if (missing.length > 0) {
    // eslint-disable-next-line no-console
    console.error(
      `[config] Missing required environment variables: ${missing.join(', ')}\n` +
        '[config] Copy .env.example to .env and fill in the values.'
    );
    process.exit(1);
  }

  if (
    process.env.NODE_ENV === 'production' &&
    /CHANGE_ME/i.test(process.env.SESSION_SECRET)
  ) {
    // eslint-disable-next-line no-console
    console.error(
      '[config] SESSION_SECRET is still the placeholder value; refusing to boot in production.'
    );
    process.exit(1);
  }

  const config = Object.freeze({
    spotifyClientId: process.env.SPOTIFY_CLIENT_ID,
    spotifyClientSecret: process.env.SPOTIFY_CLIENT_SECRET,
    redirectUri: process.env.REDIRECT_URI,
    frontendUrl: process.env.FRONTEND_URL.replace(/\/$/, ''),
    port: Number(process.env.PORT) || 4000,
    sessionSecret: process.env.SESSION_SECRET,
    nodeEnv: process.env.NODE_ENV || 'development',
    isProduction: (process.env.NODE_ENV || 'development') === 'production',
  });

  return config;
}

module.exports = loadConfig();
