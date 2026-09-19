import React from 'react';
import EraBadge from './EraBadge.jsx';

/**
 * One legacy track row: checkbox, legacy title/artists, playlist,
 * era badge, and (when present) substitution outcome status.
 *
 * Props:
 *  - track: {playlistId, playlistName, position, legacyTrack:{uri,title,artists}, era}
 *  - checked, onToggle
 *  - status: null | {state:'ok'|'skipped'|'error', detail}
 *  - selectable (default true)
 */
export default function TrackRow({ track, checked, onToggle, status, selectable = true }) {
  const legacy = track.legacyTrack || {};
  const statusStyles = {
    ok: { color: '#4ade80', label: 'Swapped ✓' },
    skipped: { color: 'var(--era-muted)', label: status?.detail || 'Skipped' },
    error: { color: '#f87171', label: status?.detail || 'Failed' },
  };
  const st = status ? statusStyles[status.state] : null;

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:opacity-90 transition-opacity" style={{ backgroundColor: 'color-mix(in srgb, var(--era-surface) 70%, transparent)' }}>
      {selectable && (
        <input
          type="checkbox"
          checked={Boolean(checked)}
          onChange={onToggle}
          disabled={status?.state === 'ok'}
          aria-label={`Select ${legacy.title || 'track'}`}
          className="w-4 h-4 shrink-0 accent-[var(--era-primary)]"
          style={{ accentColor: 'var(--era-primary)' }}
        />
      )}
      <div className="min-w-0 flex-1">
        <div className="font-medium truncate">{legacy.title || 'Unknown title'}</div>
        <div className="text-xs era-text-muted truncate">
          {(legacy.artists || []).join(', ') || 'Unknown artist'} · {track.playlistName || 'Playlist'}
        </div>
      </div>
      <EraBadge era={track.era} />
      {st && (
        <span className="text-xs font-semibold whitespace-nowrap" style={{ color: st.color }}>
          {st.label}
        </span>
      )}
    </div>
  );
}
