// Design tokens — SEULE source des couleurs et des typos (règle 8).
// Les variables CSS (--sz-*) sont injectées depuis ce fichier par applyTokens() ; aucun hex ailleurs.
// Direction : logiciel clinique sobre. Surfaces neutres opaques, interaction en blanc cassé (aucune teinte),
// couleurs vives réservées aux statuts, une seule police (Inter).
import type { Color, Level } from '../types';

export const tokens = {
  color: {
    bg: '#0B0D10',            // fond de l'application
    panel: '#12151A',         // surface d'un panneau
    panelHover: '#1A1E25',    // surface surélevée : survol, champ, ligne sélectionnée
    inset: '#0E1115',         // zone en creux dans un panneau (graphique, tableau)
    border: '#252A32',        // séparateurs et contours
    borderStrong: '#39404B',  // contours de contrôles
    text: '#E6E8EB',
    textDim: '#959CA6',       // texte secondaire
    textMuted: '#69707B',     // texte tertiaire, graduations
    accent: '#E6E8EB',        // interaction : case cochée, focus, sélection — blanc cassé, la couleur reste aux statuts
    holo: '#A9B8C6',          // corps 3D uniquement
    ok: '#3DB46D',
    amber: '#E3A22E',
    red: '#E5544B',
    unknown: '#69707B',
  },
  font: {
    text: "'Inter Variable', Inter, system-ui, -apple-system, 'Segoe UI', sans-serif",
    /** Conservé pour compatibilité : les chiffres utilisent Inter en chiffres tabulaires (plus de chasse fixe). */
    mono: "'Inter Variable', Inter, system-ui, -apple-system, 'Segoe UI', sans-serif",
  },
  // = --sz-fs-* (global.css) : label 11 · small 12 · data 13 · body 14 · title 16 · num 20 · display 24
  size: { xs: 11, sm: 12, data: 13, md: 14, lg: 16, xl: 20, xxl: 24 },
  space: { 1: 4, 2: 8, 3: 12, 4: 16, 5: 24, 6: 32 },
  /** Les libellés ne sont plus en capitales espacées. */
  labelTracking: '0',
} as const;

/** Couleur d'un statut. Gris = inconnu, jamais vert par défaut. */
export const statusColor: Record<Color, string> = {
  green: tokens.color.ok,
  amber: tokens.color.amber,
  red: tokens.color.red,
  grey: tokens.color.unknown,
};

/** Le mot porte le sens, la pastille porte la couleur (vocabulaire des voyants de bord). */
export const statusLabel: Record<Color, string> = {
  green: 'Nominal',
  amber: 'Attention',
  red: 'Alerte',
  grey: 'Sans donnée',
};

/** Libellé d'un niveau de triage, le même sur toutes les pages (ORANGE : à confirmer par Mouad). */
export const levelLabel: Record<Level, string> = {
  VERT: 'Nominal',
  AMBRE: 'Attention',
  ORANGE: 'Attention renforcée',
  ROUGE: 'Alerte',
  DONNEES_INSUFFISANTES: 'Données insuffisantes',
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
    '--sz-bg': c.bg, '--sz-panel': c.panel, '--sz-panel-hover': c.panelHover, '--sz-inset': c.inset,
    '--sz-border': c.border, '--sz-border-strong': c.borderStrong,
    '--sz-text': c.text, '--sz-text-dim': c.textDim, '--sz-text-muted': c.textMuted,
    '--sz-accent': c.accent, '--sz-holo': c.holo,
    '--sz-ok': c.ok, '--sz-amber': c.amber, '--sz-red': c.red, '--sz-unknown': c.unknown,
    '--sz-font-text': tokens.font.text, '--sz-font-mono': tokens.font.mono,
    '--sz-tracking': tokens.labelTracking,
  };
  for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v);
}
