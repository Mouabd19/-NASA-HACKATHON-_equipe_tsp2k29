// Design tokens — SEULE source des couleurs et des typos (règle 8).
// Les variables CSS (--sz-*) sont injectées depuis ce fichier par applyTokens() ; aucun hex ailleurs.
//
// Direction « Instrument médical » : l'écran d'un moniteur patient et la page d'un compte rendu clinique.
//  · Fond noir de moniteur, secteurs séparés par des filets (pas de cartes arrondies).
//  · Couleurs d'alarme des moniteurs (IEC 60601-1-8) : rouge = priorité haute, jaune = priorité moyenne
//    et basse. Le vert ne dit que « nominal ». Le gris dit « inconnu », jamais le vert par défaut.
//  · IBM Plex : Sans pour l'interface, Sans Condensed pour les grandes valeurs (chiffres de moniteur),
//    Mono pour les références, horodatages et légendes d'image (comme les incrustations DICOM).
//  · Papier millimétré d'ECG (filets rosés) uniquement derrière les courbes qui se lisent comme un tracé.
import type { Color, Level } from '../types';

export const tokens = {
  color: {
    bg: '#07080A',            // fond d'écran du moniteur
    panel: '#0D0F12',         // secteur (panneau)
    panelHover: '#161A1F',    // surface surélevée : survol, champ, ligne sélectionnée
    inset: '#0A0B0D',         // zone en creux (graphique, tableau)
    border: '#1E2329',        // filets entre secteurs et lignes
    borderStrong: '#343B44',  // contours de contrôles
    text: '#E9ECEF',
    textDim: '#A0A8B1',       // texte secondaire
    textMuted: '#79828C',     // légendes, graduations (≥ 4,5:1 sur le fond)
    accent: '#E9ECEF',        // interaction : case cochée, focus, sélection (la couleur reste aux alarmes)
    holo: '#C3CAD1',          // corps 3D : gris argentique d'un cliché, sans teinte
    ok: '#3EB873',            // nominal
    amber: '#EDBB2C',         // jaune d'alarme (priorité moyenne / basse)
    water: '#5AA9E6',         // eau du bassin du scanner (animation de chargement uniquement)
    orange: '#F28C28',        // orange : alarme projetée (contour sur fond sombre), pas une alarme du jour
    red: '#F04A42',           // rouge d'alarme (priorité haute)
    unknown: '#79828C',       // sans donnée
    onStatus: '#07080A',      // texte posé sur un aplat d'alarme (jaune, rouge)
    gridMinor: '#171214',     // papier d'ECG : petit carreau (1 mm)
    gridMajor: '#2E2125',     // papier d'ECG : grand carreau (5 mm)
  },
  font: {
    text: "'IBM Plex Sans', 'Inter Variable', system-ui, -apple-system, 'Segoe UI', sans-serif",
    /** Références, horodatages, légendes d'image : chasse fixe comme sur un moniteur ou une incrustation DICOM. */
    mono: "'IBM Plex Mono', ui-monospace, 'SF Mono', Menlo, monospace",
    /** Grandes valeurs mesurées (chiffres de moniteur). */
    num: "'IBM Plex Sans Condensed', 'IBM Plex Sans', 'Inter Variable', system-ui, sans-serif",
  },
  // = --sz-fs-* (global.css) : label 11 · small 12 · data 13 · body 14 · title 16 · num 20 · display 24
  size: { xs: 11, sm: 12, data: 13, md: 14, lg: 16, xl: 20, xxl: 24 },
  space: { 1: 4, 2: 8, 3: 12, 4: 16, 5: 24, 6: 32 },
  /** Les libellés ne sont pas en capitales espacées. */
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
  amber: 'Caution',
  red: 'Warning',
  grey: 'No data',
};

/** Libellé d'un niveau de triage, le même sur toutes les pages (ORANGE : à confirmer par Mouad). */
export const levelLabel: Record<Level, string> = {
  VERT: 'Nominal',
  AMBRE: 'Caution',
  ORANGE: 'Elevated caution',
  ROUGE: 'Warning',
  DONNEES_INSUFFISANTES: 'Insufficient data',
};

export const levelColor: Record<Level, Color> = {
  VERT: 'green',
  AMBRE: 'amber',
  ORANGE: 'amber',
  ROUGE: 'red',
  DONNEES_INSUFFISANTES: 'grey',
};

/**
 * Priorité d'alarme, à la manière des moniteurs patients (IEC 60601-1-8 : haute / moyenne / basse).
 * Le marqueur « !!! / !! / ! » est la convention d'affichage de nombreux moniteurs ; il distingue
 * AMBRE (basse) d'ORANGE (moyenne), qui partagent la même couleur jaune.
 */
export type AlarmPriority = 'haute' | 'moyenne' | 'basse';
export const levelPriority: Record<Level, AlarmPriority | null> = {
  ROUGE: 'haute',
  ORANGE: 'moyenne',
  AMBRE: 'basse',
  VERT: null,
  DONNEES_INSUFFISANTES: null,
};
// haute : un seul « ! » sur aplat rouge (la couleur suffit) ; moyenne : triangle « attention » (dessiné par AlarmMark)
export const priorityMark: Record<AlarmPriority, string> = { haute: '!', moyenne: '!!', basse: '!' };
export const priorityLabel: Record<AlarmPriority, string> = {
  haute: 'High priority',
  moyenne: 'Medium priority',
  basse: 'Low priority',
};

/** Injecte les tokens en variables CSS sur :root (appelé une fois dans main.tsx). */
export function applyTokens(root: HTMLElement = document.documentElement): void {
  const c = tokens.color;
  const vars: Record<string, string> = {
    '--sz-bg': c.bg, '--sz-panel': c.panel, '--sz-panel-hover': c.panelHover, '--sz-inset': c.inset,
    '--sz-border': c.border, '--sz-border-strong': c.borderStrong,
    '--sz-text': c.text, '--sz-text-dim': c.textDim, '--sz-text-muted': c.textMuted,
    '--sz-accent': c.accent, '--sz-holo': c.holo,
    '--sz-ok': c.ok, '--sz-amber': c.amber, '--sz-orange': c.orange, '--sz-red': c.red, '--sz-unknown': c.unknown,
    '--sz-on-status': c.onStatus, '--sz-grid-minor': c.gridMinor, '--sz-grid-major': c.gridMajor,
    '--sz-font-text': tokens.font.text, '--sz-font-mono': tokens.font.mono, '--sz-font-num': tokens.font.num,
    '--sz-tracking': tokens.labelTracking,
  };
  for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v);
}
