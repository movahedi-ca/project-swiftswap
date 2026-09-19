# Security Policy — Project SwiftSwap

## Supported versions

| Version | Supported |
|---|---|
| `main` (latest) | ✅ |
| Older commits / forks | ❌ (best effort) |

## Reporting a vulnerability

**Do not open a public GitHub issue for security reports.**

Email: `legal-contact@example.invalid` (placeholder — owner to replace with a real monitored address before public launch).

Please include:
1. A description of the vulnerability and its potential impact.
2. Steps to reproduce (or a minimal proof of concept).
3. The commit SHA and environment you tested against.

We will acknowledge receipt within 5 business days and aim to ship a fix or mitigation within 30 days for confirmed issues. We ask that you give us reasonable time to remediate before public disclosure (coordinated disclosure).

## Security design of the App

- **OAuth 2.0 authorization-code flow** via Spotify's official endpoints; the App never sees or stores your Spotify password.
- **Tokens are session-only:** access/refresh tokens live in server-side memory, never written to disk, never sent to the browser, never logged.
- **Session cookie** (`sws_session`) is `httpOnly`, `SameSite=Lax`, and `Secure` in production.
- **Least privilege:** the App requests the minimum Spotify scopes needed (read library/playlists; modify only to perform your requested substitutions).
- **No secrets in the repo:** `.env` files are git-ignored; configuration is via environment variables (`SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `SESSION_SECRET`, `REDIRECT_URI`).
- **Rate-limit aware:** the Spotify client honors `Retry-After` and backs off exponentially, reducing the risk of abusive traffic patterns.

## Out of scope

- Vulnerabilities in Spotify's own platform (report to Spotify).
- Social-engineering or physical attacks.
- Issues in outdated forks.

## Dependency hygiene (owner checklist)

- [ ] Run `npm audit` on `backend/` and `frontend/` before each release; fix high/critical issues.
- [ ] Pin dependency versions; review major upgrades.
- [ ] Rotate `SESSION_SECRET` and Spotify client secret if either is ever exposed.
- [ ] Serve the frontend over HTTPS in production; set `NODE_ENV=production`.
