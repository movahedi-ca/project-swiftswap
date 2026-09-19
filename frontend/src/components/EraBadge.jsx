import React from 'react';

/**
 * Small pill showing the album "era" of a legacy track.
 */
export default function EraBadge({ era }) {
  if (!era) return null;
  return <span className="era-badge">{era}</span>;
}
