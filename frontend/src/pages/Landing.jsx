import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSession } from '../context/SessionContext.jsx';
import { api } from '../api.js';
import { applyEraTheme } from '../theme.js';

export default function Landing() {
  const { authenticated } = useSession();

  useEffect(() => {
    applyEraTheme('1989');
  }, []);

  const connect = () => {
    window.location.href = api.loginUrl();
  };

  return (
    <div>
      {/* Hero */}
      <section className="era-hero">
        <div className="max-w-5xl mx-auto px-4 py-20 sm:py-28 text-center">
          <p className="text-sm font-semibold tracking-[0.3em] uppercase era-text-muted">✦ The Taylorizer ✦</p>
          <h1 className="font-display text-4xl sm:text-6xl font-bold mt-4 leading-tight">
            Reclaim your playlists.
            <br />
            One Taylor's Version at a time.
          </h1>
          <p className="max-w-2xl mx-auto mt-6 text-lg era-text-muted">
            SwiftSwap scans your Spotify library for original pre-2019 Taylor Swift master
            recordings — the ones she doesn't own — and replaces them with
            Taylor's Version re-recordings in a single click. Your playlists stay
            yours. The art stays Taylor's.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            {authenticated ? (
              <Link to="/dashboard" className="era-btn text-base !px-8 !py-3.5">
                Go to Dashboard →
              </Link>
            ) : (
              <button onClick={connect} className="era-btn text-base !px-8 !py-3.5">
                Connect with Spotify
              </button>
            )}
            <Link to="/about" className="era-btn-ghost text-base !px-8 !py-3.5">
              How it works
            </Link>
          </div>
          <p className="mt-4 text-xs era-text-muted">We only touch Taylor Swift tracks. Everything else stays exactly where it is.</p>
        </div>
      </section>

      {/* Steps */}
      <section className="max-w-5xl mx-auto px-4 py-16">
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-center">Three steps to a fully re-recorded library</h2>
        <div className="grid sm:grid-cols-3 gap-4 mt-8">
          {[
            { n: '1', title: 'Scan', body: 'We walk through your playlists and find every original pre-2019 master recording, grouped by album era.' },
            { n: '2', title: 'Review', body: 'Pick exactly which tracks to swap. Nothing changes until you say so — you stay in control.' },
            { n: '3', title: 'Substitute', body: 'One click replaces each legacy track with its Taylor\u2019s Version at the same playlist position.' },
          ].map((s) => (
            <div key={s.n} className="era-card p-6">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg"
                style={{ backgroundColor: 'var(--era-primary)', color: 'var(--era-background)' }}
              >
                {s.n}
              </div>
              <h3 className="font-display text-xl font-bold mt-4">{s.title}</h3>
              <p className="text-sm era-text-muted mt-2">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Era theming teaser */}
      <section className="max-w-5xl mx-auto px-4 pb-16">
        <div className="era-card p-8 text-center">
          <h2 className="font-display text-2xl font-bold">The app dresses for the era</h2>
          <p className="era-text-muted mt-2 max-w-xl mx-auto text-sm">
            As you scan, SwiftSwap detects which album era dominates your results and
            re-skins the entire app — gold for Fearless, crimson for Red, monochrome
            for Reputation. Your library, your era.
          </p>
          <div className="flex flex-wrap justify-center gap-2 mt-5">
            {['Debut', 'Fearless', 'Speak Now', 'Red', '1989', 'Reputation'].map((era) => (
              <button
                key={era}
                onClick={() => applyEraTheme(era)}
                className="era-btn-ghost !px-4 !py-1.5 text-xs"
              >
                {era}
              </button>
            ))}
          </div>
          <p className="text-xs era-text-muted mt-3">Tap an era to preview its theme.</p>
        </div>
      </section>
    </div>
  );
}
