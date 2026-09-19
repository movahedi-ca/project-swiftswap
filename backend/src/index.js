'use strict';

/**
 * index.js — SwiftSwap backend entrypoint.
 *
 * Express app: CORS for the frontend, cookie parsing, JSON bodies,
 * auth + API routes, /healthz, and a global JSON error handler.
 * Logs only non-sensitive information (no tokens or secrets).
 */

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const config = require('./config');
const authRoutes = require('./routes/auth');
const apiRoutes = require('./routes/api');

const app = express();

// Trust the first proxy (needed for `secure` cookies behind a reverse proxy).
if (config.isProduction) app.set('trust proxy', 1);

app.use(
  cors({
    origin: config.frontendUrl,
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));

// Minimal request logging: method + path only. Never log headers/cookies/body.
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    // eslint-disable-next-line no-console
    console.log(
      `[http] ${req.method} ${req.path} -> ${res.statusCode} (${Date.now() - start}ms)`
    );
  });
  next();
});

app.get('/healthz', (req, res) => {
  res.json({ ok: true, env: config.nodeEnv });
});

app.use('/auth', authRoutes);
app.use('/api', apiRoutes);

// 404 for anything else under the API surface.
app.use((req, res) => {
  res.status(404).json({ error: 'not_found' });
});

// Global error handler -> JSON. Never leaks tokens or secrets.
app.use((err, req, res, next) => {
  void next;
  const status = err && err.response ? err.response.status : null;
  const message =
    err && err.response && err.response.data && err.response.data.error
      ? err.response.data.error.message || 'spotify_error'
      : 'internal_error';
  // eslint-disable-next-line no-console
  console.error(
    `[error] ${req.method} ${req.path} -> ${status || 500}`
  );
  res.status(status || 500).json({
    error: status ? message : 'internal_error',
  });
});

app.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(
    `[swiftswap] backend listening on port ${config.port} (${config.nodeEnv})`
  );
});
