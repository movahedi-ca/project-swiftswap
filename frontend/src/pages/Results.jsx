import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { applyEraTheme, getPredominantEra } from '../theme.js';
import TrackRow from '../components/TrackRow.jsx';
import JobProgress from '../components/JobProgress.jsx';
import VaultPrompt from '../components/VaultPrompt.jsx';
import { loadScanResults } from './Dashboard.jsx';

/**
 * Builds the Spotify search query the backend uses to locate the
 * Taylor's Version counterpart of a legacy track.
 */
export function buildTvSearchQuery(legacyTitle, tvTitle) {
  // Prefer the exact Taylor's Version title from the mapping database;
  // fall back to appending the suffix to the legacy title.
  const title = tvTitle || `${legacyTitle || ''} (Taylor's Version)`;
  const safe = String(title).replace(/"/g, '');
  return `track:"${safe}" artist:"Taylor Swift"`;
}

export default function Results() {
  const [tracks] = useState(() => loadScanResults()?.tracks || []);
  const [selected, setSelected] = useState(() => new Set());
  const [jobId, setJobId] = useState(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState(null);
  const [outcomes, setOutcomes] = useState({}); // index -> {state, detail}
  const [doneEras, setDoneEras] = useState([]);

  useEffect(() => {
    applyEraTheme(getPredominantEra(tracks) || '1989');
  }, [tracks]);

  const allSelected = tracks.length > 0 && selected.size === tracks.length;

  const toggle = (i) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(tracks.map((_, i) => i)));
  };

  const chosen = useMemo(() => [...selected].sort((a, b) => a - b), [selected]);

  const substitute = async () => {
    if (chosen.length === 0 || running) return;
    setError(null);
    setOutcomes({});
    setRunning(true);
    const items = chosen.map((i) => {
      const t = tracks[i];
      return {
        playlistId: t.playlistId,
        legacyUri: t.legacyTrack?.uri,
        position: t.position,
        tvSearchQuery: buildTvSearchQuery(t.legacyTrack?.title, t.tvTitle),
      };
    });
    try {
      const { jobId: id } = await api.substitute(items);
      setJobId(id);
    } catch (err) {
      setError(err.message);
      setRunning(false);
    }
  };

  // Map per-item outcomes (job.results aligned with items sent) onto tracks.
  const handleJobUpdate = (job) => {
    if (Array.isArray(job.results)) {
      const next = {};
      job.results.forEach((r, idx) => {
        const trackIndex = chosen[idx];
        if (trackIndex === undefined) return;
        if (r && r.ok) next[trackIndex] = { state: 'ok' };
        else if (r && r.skipped) next[trackIndex] = { state: 'skipped', detail: r.reason || 'Skipped' };
        else if (r) next[trackIndex] = { state: 'error', detail: r.error || r.reason || 'Failed' };
      });
      setOutcomes(next);
    }
  };

  const handleJobDone = (job) => {
    setRunning(false);
    // Collect eras of successfully swapped tracks for the Vault prompt.
    const eras = new Set();
    if (Array.isArray(job.results)) {
      job.results.forEach((r, idx) => {
        if (r && r.ok) {
          const era = tracks[chosen[idx]]?.era;
          if (era) eras.add(era);
        }
      });
    }
    setDoneEras([...eras]);
  };

  if (tracks.length === 0) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-bold">No scan results yet</h1>
        <p className="era-text-muted mt-2">Run a library scan first, then come back to review what we found.</p>
        <Link to="/dashboard" className="era-btn mt-6 inline-flex">
          Go to Dashboard
        </Link>
      </div>
    );
  }

  const swappedCount = Object.values(outcomes).filter((o) => o.state === 'ok').length;

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="font-display text-3xl font-bold">Review & substitute</h1>
      <p className="era-text-muted mt-2 max-w-2xl">
        Select the legacy tracks to replace. Each one is swapped for its Taylor's
        Version at the same position in its playlist — everything else is untouched.
      </p>

      <div className="flex flex-wrap items-center gap-3 mt-6">
        <button onClick={toggleAll} className="era-btn-ghost text-xs !px-4 !py-2">
          {allSelected ? 'Deselect all' : 'Select all'}
        </button>
        <span className="text-sm era-text-muted">
          {selected.size} of {tracks.length} selected
          {swappedCount > 0 && ` · ${swappedCount} swapped ✓`}
        </span>
        <div className="flex-1" />
        <button onClick={substitute} disabled={selected.size === 0 || running} className="era-btn">
          {running ? 'Substituting…' : `Substitute selected (${selected.size})`}
        </button>
      </div>

      {error && <p className="text-sm mt-3" style={{ color: '#f87171' }}>{error}</p>}

      {jobId && running && (
        <div className="era-card p-5 mt-6">
          <JobProgress
            jobId={jobId}
            label="Substituting tracks…"
            onUpdate={handleJobUpdate}
            onDone={handleJobDone}
          />
        </div>
      )}

      <div className="mt-6 space-y-2">
        {tracks.map((t, i) => (
          <TrackRow
            key={`${t.playlistId}-${t.legacyTrack?.uri}-${i}`}
            track={t}
            checked={selected.has(i)}
            onToggle={() => toggle(i)}
            status={outcomes[i] || null}
          />
        ))}
      </div>

      {!running && doneEras.length > 0 && <VaultPrompt eras={doneEras} />}
    </div>
  );
}
