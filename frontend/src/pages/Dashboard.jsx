import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { applyEraTheme, getPredominantEra } from '../theme.js';
import { useSession } from '../context/SessionContext.jsx';
import JobProgress from '../components/JobProgress.jsx';
import EraBadge from '../components/EraBadge.jsx';

const RESULTS_KEY = 'swiftswap-scan-results';

export function saveScanResults(results) {
  try {
    sessionStorage.setItem(RESULTS_KEY, JSON.stringify(results));
  } catch {
    /* storage unavailable */
  }
}

export function loadScanResults() {
  try {
    const raw = sessionStorage.getItem(RESULTS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function Dashboard() {
  const { displayName } = useSession();
  const navigate = useNavigate();
  const [jobId, setJobId] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState(null);
  const [results, setResults] = useState(() => loadScanResults());

  // Theme from saved results on mount
  useEffect(() => {
    const era = getPredominantEra(results?.tracks);
    applyEraTheme(era || '1989');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startScan = async () => {
    setScanError(null);
    setResults(null);
    saveScanResults(null);
    setScanning(true);
    try {
      const { jobId: id } = await api.startScan();
      setJobId(id);
    } catch (err) {
      setScanError(err.message);
      setScanning(false);
    }
  };

  const handleJobUpdate = useCallback((job) => {
    if (job.results) {
      setResults(job.results);
      saveScanResults(job.results);
      const era = getPredominantEra(job.results.tracks);
      if (era) applyEraTheme(era);
    }
  }, []);

  const handleJobDone = useCallback((job) => {
    setScanning(false);
    if (job.status === 'failed') {
      setScanError((job.errors || []).map((e) => (typeof e === 'string' ? e : e.message)).join('; ') || 'Scan failed.');
    }
  }, []);

  const byPlaylist = useMemo(() => {
    const groups = {};
    for (const t of results?.tracks || []) {
      const key = t.playlistId || 'unknown';
      if (!groups[key]) groups[key] = { name: t.playlistName || 'Unknown playlist', tracks: [] };
      groups[key].tracks.push(t);
    }
    return Object.values(groups);
  }, [results]);

  const predominantEra = getPredominantEra(results?.tracks);

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="font-display text-3xl font-bold">
        {displayName ? `Welcome, ${displayName}` : 'Your library'}
      </h1>
      <p className="era-text-muted mt-2 max-w-2xl">
        Scan your playlists for original pre-2019 Taylor Swift master recordings.
        The scan is read-only — nothing changes until you choose to substitute.
      </p>

      <div className="mt-6">
        {!scanning && !jobId && (
          <button onClick={startScan} className="era-btn">
            🔍 Scan my library
          </button>
        )}
        {scanError && <p className="text-sm mt-3" style={{ color: '#f87171' }}>{scanError}</p>}
      </div>

      {jobId && scanning && (
        <div className="era-card p-5 mt-6">
          <JobProgress
            jobId={jobId}
            label="Scanning your playlists…"
            onUpdate={handleJobUpdate}
            onDone={handleJobDone}
          />
        </div>
      )}

      {results && !scanning && (
        <div className="mt-8 space-y-6">
          <div className="era-card p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="font-display text-2xl font-bold">
                  We found {results.totalLegacyFound ?? (results.tracks || []).length} legacy track
                  {(results.totalLegacyFound ?? (results.tracks || []).length) === 1 ? '' : 's'}
                </h2>
                <p className="text-sm era-text-muted mt-1">
                  Across {results.playlistsScanned ?? byPlaylist.length} playlist
                  {(results.playlistsScanned ?? byPlaylist.length) === 1 ? '' : 's'}
                  {predominantEra && (
                    <>
                      {' '}· predominant era: <EraBadge era={predominantEra} />
                    </>
                  )}
                </p>
              </div>
              <button onClick={() => navigate('/results')} className="era-btn">
                Review & substitute →
              </button>
            </div>
            {(results.playlistsSkipped || []).length > 0 && (
              <details className="text-sm era-text-muted mt-4">
                <summary className="cursor-pointer">
                  Skipped {results.playlistsSkipped.length} playlist(s)
                </summary>
                <ul className="mt-2 space-y-1 list-disc list-inside">
                  {results.playlistsSkipped.map((p, i) => (
                    <li key={i}>
                      {p.name || p.id} — {p.reason}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>

          {byPlaylist.map((g, i) => (
            <div key={i} className="era-card p-5">
              <h3 className="font-semibold">
                {g.name}{' '}
                <span className="text-sm era-text-muted font-normal">
                  ({g.tracks.length} legacy track{g.tracks.length === 1 ? '' : 's'})
                </span>
              </h3>
              <ul className="mt-3 space-y-1.5">
                {g.tracks.map((t, j) => (
                  <li key={j} className="flex items-center justify-between gap-3 text-sm px-3 py-1.5 rounded-lg"
                    style={{ backgroundColor: 'color-mix(in srgb, var(--era-surface) 70%, transparent)' }}>
                    <span className="truncate">
                      <span className="font-medium">{t.legacyTrack?.title}</span>
                      <span className="era-text-muted"> — {(t.legacyTrack?.artists || []).join(', ')}</span>
                    </span>
                    <EraBadge era={t.era} />
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div className="flex gap-3">
            <button onClick={startScan} className="era-btn-ghost">
              ↻ Re-scan
            </button>
          </div>
        </div>
      )}

</div>
  );
}
