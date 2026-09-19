# Architecture — Project SwiftSwap

## Overview

```
┌─────────────┐      HTTPS + cookie       ┌──────────────┐      Spotify Web API
│  frontend/  │  ─────────────────────▶  │   backend/   │  ──────────────────▶
│ React+Vite  │  ◀─────────────────────  │ Express API  │  ◀──────────────────
└─────────────┘   JSON (credentials:      └──────────────┘   accounts.spotify.com
                   include)                │  ▲               api.spotify.com
                                           │  │
                                     data/taylor-swift-mapping.json
                                     (loaded at runtime, cached)
```

The backend is the only component that talks to Spotify. The frontend never sees tokens. All persistent-ish state (sessions, jobs) lives in server memory with TTLs — nothing is written to disk.

## Backend (`backend/src/`)

| File | Responsibility |
|---|---|
| `index.js` | App wiring: CORS (with credentials), cookies, JSON body, `/healthz`, global JSON error handler |
| `config.js` | Env loading + boot-time validation (refuses to start with missing vars) |
| `routes/auth.js` | OAuth 2.0 authorization-code flow: `/auth/login` (CSRF `state`), `/auth/callback` (code→token exchange, session creation, httpOnly `sws_session` cookie), `/auth/status`, `/auth/logout` |
| `sessionStore.js` | In-memory sessions, 24h lazy TTL; `refreshIfNeeded` rotates the access token via the refresh token |
| `spotifyClient.js` | Rate-limit-aware Spotify caller: honors `Retry-After` on 429, jittered exponential backoff (≤5 attempts) on 429/5xx/network errors, one token-refresh retry on 401; never logs tokens |
| `mappingStore.js` | Loads `data/taylor-swift-mapping.json` lazily; degrades to empty when missing. `findLegacyMatch` (ISRC → normalized title+album), `isAlreadyTaylorsVersion`, `getEra`, `getMeta`/`getAlbums` for the API |
| `jobs.js` | Job registry: `queued/running/paused/done/failed`, pause/resume/cancel flags, token-safe `toPublic()` view, 2h expiry |
| `routes/api.js` | `GET /api/me`, `GET /api/scan` (202 + `{jobId}`, async worker), `GET /api/jobs/:id`, `POST /api/jobs/:id/{pause,resume,cancel}`, `POST /api/substitute`, `GET /api/mapping` |

### Scan job

1. Page `/v1/me/tracks` (saved tracks) and `/v1/me/playlists`.
2. For each playlist: fetch metadata, then page `/v1/playlists/{id}/tracks`. 403/404 → recorded in `playlistsSkipped`, job continues.
3. Per track: skip if already a Taylor's Version; else `findLegacyMatch`. Hits accumulate in `results.tracks`; `totalLegacyFound` counts them.
4. `honorPause()` is checked between pages so pause/resume works mid-scan.

Result shape (the frontend contract):

```json
{ "tracks": [ { "playlistId", "playlistName", "position",
                "legacyTrack": { "uri", "title", "artists", "isrc" },
                "tvTitle", "era" } ],
  "playlistsSkipped": [ { "id", "name", "reason" } ],
  "playlistsScanned": 12, "totalLegacyFound": 34 }
```

### Substitute job

For each item `{playlistId, legacyUri, position, tvSearchQuery}`:

1. **Resolve** the TV track URI: Spotify search → prefer a candidate whose ISRC matches the mapping's TV ISRCs (looked up from the legacy track), else a candidate whose name contains "Taylor's Version". If the exact query finds nothing, one looser retry on the bare title. A non-TV candidate is never accepted.
2. **Swap**: `DELETE /v1/playlists/{id}/tracks` `{tracks:[{uri, positions:[position]}]}` then `POST /v1/playlists/{id}/tracks` `{uris:[tvUri], position}` — the TV track lands in the exact slot the legacy track occupied.
3. **Edge cases**: `saved-tracks` → skipped (`saved-library-not-reorderable`; the API can't reorder Liked Songs); 403 → skipped (`no-modify-permission`); 429 → handled by `spotifyClient`. Per-item outcomes are pushed in order, so `results[i]` corresponds to `items[i]`.

## Frontend (`frontend/src/`)

| Path | Responsibility |
|---|---|
| `main.jsx` / `App.jsx` | Entry, router (`/`, `/dashboard`, `/results`, `/about`), auth-gated routes, nav |
| `api.js` | Fetch wrapper (`credentials: 'include'`, JSON, parsed errors) |
| `context/SessionContext.jsx` | Auth state (`/auth/status`, logout) |
| `theme.js` | `ERA_THEMES` (6 eras), `applyEraTheme` (CSS custom properties), `getPredominantEra` |
| `index.css` | Tailwind v3 directives + era CSS variables + `.era-*` component classes |
| `components/` | `EraBadge`, `ProgressBar`, `TrackRow` (selection + per-item status), `VaultPrompt` (vault suggestions from `/api/mapping`), `JobProgress` (2s polling, pause/resume) |
| `pages/` | `Landing` (hero + era-theme preview + Spotify connect), `Dashboard` (scan → "We found N legacy tracks", grouped by playlist), `Results` (checkbox batch selection → substitute → per-item outcomes → vault prompts), `About` |

Scan results are cached in `sessionStorage` so Results survives a refresh.

## Data (`data/taylor-swift-mapping.json`)

```json
{ "meta": { "version", "generatedAt", "methodology", "coverage": {...} },
  "albums": [ { "era", "legacyAlbum", "legacyYear",
                "taylorsVersion": { "status": "released"|"pending", ... },
                "vaultTracks": [ { "title", "isrc", "explicit" } ],
                "counts": { "mapped", "vault", "pending" } } ],
  "tracks": [ { "legacyTitle", "legacyDisplayTitle", "legacyAlbum",
                "legacyIsrcs": [], "tvTitle", "tvAlbum", "tvIsrcs": [],
                "tvStatus": "released", "era", "explicit", "notes" } ],
  "pending": [ ...legacy tracklists awaiting a re-recording... ] }
```

Only released re-recordings appear in `tracks` (what the matcher consumes). Pending albums live under `pending` for documentation and future activation.

## Security properties

- OAuth tokens: server memory only, 24h TTL, never logged, never sent to the client.
- Session cookie: `httpOnly`, `SameSite=Lax`, `Secure` in production.
- Least-privilege Spotify scopes: `user-library-read`, `playlist-read-private`, `playlist-read-collaborative`, `playlist-modify-public`, `playlist-modify-private`.
- No secrets in the repo (`.env` git-ignored; config via environment).
- Rate-limit etiquette: `Retry-After` honored, exponential backoff, pause/resume for large batches.

## Verified by automated tests

Mocked end-to-end tests (no real Spotify credentials needed) cover the scan contract (ISRC match, title fallback, TV exclusion, 403-skip, results shape) and the substitute contract (ISRC-preferred resolution, loose-query fallback, position-preserving swap, 403-skip, ordered outcomes). See `/tmp/scan-test.js`, `/tmp/substitute-test.js` (local scratch, not committed).
