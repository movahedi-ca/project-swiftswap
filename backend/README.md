# SwiftSwap Backend

Node.js + Express API for **Project SwiftSwap** — scans a user's Spotify library
(saved tracks, owned playlists, collaborative playlists) for original pre-2019
Taylor Swift master recordings ("Big Machine" releases) and one-click replaces
them with "Taylor's Version" re-recordings at the same playlist position.

## Setup

```bash
cd backend
npm install
cp .env.example .env
# fill in the values in .env (see below), then:
npm run dev    # watch mode
# or
npm start      # production-ish
```

### Spotify app registration (OWNER-ONLY step)

Register an app at <https://developer.spotify.com/dashboard> and add a
**Redirect URI** that exactly matches `REDIRECT_URI` (e.g.
`http://localhost:4000/auth/callback` for local dev). Then set:

| Variable              | Purpose                                              |
|-----------------------|------------------------------------------------------|
| `SPOTIFY_CLIENT_ID`   | From the Spotify app dashboard                       |
| `SPOTIFY_CLIENT_SECRET` | From the Spotify app dashboard (never expose this) |
| `REDIRECT_URI`        | OAuth callback URL (must match dashboard entry)      |
| `FRONTEND_URL`        | Where the React app lives (CORS origin + post-login redirect) |
| `PORT`                | API listen port (default `4000`)                     |
| `SESSION_SECRET`      | Random 64-hex string for cookies/state               |
| `NODE_ENV`            | `development` or `production`                        |

Generate a secret with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Endpoints

Auth (mounted at `/auth`):

| Method | Path            | Description                                              |
|--------|-----------------|----------------------------------------------------------|
| GET    | /auth/login     | Redirect to Spotify authorization page                   |
| GET    | /auth/callback  | OAuth callback: creates session, sets `sws_session` cookie, redirects to frontend `/dashboard` |
| GET    | /auth/status    | `{ authenticated, displayName }`                         |
| POST   | /auth/logout    | Destroy session, clear cookie                            |

API (mounted at `/api`, all require the session cookie):

| Method | Path                      | Description                                        |
|--------|---------------------------|----------------------------------------------------|
| GET    | /api/me                   | Spotify profile: `{ id, displayName, email? }` — no tokens |
| GET    | /api/scan                 | Start scan job → `202 { jobId }`                   |
| GET    | /api/jobs/:jobId          | Job status/progress/results                        |
| POST   | /api/jobs/:jobId/pause    | Request pause                                      |
| POST   | /api/jobs/:jobId/resume   | Request resume                                     |
| POST   | /api/jobs/:jobId/cancel   | Request cancel                                     |
| POST   | /api/substitute           | Start substitute job with `{ items: [...] }` → `202 { jobId }` |
| GET    | /api/mapping              | `{ meta, albums[] }` — mapping version/coverage + per-era albums, vault tracks |

Health: `GET /healthz` → `{ ok: true, env }`.

### Scan job

Fetches saved tracks (50/page) and every playlist's tracks. Each track is
classified:

- already a Taylor's Version → skipped,
- matches a legacy entry in `../../data/taylor-swift-mapping.json` → recorded in
  `results.tracks` as `{ playlistId, playlistName, position, legacyTrack, tvTitle, era }`,
- otherwise → ignored.

Final results shape: `{ tracks[], playlistsSkipped[{id,name,reason}], playlistsScanned, totalLegacyFound }`.

A playlist that returns 403/404 is recorded in `results.playlistsSkipped`
and the scan continues. Pause/cancel are honored between pages.

### Substitute job

Body: `{ items: [{ playlistId, legacyUri, position, tvSearchQuery }] }` (max 500).

For each item the worker:

1. Searches Spotify for the Taylor's Version candidate (prefers a result whose
   ISRC matches the mapping's TV ISRC; else the first result whose name includes
   "Taylor's Version").
2. `DELETE /v1/playlists/{id}/tracks` removing the legacy URI at `position`.
3. `POST /v1/playlists/{id}/tracks` inserting the TV URI at `position`.

Outcomes per item: `{ ok: true }`, `{ skipped: true, reason }`, or `{ error }`.
A 403 (e.g. collaborative playlist without permission) becomes
`skipped: no-modify-permission`. `saved-tracks` items are skipped
(`saved-library-not-reorderable`) — Spotify has no API to remove/reorder Liked Songs.

## Architecture notes

- `src/config.js` — loads env, refuses to boot if required vars are missing.
- `src/sessionStore.js` — in-memory `Map` of session id → tokens/identity,
  24h TTL with lazy expiry. Tokens live server-side only.
- `src/spotifyClient.js` — axios wrapper: honors `Retry-After` on 429,
  exponential backoff (base 1s, max 32s, ≤5 attempts) on 429/5xx/network
  errors, and refreshes the access token once on 401 before a single retry.
- `src/mappingStore.js` — lazily loads `../../data/taylor-swift-mapping.json`
  (repo `data/` dir). Missing file → matcher degrades to "no matches".
  Matching: `external_ids.isrc` first, normalized `(title, album)` fallback.
- `src/jobs.js` — in-memory job registry (`queued|running|paused|done|failed`),
  pause/resume/cancel flags, 2h expiry.
- `src/routes/auth.js` — OAuth login/callback/status/logout; short-lived
  CSRF `state`; httpOnly `sws_session` cookie (`secure` in production,
  `sameSite=lax`).
- `src/routes/api.js` — API + the async scan/substitute workers.
- `src/index.js` — app wiring: CORS (frontend origin, credentials), global
  JSON error handler, minimal non-sensitive request logging.

## Security posture

- Tokens/secrets are **never** logged and **never** returned to the client.
- Sessions are server-side only; the browser holds an opaque session id.
- Nothing is persisted to disk; no database. Restarts drop all sessions/jobs.
- `.env` is git-ignored (see `.gitignore`); only `.env.example` is committed.
