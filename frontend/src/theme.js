/**
 * Era theming. Each Taylor Swift "era" (album) maps to a palette of CSS
 * custom properties. applyEraTheme(era) writes them to document root so the
 * whole app re-skins instantly.
 *
 * CSS vars consumed (see src/index.css):
 *   --era-primary     accents: buttons, links, highlights
 *   --era-accent      secondary accent: badges, borders, hover states
 *   --era-background  app background
 *   --era-surface     card / panel background
 *   --era-text        main body text
 *   --era-muted       secondary text
 *   --era-gradient    hero / header gradient background
 */

export const ERAS = ['Debut', 'Fearless', 'Speak Now', 'Red', '1989', 'Reputation'];

export const ERA_THEMES = {
  Debut: {
    primary: '#14b8a6',
    accent: '#5eead4',
    background: '#042f2e',
    surface: '#134e4a',
    text: '#f0fdfa',
    muted: '#99f6e4',
    gradient: 'linear-gradient(135deg, #042f2e 0%, #0f766e 60%, #14b8a6 100%)',
  },
  Fearless: {
    primary: '#d4a017',
    accent: '#fbbf24',
    background: '#1c1917',
    surface: '#292524',
    text: '#fefce8',
    muted: '#fde68a',
    gradient: 'linear-gradient(135deg, #1c1917 0%, #713f12 55%, #d4a017 100%)',
  },
  'Speak Now': {
    primary: '#9333ea',
    accent: '#c084fc',
    background: '#1e1b2e',
    surface: '#2e2647',
    text: '#faf5ff',
    muted: '#d8b4fe',
    gradient: 'linear-gradient(135deg, #1e1b2e 0%, #5b21b6 60%, #9333ea 100%)',
  },
  Red: {
    primary: '#dc2626',
    accent: '#f87171',
    background: '#1c0a0a',
    surface: '#2a1212',
    text: '#fef2f2',
    muted: '#fca5a5',
    gradient: 'linear-gradient(135deg, #1c0a0a 0%, #7f1d1d 55%, #dc2626 100%)',
  },
  1989: {
    primary: '#38bdf8',
    accent: '#7dd3fc',
    background: '#0c1826',
    surface: '#16283d',
    text: '#f0f9ff',
    muted: '#bae6fd',
    gradient: 'linear-gradient(135deg, #0c1826 0%, #1d4e89 55%, #38bdf8 100%)',
  },
  Reputation: {
    primary: '#a1a1aa',
    accent: '#e4e4e7',
    background: '#09090b',
    surface: '#18181b',
    text: '#fafafa',
    muted: '#a1a1aa',
    gradient: 'linear-gradient(135deg, #09090b 0%, #27272a 55%, #52525b 100%)',
  },
};

const DEFAULT_ERA = '1989';

export function applyEraTheme(era) {
  const theme = ERA_THEMES[era] || ERA_THEMES[DEFAULT_ERA];
  const root = document.documentElement;
  root.style.setProperty('--era-primary', theme.primary);
  root.style.setProperty('--era-accent', theme.accent);
  root.style.setProperty('--era-background', theme.background);
  root.style.setProperty('--era-surface', theme.surface);
  root.style.setProperty('--era-text', theme.text);
  root.style.setProperty('--era-muted', theme.muted);
  root.style.setProperty('--era-gradient', theme.gradient);
  root.dataset.era = era || DEFAULT_ERA;
  document.body.style.backgroundColor = theme.background;
  document.body.style.color = theme.text;
}

/**
 * Returns the era that appears most often among the given tracks.
 * Tracks are expected to carry an `era` field.
 */
export function getPredominantEra(tracks) {
  if (!tracks || tracks.length === 0) return null;
  const counts = {};
  for (const t of tracks) {
    if (t && t.era) counts[t.era] = (counts[t.era] || 0) + 1;
  }
  let best = null;
  let bestCount = 0;
  for (const [era, n] of Object.entries(counts)) {
    if (n > bestCount) {
      best = era;
      bestCount = n;
    }
  }
  return best;
}
