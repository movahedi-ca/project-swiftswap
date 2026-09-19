'use strict';

/**
 * routes/api.js — Authenticated JSON API.
 *
 * GET  /api/me                    -> current Spotify profile (no tokens)
 * GET  /api/scan                  -> start a scan job, returns { jobId }
 * GET  /api/jobs/:jobId           -> job status/progress/results
 * POST /api/jobs/:jobId/pause     -> request pause
 * POST /api/jobs/:jobId/resume    -> request resume
 * POST /api/jobs/:jobId/cancel    -> request cancel
 * POST /api/substitute            -> start a substitute job, returns { jobId }
 * GET  /api/mapping               -> mapping metadata + per-era counts
 */

const express = require('express');
const sessionStore = require('../sessionStore');
const spotify = require('../spotifyClient');
const mappingStore = require('../mappingStore');
const jobs = require('../jobs');

const router = express.Router();

const PAGE_LIMIT = 50;

/* ── auth middleware ─────────────────────────────────────────────── */

function requireAuth(req, res, next) {
  const session = sessionStore.get(req.cookies.sws_session);
  if (!session) {
    return res.status(401).json({ error: 'not_authenticated' });
  }
  // Refresh proactively so workers don't start with a dead token.
  sessionStore
    .refreshIfNeeded(req.cookies.sws_session)
    .then(() => {
      req.session = session;
      next();
    })
    .catch(next);
}

router.use(requireAuth);

/* ── helpers ─────────────────────────────────────────────────────── */

function trackSummary(track) {
  return {
    uri: track.uri,
    title: track.name,
    artists: (track.artists || []).map((a) => a.name),
    isrc: (track.external_ids && track.external_ids.isrc) || null,
  };
}

/** Sleep loop honoring pause; throws {cancelled:true} when cancel requested. */
async function honorPause(job) {
  while (job.pauseRequested && !job.cancelRequested) {
    if (job.status !== 'paused') jobs.setStatus(job, 'paused');
    await new Promise((r) => setTimeout(r, 500));
  }
  if (job.cancelRequested) throw { cancelled: true };
  if (job.status === 'paused') jobs.setStatus(job, 'running');
}

/** Fetch all pages of a Spotify paginated endpoint. */
async function fetchAllPages(session, job, url, params = {}) {
  const items = [];
  let nextUrl = url;
  let nextParams = { ...params, limit: PAGE_LIMIT };
  while (nextUrl) {
    await honorPause(job);
    const res = await spotify.get(session, nextUrl, nextParams);
    const body = res.data;
    items.push(...(body.items || []));
    nextUrl = body.next || null;
    nextParams = {}; // `next` already includes query params
  }
  return items;
}

function spotifyErrorInfo(err) {
  const status = err && err.response ? err.response.status : null;
  const message =
    err && err.response && err.response.data && err.response.data.error
      ? err.response.data.error.message || 'spotify_error'
      : err && err.message
        ? err.message
        : 'unknown_error';
  return { status, message };
}

function failJob(job, err) {
  if (err && err.cancelled) {
    jobs.setStatus(job, 'done');
    // Scan jobs use an object-shaped result; substitute jobs use an array.
    if (Array.isArray(job.results)) job.results.push({ cancelled: true });
    else if (job.results && typeof job.results === 'object') job.results.cancelled = true;
  } else {
    const info = spotifyErrorInfo(err);
    job.errors.push({ fatal: info.message, status: info.status });
    jobs.setStatus(job, 'failed');
  }
}

/* ── scan worker ─────────────────────────────────────────────────── */

async function runScan(job, session) {
  jobs.setStatus(job, 'running');
  // Object shape (not a flat array): this is the contract the frontend
  // Dashboard expects: { tracks[], playlistsSkipped[], playlistsScanned, totalLegacyFound }.
  job.results = { tracks: [], playlistsSkipped: [], playlistsScanned: 0, totalLegacyFound: 0 };
  try {
    // 1. Saved tracks ("Your Library").
    const savedItems = await fetchAllPages(
      session,
      job,
      '/v1/me/tracks',
      { limit: PAGE_LIMIT }
    );
    job.progress.total += savedItems.length;
    scanTrackList(job, savedItems, 'saved-tracks', 'Saved Tracks');

    // 2. Playlists owned by the user (incl. collaborative ones they own).
    const playlists = await fetchAllPages(
      session,
      job,
      '/v1/me/playlists',
      { limit: PAGE_LIMIT }
    );

    for (const pl of playlists) {
      await honorPause(job);
      try {
        const tracks = await fetchAllPages(
          session,
          job,
          `/v1/playlists/${pl.id}/tracks`,
          { limit: PAGE_LIMIT }
        );
        job.progress.total += tracks.length;
        scanTrackList(job, tracks, pl.id, pl.name || 'Untitled playlist');
        job.results.playlistsScanned += 1;
      } catch (err) {
        const info = spotifyErrorInfo(err);
        if (info.status === 403 || info.status === 404) {
          // Private/collaborative playlist we can't read: note and continue.
          job.results.playlistsSkipped.push({
            id: pl.id,
            name: pl.name || 'Untitled playlist',
            reason:
              info.status === 403 ? 'no-read-permission' : 'playlist-not-found',
          });
        } else {
          throw err;
        }
      }
    }

    jobs.setStatus(job, 'done');
  } catch (err) {
    failJob(job, err);
  }
}

/** Scan a list of playlist-track items; `items` may be track wrappers. */
function scanTrackList(job, items, playlistId, playlistName) {
  items.forEach((item, index) => {
    const track = item.track || item; // playlist items wrap; saved items wrap too
    if (!track || !track.uri) {
      job.progress.done += 1;
      return;
    }
    if (mappingStore.isAlreadyTaylorsVersion(track)) {
      job.progress.done += 1;
      return;
    }
    const match = mappingStore.findLegacyMatch(track);
    if (match) {
      job.results.tracks.push({
        playlistId,
        playlistName,
        position: index,
        legacyTrack: trackSummary(track),
        tvCandidate: null, // resolved at substitution time via live search
        era: mappingStore.getEra(match),
        tvTitle: match.tvTitle || null,
      });
      job.results.totalLegacyFound += 1;
    }
    job.progress.done += 1;
    jobs.touch(job);
  });
}

/* ── substitute worker ───────────────────────────────────────────── */

function trackIdFromUri(uri) {
  const m = /^spotify:track:([A-Za-z0-9]+)$/.exec(String(uri || ''));
  return m ? m[1] : null;
}

async function resolveTvUri(session, item) {
  // Try the precise query first; if Spotify returns nothing (e.g. feature-
  // credit differences like "Breathe" vs "Breathe (feat. Colbie Caillat)"),
  // fall back to the bare legacy title and prefer Taylor's Version hits.
  const queries = [item.tvSearchQuery];
  const loose = String(item.tvSearchQuery || '').replace(/ \(Taylor's Version\)/i, '');
  if (loose && loose !== item.tvSearchQuery) queries.push(loose);

  for (const q of queries) {
    const searchRes = await spotify.get(session, '/v1/search', {
      q,
      type: 'track',
      limit: 5,
    });
    const candidates = ((searchRes.data.tracks || {}).items || []).filter(Boolean);
    if (candidates.length === 0) continue;

    const uri = await preferTvCandidate(session, item, candidates);
    if (uri) return uri;
  }
  return null;
}

async function preferTvCandidate(session, item, candidates) {
  // Prefer a candidate whose ISRC matches the mapping's Taylor's Version ISRC.
  const legacyId = trackIdFromUri(item.legacyUri);
  let tvIsrcs = [];
  if (legacyId) {
    try {
      const tRes = await spotify.get(session, `/v1/tracks/${legacyId}`);
      const entry = mappingStore.findLegacyMatch(tRes.data);
      if (entry) tvIsrcs = entry.tvIsrcs || [];
    } catch {
      // non-fatal: fall through to name-based preference
    }
  }
  if (tvIsrcs.length > 0) {
    const isrcHit = candidates.find((c) => {
      const isrc =
        c.external_ids && c.external_ids.isrc
          ? String(c.external_ids.isrc).toUpperCase()
          : null;
      return isrc && tvIsrcs.includes(isrc);
    });
    if (isrcHit) return isrcHit.uri;
  }

  const named = candidates.find((c) =>
    String(c.name || '').toLowerCase().includes("taylor's version")
  );
  // Never fall back to a non-Taylor's-Version candidate: substituting the
  // legacy track with itself (or a wrong version) would be worse than skipping.
  return named ? named.uri : null;
}

async function runSubstitute(job, session) {
  const items = (job._payload && job._payload.items) || [];
  jobs.setStatus(job, 'running');
  job.progress.total = items.length;

  for (const item of items) {
    try {
      await honorPause(job);

      if (!item || !item.playlistId || !item.legacyUri) {
        job.results.push({ skipped: true, reason: 'invalid-item' });
        job.progress.done += 1;
        continue;
      }

      if (item.playlistId === 'saved-tracks') {
        // The Spotify API cannot remove/reorder Liked Songs positions.
        job.results.push({ skipped: true, reason: 'saved-library-not-reorderable' });
        job.progress.done += 1;
        continue;
      }

      const tvUri = await resolveTvUri(session, item);
      if (!tvUri) {
        job.results.push({
          skipped: true,
          reason: 'tv-version-not-found',
          legacyUri: item.legacyUri,
        });
        job.progress.done += 1;
        continue;
      }

      // Remove the legacy track at its exact position, then insert the
      // Taylor's Version at the same position.
      await spotify.delete(session, `/v1/playlists/${item.playlistId}/tracks`, {
        tracks: [{ uri: item.legacyUri, positions: [item.position] }],
      });
      await spotify.post(session, `/v1/playlists/${item.playlistId}/tracks`, {
        uris: [tvUri],
        position: item.position,
      });

      job.results.push({
        ok: true,
        playlistId: item.playlistId,
        position: item.position,
        legacyUri: item.legacyUri,
        tvUri,
      });
    } catch (err) {
      if (err && err.cancelled) {
        job.results.push({ cancelled: true });
        break;
      }
      const info = spotifyErrorInfo(err);
      if (info.status === 403) {
        // e.g. collaborative playlist without modify permission
        job.results.push({
          skipped: true,
          reason: 'no-modify-permission',
          playlistId: item && item.playlistId,
          legacyUri: item && item.legacyUri,
        });
      } else {
        job.results.push({
          error: info.message,
          status: info.status,
          playlistId: item && item.playlistId,
          legacyUri: item && item.legacyUri,
        });
      }
    }
    job.progress.done += 1;
    jobs.touch(job);
  }

  jobs.setStatus(job, 'done');
}

/* ── routes ──────────────────────────────────────────────────────── */

router.get('/me', async (req, res, next) => {
  try {
    const me = await spotify.get(req.session, '/v1/me');
    res.json({
      id: me.data.id,
      displayName: me.data.display_name || me.data.id,
      email: me.data.email || undefined,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/scan', (req, res) => {
  const job = jobs.createJob('scan', { session: req.session });
  // Run async; errors are captured into the job itself.
  runScan(job, req.session).catch((err) => failJob(job, err));
  res.status(202).json({ jobId: job.id });
});

router.post('/substitute', (req, res) => {
  const items = req.body && Array.isArray(req.body.items) ? req.body.items : null;
  if (!items || items.length === 0) {
    return res
      .status(400)
      .json({ error: 'body.items must be a non-empty array' });
  }
  if (items.length > 500) {
    return res
      .status(400)
      .json({ error: 'too many items; max 500 per substitute job' });
  }
  const job = jobs.createJob('substitute', { items, session: req.session });
  runSubstitute(job, req.session).catch((err) => failJob(job, err));
  res.status(202).json({ jobId: job.id });
});

router.get('/jobs/:jobId', (req, res) => {
  const job = jobs.getJob(req.params.jobId);
  if (!job) return res.status(404).json({ error: 'job_not_found' });
  res.json(jobs.toPublic(job));
});

router.post('/jobs/:jobId/pause', (req, res) => {
  if (!jobs.pauseJob(req.params.jobId)) {
    return res.status(404).json({ error: 'job_not_found' });
  }
  res.json({ ok: true });
});

router.post('/jobs/:jobId/resume', (req, res) => {
  if (!jobs.resumeJob(req.params.jobId)) {
    return res.status(404).json({ error: 'job_not_found' });
  }
  res.json({ ok: true });
});

router.post('/jobs/:jobId/cancel', (req, res) => {
  if (!jobs.cancelJob(req.params.jobId)) {
    return res.status(404).json({ error: 'job_not_found' });
  }
  res.json({ ok: true });
});

router.get('/mapping', (req, res) => {
  res.json({ meta: mappingStore.getMeta(), albums: mappingStore.getAlbums() });
});

module.exports = router;
