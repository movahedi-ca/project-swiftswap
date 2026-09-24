# Project SwiftSwap

**Project SwiftSwap** (internal working title: *The Taylorizer*) is a Spotify playlist management web app that finds original pre-2019 Taylor Swift master recordings ("Big Machine" era) in your library and one-click replaces them with the corresponding **"Taylor's Version"** re-recordings — preserving your playlist order, suggesting "From The Vault" tracks, and re-skinning the UI in the colors of each "Era".

📄 **[Product Requirements Document](PRD.md)** · [Terms](TERMS.md) · [Privacy](PRIVACY.md) · [Security](SECURITY.md) · [Launch checklist](docs/launch-checklist.md) · [Architecture](docs/architecture.md)

> Independent community project. Not affiliated with or endorsed by Spotify AB or Taylor Swift / TAS Rights Management. Uses the official Spotify Web API only.

Built by [Mohammad Movahedi](https://movahedi.ca) — Data Privacy & AI Governance Consultant, Toronto.

## Repository layout

```
├── PRD.md                  # product requirements (the spec)
├── TERMS.md / PRIVACY.md / SECURITY.md
├── data/
│   └── taylor-swift-mapping.json   # legacy → Taylor's Version track database
├── backend/                # Node.js / Express API (OAuth, scan, substitution jobs)
├── frontend/               # React + Vite + Tailwind CSS (dashboard, era theming)
└── docs/
    ├── architecture.md
    └── launch-checklist.md
```

## Mapping database (`data/taylor-swift-mapping.json`)

The heart of the app: **74 legacy→Taylor's Version track mappings**, built from MusicBrainz recording data (verbatim ISRCs, never invented) cross-checked against the official album track listings. Research notes: `research/` scripts are kept out of this repo; methodology is documented in the file's `meta` block.

| Era | Taylor's Version | Status | Tracks mapped | Vault tracks |
|---|---|---|---|---|
| Fearless (2008) | Fearless (Taylor's Version) — 2021-04-09 | ✅ released | 20 | 6 |
| Speak Now (2010) | Speak Now (Taylor's Version) — 2023-07-07 | ✅ released | 17 | 6 |
| Red (2012) | Red (Taylor's Version) — 2021-11-12 | ✅ released | 21 | 9 |
| 1989 (2014) | 1989 (Taylor's Version) — 2023-10-27 | ✅ released | 16 | 5 |
| Taylor Swift (2006) | *Taylor's Version* | ⏳ pending — no release announced as of 2026-09-19 | 0 (11 legacy tracks listed) | — |
| Reputation (2017) | *Taylor's Version* | ⏳ pending — no release announced as of 2026-09-19 | 0 (15 legacy tracks listed) | — |

Matching is ISRC-first with a normalized title+album fallback. Entries without a verified legacy ISRC carry an explicit note. Pending albums are kept in a separate `pending` section so scans only surface genuinely swappable tracks.

## Quick start (local development)

### 1. Register a Spotify app — OWNER-ONLY STEP

The app cannot talk to Spotify without its own app credentials, and Spotify requires the app to be registered under the owner's Spotify account. This cannot be automated:

1. Go to <https://developer.spotify.com/dashboard> and log in.
2. **Create app** → name it (e.g. "SwiftSwap"), add a description, accept the Developer Terms.
3. Open **Settings** → **Redirect URIs** and add:
   - `http://localhost:4000/auth/callback` (local dev)
   - `https://<your-backend-domain>/auth/callback` (production)
4. Copy the **Client ID** and **Client secret** — you'll need them below.
5. New apps start in **Development Mode** (up to 25 test users). Add beta testers under **User Management**; request a quota extension from Spotify before a full public launch.

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env   # then fill in:
```

```ini
SPOTIFY_CLIENT_ID=...
SPOTIFY_CLIENT_SECRET=...
REDIRECT_URI=http://localhost:4000/auth/callback
FRONTEND_URL=http://localhost:5173
SESSION_SECRET=<32+ random characters>
PORT=4000
```

```bash
npm run dev   # or: npm start
```

### 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env   # VITE_API_URL=http://localhost:4000
npm run dev
```

Open <http://localhost:5173> → **Connect with Spotify** → **Scan my library** → review → **Substitute selected**.

## How it works

1. **Login** — Spotify OAuth 2.0 authorization-code flow. Tokens live in server-side session memory only (never disk, never the browser).
2. **Scan** (`GET /api/scan`) — background job pages through your saved tracks and playlists, matching each track against the mapping database (ISRC first, then title+album). Already-"Taylor's Version" tracks are skipped. Playlists you can't read are recorded as skipped, never fatal. Jobs support pause/resume.
3. **Substitute** (`POST /api/substitute`) — for each selected track the backend resolves the exact TV track (live Spotify search, preferring ISRC matches), then `DELETE`s the legacy track at its position and `POST`s the TV track at the same position. 429s honor `Retry-After` with exponential backoff; 403s (e.g. collaborative playlists you can't edit) are skipped with a reason.
4. **Vault prompts** — after swaps complete, the UI suggests "From The Vault" tracks from the same re-recorded albums.
5. **Era theming** — the UI re-skins around the predominant era in your results (gold Fearless, crimson Red, purple Speak Now, light-blue 1989, monochrome Reputation, teal debut).

## API overview

| Method & path | Description |
|---|---|
| `GET /auth/login` | Start Spotify OAuth |
| `GET /auth/callback` | OAuth callback (server-side) |
| `GET /auth/status` · `POST /auth/logout` | Session state / logout |
| `GET /healthz` | Health check |
| `GET /api/me` | Logged-in Spotify profile |
| `GET /api/scan` | Start a library scan → `{ jobId }` |
| `GET /api/jobs/:id` | Job status, progress, results |
| `POST /api/jobs/:id/pause` · `/resume` · `/cancel` | Job control |
| `POST /api/substitute` | Start a substitution job → `{ jobId }` |
| `GET /api/mapping` | Mapping meta + per-era albums/vault tracks |

## Known limitations

- **Liked Songs can't be reordered via the Spotify API** — saved-library hits are reported but skipped at substitution time (reason: `saved-library-not-reorderable`).
- **Pending re-recordings** — the debut and *Reputation* have no Taylor's Version as of 2026-09-19; their legacy tracks are listed under `pending` and excluded from scans.
- Matching depends on Spotify metadata quality; unverified legacy ISRCs fall back to title matching.

## Compliance

- Uses only the official Spotify Web API under the Spotify Developer Terms.
- Session-only token storage; no user-data retention beyond the session; no commercialization of user data. See [PRIVACY.md](PRIVACY.md) and [TERMS.md](TERMS.md).
- Report security issues per [SECURITY.md](SECURITY.md) — not via public issues.

## License

TBD — the owner will add a `LICENSE` file before public launch (see [docs/launch-checklist.md](docs/launch-checklist.md)).
