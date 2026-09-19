import React, { useEffect, useState } from 'react';
import { api } from '../api.js';

/**
 * After a substitution completes, suggests adding "From The Vault" tracks
 * from the re-recorded albums of the eras the user just swapped.
 *
 * Props:
 *  - eras: array of era names present among successfully swapped tracks
 */
export default function VaultPrompt({ eras }) {
  const [vaultTracks, setVaultTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await api.mapping();
        const albums = (data && data.albums) || [];
        const wanted = new Set((eras || []).map((e) => String(e).toLowerCase()));
        const picks = [];
        for (const album of albums) {
          if (wanted.size && !wanted.has(String(album.era).toLowerCase())) continue;
          for (const vt of album.vaultTracks || []) {
            picks.push({ era: album.era, album: album.taylorsVersion?.title || album.legacyAlbum, track: vt });
            if (picks.length >= 6) break;
          }
          if (picks.length >= 6) break;
        }
        if (!cancelled) setVaultTracks(picks);
      } catch {
        if (!cancelled) setVaultTracks([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [eras]);

  if (dismissed || (!loading && vaultTracks.length === 0)) return null;

  return (
    <div className="era-card p-5 mt-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-display text-lg font-bold">From The Vault ✦</h3>
          <p className="text-sm era-text-muted mt-1">
            You just claimed more of Taylor's versions. While you're here, here are some
            previously unreleased vault tracks from the same re-recorded albums —
            search for them on Spotify and add them to your library.
          </p>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-sm era-text-muted hover:opacity-70 shrink-0"
          aria-label="Dismiss vault suggestions"
        >
          ✕
        </button>
      </div>
      {loading ? (
        <p className="text-sm era-text-muted mt-3">Finding vault tracks…</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {vaultTracks.map((v, i) => (
            <li
              key={i}
              className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl text-sm"
              style={{ backgroundColor: 'color-mix(in srgb, var(--era-primary) 10%, transparent)' }}
            >
              <span className="truncate">
                <span className="font-semibold">{typeof v.track === 'string' ? v.track : v.track.title || v.track}</span>
                <span className="era-text-muted"> — {v.album}</span>
              </span>
              <span className="era-badge shrink-0">{v.era}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
