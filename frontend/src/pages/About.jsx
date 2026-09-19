import React from 'react';
import { ERAS, ERA_THEMES } from '../theme.js';
import EraBadge from '../components/EraBadge.jsx';

export default function About() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="font-display text-3xl font-bold">About SwiftSwap</h1>

      <section className="mt-6 space-y-4">
        <h2 className="font-display text-xl font-bold">What it does</h2>
        <p className="era-text-muted">
          Taylor Swift is re-recording her first six albums so she can own her
          masters. SwiftSwap helps fans make their streaming match that mission:
          it scans your Spotify playlists for the original pre-2019 master
          recordings and replaces them, one click at a time, with the
          <em> Taylor's Version</em> re-recordings — at the exact same playlist
          position. Your playlists keep their order, their names, and everything
          else in them.
        </p>
        <ul className="list-disc list-inside era-text-muted space-y-1">
          <li><strong style={{ color: 'var(--era-text)' }}>Scan</strong> — read-only walk through your playlists; we flag legacy masters.</li>
          <li><strong style={{ color: 'var(--era-text)' }}>Review</strong> — you pick which tracks to swap; nothing happens without you.</li>
          <li><strong style={{ color: 'var(--era-text)' }}>Substitute</strong> — each selected track is replaced by its Taylor's Version.</li>
        </ul>
        <p className="era-text-muted">
          After a substitution, we'll nudge you toward <em>From The Vault</em>
          tracks from the same re-recorded albums — songs that never existed in
          the original masters and only appear on Taylor's Versions.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-xl font-bold">The six eras</h2>
        <p className="era-text-muted mt-2 text-sm">
          SwiftSwap's whole interface re-skins itself around whichever era dominates
          your scan results:
        </p>
        <div className="grid sm:grid-cols-2 gap-3 mt-4">
          {ERAS.map((era) => {
            const theme = ERA_THEMES[era];
            return (
              <div
                key={era}
                className="rounded-2xl p-4 border"
                style={{ background: theme.gradient, borderColor: theme.primary }}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold" style={{ color: theme.text }}>{era}</span>
                  <EraBadge era={era} />
                </div>
                <p className="text-xs mt-1" style={{ color: theme.muted }}>
                  {era === 'Debut' && 'Teal — where it all began.'}
                  {era === 'Fearless' && 'Gold — fearless and shining.'}
                  {era === 'Speak Now' && 'Purple — every word her own.'}
                  {era === 'Red' && 'Crimson — loving it was red.'}
                  {era === '1989' && 'Sky blue — the pop reinvention.'}
                  {era === 'Reputation' && 'Monochrome — the old Taylor can\'t come to the phone.'}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-10 space-y-4">
        <h2 className="font-display text-xl font-bold">Compliance & privacy</h2>
        <ul className="list-disc list-inside era-text-muted space-y-2 text-sm">
          <li>
            <strong style={{ color: 'var(--era-text)' }}>Official API only.</strong>{' '}
            SwiftSwap uses the official Spotify Web API — no scraping, no unofficial
            endpoints, no credential harvesting.
          </li>
          <li>
            <strong style={{ color: 'var(--era-text)' }}>Session-only tokens.</strong>{' '}
            Your Spotify access tokens live only in your server session cookie and are
            never stored in a database, logged, or shared with third parties.
          </li>
          <li>
            <strong style={{ color: 'var(--era-text)' }}>Minimal scopes.</strong>{' '}
            We request only the permissions needed to read your playlists and modify
            the ones you own.
          </li>
          <li>
            <strong style={{ color: 'var(--era-text)' }}>Your data stays yours.</strong>{' '}
            Scan results live in your browser's session storage and disappear when
            you close the tab. Logging out clears your session server-side.
          </li>
          <li>
            <strong style={{ color: 'var(--era-text)' }}>Fan project.</strong>{' '}
            SwiftSwap is not affiliated with Taylor Swift, TAS Rights Management,
            or Spotify. Album and track names are used nominatively to identify the
            recordings being swapped.
          </li>
        </ul>
      </section>
    </div>
  );
}
