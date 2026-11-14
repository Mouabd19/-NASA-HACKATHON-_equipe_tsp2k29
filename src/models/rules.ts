// Règles de couleur par métrique, partagées par le corps mesuré (J0–J94) et projeté (> J94).
// Gris = inconnu, jamais vert par défaut.
import type { Color } from '../types.ts';
import { BONE_RED, boneLossPct, type BoneSite } from './bone.ts';
import { MUSCLE_THRESHOLDS } from './muscle.ts';
import { VO2_PREFLIGHT, vo2Floor } from './aerobic.ts';

export function worstColor(colors: Color[]): Color {
  return colors.includes('red') ? 'red' : colors.includes('amber') ? 'amber' : colors.includes('green') ? 'green' : 'grey';
}

/** Perte à partir de laquelle une projection « rouge à J860 » devient une alerte (évite l'alarme dès J1) [H]. */
export const BONE_ENGAGED_LOSS_PCT = 1.5;

/**
 * Os : rouge sous le seuil NASA ; ambre si la perte est engagée ET que la projection J860 passe sous le seuil,
 * ou si les ¾ de la marge sont consommés [H].
 */
export function boneColor(site: BoneSite, densityPct: number, adherence = 0): Color {
  if (!Number.isFinite(densityPct)) return 'grey';
  const red = BONE_RED[site];
  const loss = 100 - densityPct;
  if (densityPct < red) return 'red';
  const projectedRed = 100 - boneLossPct(site, 860, adherence) < red;
  if (projectedRed && loss >= BONE_ENGAGED_LOSS_PCT) return 'amber';
  if (loss >= 0.75 * (100 - red)) return 'amber';
  return 'green';
}

/** Muscle, sur la perte moyenne des 7 derniers jours (jamais sur le point du jour). lossPct > 0 = perte. */
export function muscleColor(lossPct: number): Color {
  if (!Number.isFinite(lossPct)) return 'grey';
  return lossPct >= MUSCLE_THRESHOLDS.red ? 'red' : lossPct >= MUSCLE_THRESHOLDS.amber ? 'amber' : 'green';
}

/** Seuil ambre [H] : 8 % de déficit vs pré-vol (marge avant la norme). */
export const VO2_AMBER_DEFICIT_PCT = 8;

/** Rouge sous la norme NASA (36,5 ml/kg/min [V1 4002] ou 80 % du pré-vol [V1 4003]) ; ambre dès 8 % de déficit [H]. */
export function vo2Color(vo2: number): Color {
  if (!Number.isFinite(vo2)) return 'grey';
  return vo2 < vo2Floor() ? 'red' : (1 - vo2 / VO2_PREFLIGHT) * 100 >= VO2_AMBER_DEFICIT_PCT ? 'amber' : 'green';
}

/** Plus haut = pire (calcium urinaire, gaine du nerf optique, dose). */
export const levelUp = (v: number, amber: number, red: number): Color =>
  !Number.isFinite(v) ? 'grey' : v >= red ? 'red' : v >= amber ? 'amber' : 'green';

/** Bornes d'une plage normale : hors bornes « ambre » → ambre, hors bornes « rouge » → rouge. */
export interface Band { redLow?: number; amberLow?: number; amberHigh?: number; redHigh?: number }

/** Couleur d'une valeur dans une plage (trop bas ET trop haut peuvent être pires). NaN → gris, jamais vert. */
export function inBand(v: number, b: Band): Color {
  if (!Number.isFinite(v)) return 'grey';
  if ((b.redLow !== undefined && v < b.redLow) || (b.redHigh !== undefined && v >= b.redHigh)) return 'red';
  if ((b.amberLow !== undefined && v < b.amberLow) || (b.amberHigh !== undefined && v > b.amberHigh)) return 'amber';
  return 'green';
}

/**
 * Plages des métriques sans norme NASA chiffrée : repères d'équipe [H] (ordres de grandeur cliniques terrestres).
 * Elles remplacent les couleurs vertes fixées en dur : une valeur anormale n'est jamais affichée en vert.
 */
export const BANDS = {
  fraction_ejection: { redLow: 45, amberLow: 55 },                          // % (FEVG normale 55–70)
  taille: { redLow: 85, amberLow: 92 },                                     // masse ventriculaire, % vs J0
  fc_repos: { redLow: 40, amberLow: 45, amberHigh: 90, redHigh: 110 },      // bpm
  tension_sys: { redLow: 80, amberLow: 90, amberHigh: 130, redHigh: 140 },  // mmHg
  tension_dia: { redLow: 50, amberLow: 60, amberHigh: 85, redHigh: 90 },    // mmHg
  volume_jambes: { redLow: 75, amberLow: 80 },                              // % vs J0 (−10 à −15 % = transfert de fluides attendu)
  pvt: { amberHigh: 300, redHigh: 350 },                                    // ms, moyenne 7 j (temps de réaction)
  dose_jour: { amberHigh: 1.85, redHigh: 3 },                               // mSv/j (croisière prévue 1,84)
} satisfies Record<string, Band>;

/** Calculs rénaux vus au scan : 1 ou plus → ambre (hydratation + échographie des reins, ROADMAP §8). */
export const stonesColor = (n: number): Color => (!Number.isFinite(n) ? 'grey' : n >= 1 ? 'amber' : 'green');
