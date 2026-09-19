# SwiftSwap — Frontend

React 18 + Vite + Tailwind CSS v3 frontend for **Project SwiftSwap**, the app that
scans your Spotify playlists for original pre-2019 Taylor Swift master recordings
and one-click replaces them with *Taylor's Version* re-recordings.

## Setup

Requires Node.js 18+.

```bash
cd frontend
npm install
cp .env.example .env   # then edit VITE_API_URL if your backend isn't on localhost:4000
npm run dev            # http://localhost:5173
```

Build for production:

```bash
npm run build   # outputs to dist/
npm run preview # serve the production build locally
```

## Environment variables

| Variable       | Default                 | Description                    |
| -------------- | ----------------------- | ------------------------------ |
| `VITE_API_URL` | `http://localhost:4000` | Base URL of the SwiftSwap backend |

Auth uses cookies, so every API call is made with `credentials: 'include'`.

## Routes

| Route        | Page      | What it does                                                     |
| ------------ | --------- | ---------------------------------------------------------------- |
| `/`          | Landing   | Hero, how-it-works, "Connect with Spotify" → `$VITE_API_URL/auth/login` |
| `/dashboard` | Dashboard | "Scan my library"; polls the scan job every 2s; pause/resume; grouped results |
| `/results`   | Results   | Checkbox selection; "Substitute selected"; live per-item outcomes; vault suggestions |
| `/about`     | About     | What it does, the six eras, compliance note                      |

Scan results are cached in `sessionStorage` (`swiftswap-scan-results`) so the
Results page survives a refresh.

## How era theming works

The whole app is skinned through CSS custom properties defined in
`src/index.css` (`--era-primary`, `--era-accent`, `--era-background`,
`--era-surface`, `--era-text`, `--era-muted`, `--era-gradient`) and consumed
via the `.era-*` component classes (buttons, cards, badges, hero, inputs).

`src/theme.js` holds `ERA_THEMES` — a palette per album era:

| Era        | Look              |
| ---------- | ----------------- |
| Debut      | teal              |
| Fearless   | gold              |
| Speak Now  | purple            |
| Red        | crimson red       |
| 1989       | light blue        |
| Reputation | monochrome black  |

`applyEraTheme(era)` writes the palette to `document.documentElement`, so the
entire UI re-skins with a smooth transition. `getPredominantEra(tracks)` picks
the era that appears most among scanned tracks — Dashboard applies it after a
scan completes, and Results applies it on mount. The Landing page lets visitors
preview every era.

## Backend contract (summary)

All calls are `credentials: 'include'`:

- `GET /auth/login` — redirect to Spotify OAuth
- `GET /auth/status` → `{ authenticated, displayName }`
- `POST /auth/logout`
- `GET /api/me`
- `GET /api/scan` → `{ jobId }`; `GET /api/jobs/:jobId` → `{ id, type, status, progress: { done, total }, results, errors }`
- `POST /api/jobs/:jobId/pause` / `POST /api/jobs/:jobId/resume`
- `POST /api/substitute` with `{ items: [{ playlistId, legacyUri, position, tvSearchQuery }] }` →
  `{ jobId }`; the job's `results` carry per-item `{ ok, skipped, reason, error }`
- `GET /api/mapping` → `{ meta, albums: [{ era, legacyAlbum, taylorsVersion: { status, title }, counts, vaultTracks }] }`

The substitution search query is built as
``track:"<legacy title> (Taylor's Version)" artist:"Taylor Swift"``.

## Notes

- No copyrighted lyrics anywhere; no real Taylor Swift imagery — the design is
  gradients + typography.
- Uses only the official Spotify Web API; tokens are session-only (see About page).
