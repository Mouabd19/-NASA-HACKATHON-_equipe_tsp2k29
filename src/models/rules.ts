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
