import React from 'react';

/**
 * Simple progress bar themed by the current era.
 */
export default function ProgressBar({ done, total, label }) {
  const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
  return (
    <div className="w-full">
      {label && <div className="text-sm era-text-muted mb-1">{label}</div>}
      <div
        className="h-3 rounded-full overflow-hidden"
        style={{ backgroundColor: 'color-mix(in srgb, var(--era-primary) 20%, transparent)' }}
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${pct}%`, backgroundColor: 'var(--era-primary)' }}
        />
      </div>
      <div className="text-xs era-text-muted mt-1">
        {done} / {total} ({pct}%)
      </div>
    </div>
  );
}
