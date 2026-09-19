import React, { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import ProgressBar from './ProgressBar.jsx';

/**
 * Polls a backend job (scan or substitution) every `intervalMs` until it
 * reaches a terminal state. Renders progress, pause/resume controls,
 * and any errors.
 *
 * Props:
 *  - jobId: job to poll
 *  - intervalMs (default 2000)
 *  - label: progress label
 *  - pausable: show pause/resume buttons (default true)
 *  - onDone(job): called once when the job completes
 *  - onUpdate(job): called on every poll result
 */
const TERMINAL = new Set(['completed', 'failed', 'cancelled']);

export default function JobProgress({ jobId, intervalMs = 2000, label, pausable = true, onDone, onUpdate }) {
  const [job, setJob] = useState(null);
  const [error, setError] = useState(null);
  const [actionBusy, setActionBusy] = useState(false);
  const doneRef = useRef(false);

  useEffect(() => {
    doneRef.current = false;
    setJob(null);
    setError(null);
    if (!jobId) return;

    let cancelled = false;
    async function poll() {
      try {
        const j = await api.getJob(jobId);
        if (cancelled) return;
        setJob(j);
        onUpdate && onUpdate(j);
        if (TERMINAL.has(j.status)) {
          if (!doneRef.current) {
            doneRef.current = true;
            onDone && onDone(j);
          }
          return;
        }
      } catch (err) {
        if (cancelled) return;
        setError(err.message);
        return;
      }
      setTimeout(() => {
        if (!cancelled) poll();
      }, intervalMs);
    }
    poll();
    return () => {
      cancelled = true;
    };
  }, [jobId, intervalMs]);

  async function togglePause() {
    if (!job || actionBusy) return;
    setActionBusy(true);
    try {
      if (job.status === 'paused') {
        await api.resumeJob(jobId);
      } else {
        await api.pauseJob(jobId);
      }
      const j = await api.getJob(jobId);
      setJob(j);
      onUpdate && onUpdate(j);
    } catch (err) {
      setError(err.message);
    } finally {
      setActionBusy(false);
    }
  }

  if (!jobId) return null;
  if (error) return <p className="text-sm" style={{ color: '#f87171' }}>Job error: {error}</p>;
  if (!job) return <p className="text-sm era-text-muted">Starting job…</p>;

  const progress = job.progress || { done: 0, total: 0 };
  const showPause = pausable && (job.status === 'running' || job.status === 'paused');

  return (
    <div className="space-y-3">
      <ProgressBar done={progress.done} total={progress.total} label={label || `Status: ${job.status}`} />
      <div className="flex items-center gap-3 flex-wrap">
        {showPause && (
          <button onClick={togglePause} disabled={actionBusy} className="era-btn-ghost">
            {job.status === 'paused' ? '▶ Resume' : '⏸ Pause'}
          </button>
        )}
        {job.status === 'paused' && <span className="text-sm era-text-muted">Paused — resume when ready.</span>}
        {job.status === 'failed' && (
          <span className="text-sm" style={{ color: '#f87171' }}>
            Job failed. {(job.errors || []).length > 0 && `${job.errors.length} error(s) recorded.`}
          </span>
        )}
      </div>
      {(job.errors || []).length > 0 && (
        <details className="text-xs era-text-muted">
          <summary className="cursor-pointer">Job errors ({job.errors.length})</summary>
          <ul className="mt-1 space-y-1 list-disc list-inside">
            {job.errors.map((e, i) => (
              <li key={i}>{typeof e === 'string' ? e : e.message || JSON.stringify(e)}</li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
