// Design tokens — ROADMAP §1 « Direction artistique ».
// SEULE source des couleurs et des typos (règle 8). Les variables CSS (--sz-*) sont
// injectées depuis ce fichier par applyTokens() ; aucun hex ne doit apparaître ailleurs.
import type { Color, Level } from '../types';

export const tokens = {
  // DA ALTERNATIVE « Dragon » (branche feature/mouad-da-dragon) : cockpit tactile bleu nuit, inspiration Apple + SpaceX.
  color: {
    bg: '#0A1424',
    panel: 'rgba(120,165,230,0.055)',
    panelHover: 'rgba(120,165,230,0.10)',
    border: 'rgba(150,185,235,0.13)',
    borderStrong: 'rgba(150,185,235,0.30)',
    text: '#EEF3FA',
    textDim: '#8C9AB3',
    holo: '#7FB6FF',
    ok: '#6CC79A',
    amber: '#F2B451',
    red: '#FF6B5E',
    unknown: '#6B778C',
  },
  font: {
    text: "'Inter Variable', -apple-system, 'SF Pro Text', system-ui, sans-serif",
    mono: "'Barlow', 'Inter Variable', system-ui, sans-serif",
  },
  // = --sz-fs-* (global.css) : label 11 · small 12 · data 13 · body 14 · title 16 · num 22 · display 34
  size: { xs: 11, sm: 12, data: 13, md: 14, lg: 16, xl: 22, xxl: 34 },
  space: { 1: 4, 2: 8, 3: 12, 4: 16, 5: 24, 6: 32 },
  labelTracking: '0.1em',
} as const;

/** Couleur d'un statut. Gris = inconnu, jamais vert par défaut. */
export const statusColor: Record<Color, string> = {
  green: tokens.color.ok,
  amber: tokens.color.amber,
  red: tokens.color.red,
  grey: tokens.color.unknown,
};

export const statusLabel: Record<Color, string> = {
  green: 'Nominal',
  amber: 'Ambre',
  red: 'Rouge',
  grey: 'Inconnu',
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
