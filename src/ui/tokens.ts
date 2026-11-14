// Design tokens — ROADMAP §1 « Direction artistique ».
// SEULE source des couleurs et des typos (règle 8). Les variables CSS (--sz-*) sont
// injectées depuis ce fichier par applyTokens() ; aucun hex ne doit apparaître ailleurs.
import type { Color, Level } from '../types';

export const tokens = {
  color: {
    bg: '#050607',
    panel: 'rgba(255,255,255,0.03)',
    panelHover: 'rgba(255,255,255,0.06)',
    border: 'rgba(255,255,255,0.12)',
    borderStrong: 'rgba(255,255,255,0.28)',
    text: '#E8E8E6',
    textDim: '#8A8F98',
    holo: '#9FB4C7',
    ok: '#30D158',
    amber: '#FF9F0A',
    red: '#FF453A',
    unknown: '#636366',
  },
  font: {
    text: "'Inter Variable', Inter, system-ui, sans-serif",
    mono: "'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace",
  },
  // = --sz-fs-* (global.css) : label 11 · small 12 · data 13 · body 14 · title 16 · num 22 · display 34
  size: { xs: 11, sm: 12, data: 13, md: 14, lg: 16, xl: 22, xxl: 34 },
  space: { 1: 4, 2: 8, 3: 12, 4: 16, 5: 24, 6: 32 },
  labelTracking: '0.08em',
} as const;

/** Couleur d'un statut. Gris = inconnu, jamais vert par défaut. */
export const statusColor: Record<Color, string> = {
  green: tokens.color.ok,
  amber: tokens.color.amber,
  red: tokens.color.red,
  grey: tokens.color.unknown,
};

export const statusLabel: Record<Color, string> = {
  green: 'NOMINAL',
  amber: 'AMBRE',
  red: 'ROUGE',
  grey: 'INCONNU',
};

export const levelColor: Record<Level, Color> = {
  VERT: 'green',
  AMBRE: 'amber',
  ORANGE: 'amber',
  ROUGE: 'red',
  DONNEES_INSUFFISANTES: 'grey',
};

/** Injecte les tokens en variables CSS sur :root (appelé une fois dans main.tsx). */
export function applyTokens(root: HTMLElement = document.documentElement): void {
  const c = tokens.color;
  const vars: Record<string, string> = {
    '--sz-bg': c.bg, '--sz-panel': c.panel, '--sz-panel-hover': c.panelHover,
    '--sz-border': c.border, '--sz-border-strong': c.borderStrong,
    '--sz-text': c.text, '--sz-text-dim': c.textDim, '--sz-holo': c.holo,
    '--sz-ok': c.ok, '--sz-amber': c.amber, '--sz-red': c.red, '--sz-unknown': c.unknown,
    '--sz-font-text': tokens.font.text, '--sz-font-mono': tokens.font.mono,
    '--sz-tracking': tokens.labelTracking,
  };
  for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v);
}
