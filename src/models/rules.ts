// Règles de couleur par métrique, partagées par le générateur (J0–J94) et la projection (> J94).
// Gris = inconnu, jamais vert par défaut.
import type { Color } from '../types.ts';
import { BONE_RED, boneDensityPct, type BoneSite } from './bone.ts';
import { MUSCLE_THRESHOLDS } from './muscle.ts';
import { VO2_PREFLIGHT, vo2Floor } from './aerobic.ts';

export function worstColor(colors: Color[]): Color {
  return colors.includes('red') ? 'red' : colors.includes('amber') ? 'amber' : colors.includes('green') ? 'green' : 'grey';
}

/** Rouge sous le seuil NASA ; ambre si la projection J860 au rythme actuel passe sous ce seuil [H]. */
export function boneColor(site: BoneSite, densityPct: number): Color {
  if (!Number.isFinite(densityPct)) return 'grey';
  const red = BONE_RED[site];
  return densityPct < red ? 'red' : boneDensityPct(site, 860) < red ? 'amber' : 'green';
}

/** volumePct = variation de volume vs J0 (négatif = perte). */
export function muscleColor(volumePct: number): Color {
  if (!Number.isFinite(volumePct)) return 'grey';
  const loss = -volumePct;
  return loss >= MUSCLE_THRESHOLDS.red ? 'red' : loss >= MUSCLE_THRESHOLDS.amber ? 'amber' : 'green';
}

/** Seuil ambre [H] : 8 % de déficit vs pré-vol (marge avant la norme, robuste au bruit de la montre). */
export const VO2_AMBER_DEFICIT_PCT = 8;

/** Rouge sous la norme NASA ; ambre dès 8 % de déficit vs pré-vol [H]. */
export function vo2Color(vo2: number): Color {
  if (!Number.isFinite(vo2)) return 'grey';
  return vo2 < vo2Floor() ? 'red' : (1 - vo2 / VO2_PREFLIGHT) * 100 >= VO2_AMBER_DEFICIT_PCT ? 'amber' : 'green';
}
