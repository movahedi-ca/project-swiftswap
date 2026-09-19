# Privacy Policy — Project SwiftSwap

**Effective date:** September 19, 2026
**Operator contact:** `legal-contact@example.invalid` (placeholder — owner to replace before public launch)

Project SwiftSwap ("the App") is designed to minimize data collection. This policy explains what we access, what we store, and what we never do.

## 1. Data we access (via the official Spotify Web API, with your permission)

When you connect your Spotify account, the App may read:
- your Spotify profile (display name, account ID) — to show you are logged in;
- your saved tracks and the playlists you can see (names, track listings, ISRC metadata) — solely to find legacy Taylor Swift recordings and perform the substitutions you request.

The App requests only these Spotify scopes: `user-library-read`, `playlist-read-private`, `playlist-read-collaborative`, `playlist-modify-public`, `playlist-modify-private`. It never requests your password, email marketing consent, or listening history beyond what is needed for the scan.

## 2. What we store — and for how long

- **OAuth tokens:** held in server-side session memory only, never written to disk or to a database. Sessions expire automatically after 24 hours of inactivity.
- **Scan/substitution job state:** kept in server memory for the duration of your session (jobs expire after ~2 hours) so the UI can show progress. Not persisted.
- **No analytics, no tracking cookies, no advertising identifiers.** The only cookie set is the `sws_session` session cookie (httpOnly, required for login to work).

## 3. What we do NOT do

- We do not sell, rent, or share your personal data with anyone.
- We do not retain copies of your playlists, tracks, or listening data after your session ends.
- We do not use your data for advertising, profiling, or any purpose other than operating the App at your request.
- We do not transfer your data outside the App's hosting environment except to Spotify's API as required to perform your requested actions.

## 4. Your choices

- **Revoke access anytime:** log out in the App, or remove it at Spotify → Account → Manage Apps. Revoking immediately invalidates the App's access.
- **Deletion:** because nothing is persisted beyond your session, ending your session effectively deletes your data from the App. If you believe residual data exists, contact the operator address above.

## 5. Security

Sessions are server-side; tokens are never exposed to the browser. See `SECURITY.md` for the vulnerability reporting process. No method of transmission or storage is 100% secure, and we cannot guarantee absolute security.

## 6. Children

The App is not directed at children under 13 (or the minimum age in your jurisdiction). We do not knowingly collect children's data.

## 7. Changes

Material changes will be posted here with a new effective date. Continued use after changes constitutes acceptance.
