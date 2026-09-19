'use strict';

/**
 * mappingStore.js — Lazily loads the legacy→Taylor's Version track mapping
 * from ../../data/taylor-swift-mapping.json (repo root data dir).
 *
 * If the file is missing or malformed, the matcher degrades gracefully and
 * simply reports no matches (scans return zero hits instead of crashing).
 *
 * Expected mapping schema (tolerant of snake_case variants):
 * {
 *   "meta": { "version": "1.0.0", ... },
 *   "tracks": [
 *     {
 *       "legacyTitle": "Love Story",
 *       "legacyAlbum": "Fearless",
 *       "legacyIsrcs": ["USCJY0800012"],
 *       "tvTitle": "Love Story (Taylor's Version)",
 *       "tvAlbum": "Fearless (Taylor's Version)",
 *       "tvIsrcs": ["USUG12100358"],
 *       "era": "Fearless"
 *     }, ...
 *   ]
 * }
 */

const fs = require('fs');
const path = require('path');

const RESOLVED_PATH = path.resolve(__dirname, '..', '..', 'data', 'taylor-swift-mapping.json');
// backend lives at <repo>/backend, so from src/: '../..' = <repo>, then 'data'.

let cache = null; // null = not attempted yet; { loaded:false } = missing
let attempted = false;

function pick(obj, ...keys) {
  for (const k of keys) {
    if (obj && obj[k] !== undefined && obj[k] !== null) return obj[k];
  }
  return undefined;
}

function asArray(v) {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

function loadRaw() {
  if (attempted) return cache;
  attempted = true;
  try {
    const raw = fs.readFileSync(RESOLVED_PATH, 'utf8');
    cache = JSON.parse(raw);
  } catch (err) {
    if (err.code !== 'ENOENT') {
      // eslint-disable-next-line no-console
      console.warn(`[mappingStore] could not load mapping (${err.message}); running with empty mapping`);
    }
    cache = null;
  }
  return cache;
}

function normalize(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[“”‘’]/g, "'")
    .replace(/[^a-z0-9' ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Normalize an entry from the mapping file into a canonical shape. */
function normalizeEntry(entry) {
  return {
    legacyTitle: pick(entry, 'legacyTitle', 'legacy_title', 'title', 'legacy_name'),
    legacyAlbum: pick(entry, 'legacyAlbum', 'legacy_album', 'album'),
    legacyIsrcs: asArray(
      pick(entry, 'legacyIsrcs', 'legacy_isrcs', 'legacyIsrc', 'legacy_isrc', 'isrcs', 'isrc')
    ).map((s) => String(s).toUpperCase()),
    tvTitle: pick(entry, 'tvTitle', 'tv_title', 'taylorsVersionTitle'),
    tvIsrcs: asArray(
      pick(entry, 'tvIsrcs', 'tv_isrcs', 'tvIsrc', 'tv_isrc')
    ).map((s) => String(s).toUpperCase()),
    era: pick(entry, 'era', 'eraName') || null,
    _raw: entry,
  };
}

function getEntries() {
  const raw = loadRaw();
  if (!raw) return [];
  const tracks = raw.tracks || raw.entries || [];
  if (!Array.isArray(tracks)) return [];
  return tracks.map(normalizeEntry);
}

/**
 * Find the mapping entry for a Spotify track object if it is a legacy
 * (pre-Taylor's Version) master.
 * @param {object} spotifyTrack - Spotify track object
 * @returns {object|null} normalized mapping entry, or null
 */
function findLegacyMatch(spotifyTrack) {
  const entries = getEntries();
  if (!spotifyTrack || entries.length === 0) return null;

  const isrc =
    spotifyTrack.external_ids && spotifyTrack.external_ids.isrc
      ? String(spotifyTrack.external_ids.isrc).toUpperCase()
      : null;

  if (isrc) {
    const byIsrc = entries.find((e) => e.legacyIsrcs.includes(isrc));
    if (byIsrc) return byIsrc;
  }

  // Fallback: normalized (title, album) match.
  const title = normalize(spotifyTrack.name);
  const album = normalize(spotifyTrack.album && spotifyTrack.album.name);
  if (!title) return null;
  const byTitleAlbum = entries.find(
    (e) =>
      normalize(e.legacyTitle) === title &&
      (!e.legacyAlbum || normalize(e.legacyAlbum) === album)
  );
  return byTitleAlbum || null;
}

/**
 * Detect whether a Spotify track is already a Taylor's Version re-recording.
 * @param {object} spotifyTrack - Spotify track object
 * @returns {boolean}
 */
function isAlreadyTaylorsVersion(spotifyTrack) {
  if (!spotifyTrack) return false;
  const marker = "taylor's version";
  const name = String(spotifyTrack.name || '').toLowerCase();
  const album = String(
    (spotifyTrack.album && spotifyTrack.album.name) || ''
  ).toLowerCase();
  return name.includes(marker) || album.includes(marker);
}

/**
 * Get the era label for a mapping entry.
 * @param {object} legacyEntry - normalized mapping entry from findLegacyMatch
 * @returns {string|null}
 */
function getEra(legacyEntry) {
  if (!legacyEntry) return null;
  return legacyEntry.era || null;
}

/** Per-album info for clients (era theming, vault suggestions). */
function getAlbums() {
  const raw = loadRaw();
  if (!raw || !Array.isArray(raw.albums)) return [];
  return raw.albums.map((a) => ({
    era: a.era || null,
    legacyAlbum: a.legacyAlbum || null,
    legacyYear: a.legacyYear || null,
    taylorsVersion: a.taylorsVersion || { status: 'unknown' },
    vaultTracks: Array.isArray(a.vaultTracks) ? a.vaultTracks : [],
    counts: a.counts || null,
  }));
}

/** Mapping metadata + per-era counts (safe to expose to clients). */
function getMeta() {  const raw = loadRaw();
  const entries = getEntries();
  const eraCounts = {};
  for (const e of entries) {
    const era = e.era || 'Unknown';
    eraCounts[era] = (eraCounts[era] || 0) + 1;
  }
  return {
    loaded: !!raw,
    version: (raw && raw.meta && raw.meta.version) || null,
    generatedAt: (raw && raw.meta && (raw.meta.generatedAt || raw.meta.generated_at)) || null,
    totalTracks: entries.length,
    eraCounts,
  };
}

module.exports = {
  findLegacyMatch,
  isAlreadyTaylorsVersion,
  getEra,
  getMeta,
  getAlbums,
  getEntries,
  // exposed for tests/diagnostics only
  _mappingPath: RESOLVED_PATH,
};
