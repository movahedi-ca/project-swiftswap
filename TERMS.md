# Terms of Service — Project SwiftSwap

**Effective date:** September 19, 2026
**Project:** Project SwiftSwap (internal working title: "The Taylorizer")
**Operator contact:** See `SECURITY.md` for the reporting contact. (Owner to replace placeholder before public launch: `legal-contact@example.invalid`.)

> Project SwiftSwap is an independent, community-built tool. It is not affiliated with, endorsed by, or sponsored by Spotify AB or Taylor Swift / TAS Rights Management. "Spotify" is a trademark of Spotify AB. "Taylor Swift", "Taylor's Version", and album titles are used nominatively to identify recordings the user already has in their own library.

## 1. What the app does

Project SwiftSwap ("the App") is a web application that, at your direction, scans the Spotify playlists and saved tracks you authorize it to read, identifies recordings from Taylor Swift's pre-2019 catalog, and — only when you explicitly click substitute — replaces those tracks with the corresponding "Taylor's Version" re-recordings using the official Spotify Web API.

## 2. Eligibility and accounts

- You must hold your own Spotify account and authorize the App through Spotify's official OAuth 2.0 flow. We never ask for your Spotify password.
- You are responsible for activity performed under your authorization until you revoke access (via the App's logout or Spotify's "Manage Apps" page).

## 3. Acceptable use

You agree:
- to use the App only on playlists and libraries you own or are entitled to modify;
- not to use the App to infringe copyrights, circumvent access controls, or violate Spotify's Developer Terms of Service and Developer Policy;
- not to reverse-engineer, resell, or offer the App as a paid service (no unauthorized commercialization);
- not to abuse the service (e.g., automated mass scanning beyond normal personal use).

## 4. Playlists and substitutions — your responsibility

- Substitutions are performed on YOUR playlists at YOUR instruction. The App shows you exactly which tracks will be replaced before acting.
- Collaborative playlists: the App will only attempt changes where Spotify permits it. If you lack permission, the App skips that playlist and tells you — it will not attempt to bypass Spotify's permission model.
- Undo: Spotify does not offer a programmatic "undo". Review your selections before confirming. The App logs what it changed during your session so you can manually restore tracks if desired.

## 5. Data and privacy

- Authentication tokens are held in server-side session memory only and are never written to disk. See `PRIVACY.md`.
- The App does not sell, rent, or share your personal data. There is no advertising.

## 6. Third-party services

The App depends on the Spotify Web API. Spotify's own Terms of Use and Privacy Policy apply to your Spotify account. If Spotify changes or restricts its API, parts of the App may stop working without notice.

## 7. Intellectual property

- The App's code and documentation are the operator's work. Track metadata (titles, ISRCs, album names) is factual data used for identification.
- No Spotify or artist logos, artwork, or audio are distributed with the App.

## 8. Disclaimers

THE APP IS PROVIDED "AS IS" AND "AS AVAILABLE", WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. We do not guarantee that every legacy track will have a matching "Taylor's Version", that substitutions will always succeed, or that the App will be available uninterrupted.

## 9. Limitation of liability

TO THE MAXIMUM EXTENT PERMITTED BY LAW, THE OPERATOR SHALL NOT BE LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF PLAYLISTS, DATA, OR PROFITS, ARISING FROM USE OF THE APP. Total liability is limited to the amount you paid for the App (it is free: $0).

## 10. Termination

We may suspend or terminate access for violations of these Terms. You may stop using the App at any time; logging out and revoking Spotify access ends the authorization.

## 11. Changes

Material changes to these Terms will be posted in this file with a new effective date. Continued use after changes take effect constitutes acceptance.

## 12. Governing law

These Terms are governed by the laws of Ontario, Canada, without regard to conflict-of-law principles.
