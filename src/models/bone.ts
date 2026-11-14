// Modèle `bone` : perte de densité osseuse ESTIMÉE (pas mesurée par le scanner).
// Recalé sur le bilan au sol (J0 = 100 % du pré-vol) ; suivi quotidien par les marqueurs urinaires.
// Calé sur les chiffres de la roadmap §7 : hanche 1,99 % à J94, 8,70 % à J860 (rythme), 4,22 % (plan).
// Norme : densité ≥ 95 % du pré-vol, col du fémur ≥ 90 % [NASA V1 4027].
import { fitSaturating, withPlan } from './curves.ts';
import { DAY_TODAY } from '../sim/persona.ts';

export type BoneSite = 'hanche' | 'femur' | 'rachis';

const HIP = fitSaturating(94, 1.99, 860, 8.70);
const PLAN_FACTOR = (4.22 - 1.99) / (8.70 - 1.99);
/** Vitesse relative de chaque site vs la hanche [H]. */
const SITE_FACTOR: Record<BoneSite, number> = { hanche: 1, femur: 1.1, rachis: 0.5 };
/** Seuil rouge NASA en % du pré-vol [NASA V1 4027]. */
export const BONE_RED: Record<BoneSite, number> = { hanche: 95, femur: 90, rachis: 95 };
export const BONE_STANDARD = 'V1 4027';
/** Incertitude relative de la projection (±) [H]. */
const BAND_REL = 0.25;

/** Perte en % du pré-vol. adherence : 0 = rythme actuel, 1 = plan suivi (interpolation linéaire). */
export function boneLossPct(site: BoneSite, day: number, adherence = 0): number {
  const factor = 1 - adherence * (1 - PLAN_FACTOR);
  return SITE_FACTOR[site] * withPlan(HIP, day, DAY_TODAY, factor);
}

/** Bande d'incertitude sur la perte : nulle jusqu'à aujourd'hui, croît avec l'horizon. */
export function boneLossBand(site: BoneSite, day: number, adherence = 0): [number, number] {
  const loss = boneLossPct(site, day, adherence);
  if (day <= DAY_TODAY) return [loss, loss];
  const extra = loss - boneLossPct(site, DAY_TODAY, adherence);
  return [loss - BAND_REL * extra, loss + BAND_REL * extra];
}

export function boneDensityPct(site: BoneSite, day: number, adherence = 0): number {
  return 100 - boneLossPct(site, day, adherence);
}

// --- Alias attendu par les pages (stub de Walid, §7) ----------------------------------------
/** Seuil NASA V1 4027 (% du pré-vol) pour un site. */
export const boneThresholdPct = (site: BoneSite): number => BONE_RED[site];
