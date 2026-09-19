# Soft-Launch Checklist — Project SwiftSwap

Everything an owner needs to take SwiftSwap from this repo to a public soft launch. Items marked **[OWNER]** require the repo owner's accounts and cannot be done by automation.

## 1. Spotify Developer registration [OWNER]

- [ ] Log in at <https://developer.spotify.com/dashboard> with the Spotify account that will own the app.
- [ ] Create app → name "SwiftSwap" (or similar), description, agree to Developer Terms.
- [ ] In app settings → Redirect URIs, add:
  - `http://localhost:4000/auth/callback` (local dev)
  - `https://<your-backend-domain>/auth/callback` (production)
- [ ] Copy the **Client ID** and **Client secret** into the backend environment:
  - `SPOTIFY_CLIENT_ID=...`
  - `SPOTIFY_CLIENT_SECRET=...`
  - `REDIRECT_URI=https://<your-backend-domain>/auth/callback`
  - `FRONTEND_URL=https://<your-frontend-domain>`
  - `SESSION_SECRET=<32+ random bytes>`
- [ ] Note: new Spotify apps start in **Development Mode** (25 test users max). Add tester Spotify accounts under "User Management" for the beta. Request a **quota extension** from Spotify before a full public launch.

## 2. Pre-launch code & config review

- [ ] Replace `legal-contact@example.invalid` in `TERMS.md`, `PRIVACY.md`, `SECURITY.md` with a real monitored address.
- [ ] Set `NODE_ENV=production` on the backend; confirm the session cookie is `Secure`.
- [ ] Run `npm audit` in `backend/` and `frontend/`; resolve high/critical findings.
- [ ] Confirm no secrets in git history (`git log -p | grep -i secret`, check `.env` never committed).
- [ ] Verify the mapping database version in `data/taylor-swift-mapping.json` is current (re-check "pending" albums for new Taylor's Version releases).

## 3. Hosting (suggested: Vercel frontend / Render or Railway backend)

- [ ] Deploy backend; set all env vars in the host dashboard (never in code).
- [ ] Deploy frontend with `VITE_API_URL` pointing at the backend.
- [ ] Smoke test in production: login → scan → substitute one track in a test playlist → verify position preserved.

## 4. Beta (Phase 3 validation)

- [ ] Invite 5–10 testers with large/complex libraries; add them as Spotify test users.
- [ ] Exercise: huge playlists (1,000+ tracks), collaborative playlists without modify permission, rate-limit behavior (watch for graceful pause/resume).
- [ ] Collect feedback on era theming and vault suggestions.

## 5. Compliance final pass

- [ ] Re-read Spotify Developer Terms & Developer Policy for the current quarter; confirm no new data-retention or commercialization restrictions affect the App.
- [ ] Confirm `TERMS.md` / `PRIVACY.md` links are reachable from the running app's About page.
- [ ] Decide the open-source license for this repo and add a `LICENSE` file (currently: no license = all rights reserved).

## 6. Public launch

- [ ] Tag a release (e.g. `v1.0.0`) in GitHub.
- [ ] Announce in fan-community channels (respect each community's self-promotion rules; no spam).
- [ ] Monitor error logs and Spotify API quota for the first 72 hours.
