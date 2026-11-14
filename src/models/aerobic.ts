// Modèle `aerobic` : VO₂max en vol.
// Calé sur la roadmap §7 : déficit 10,84 % à J94 ; à Sol 0, 36,5 (rythme actuel) / 37,3 (plan).
// Normes : VO₂max ≥ 80 % du pré-vol et ≥ 36,5 ml/kg/min [NASA V1 4003/4002].
import { fitSaturating, withPlan } from './curves.ts';
import { DAY_SOL0, DAY_TODAY } from '../sim/persona.ts';

/** VO₂max pré-vol de Haddad [Persona], PROVISOIRE (à confirmer par la fiche §7). */
export const VO2_PREFLIGHT = 44.0;
export const VO2_MIN_ABS = 36.5;          // [NASA V1 4002]
export const VO2_MIN_REL = 0.80;          // [NASA V1 4003]
export const VO2_STANDARD = 'V1 4003/4002';

const deficitAt = (vo2: number) => (1 - vo2 / VO2_PREFLIGHT) * 100;
const CURVE = fitSaturating(DAY_TODAY, 10.84, DAY_SOL0, deficitAt(36.5));
const PLAN_FACTOR = (deficitAt(37.3) - 10.84) / (deficitAt(36.5) - 10.84);
const BAND_REL = 0.25;

/** Déficit de VO₂max vs pré-vol, en %. */
export function vo2DeficitPct(day: number, adherence = 0): number {
  const factor = 1 - adherence * (1 - PLAN_FACTOR);
  return withPlan(CURVE, day, DAY_TODAY, factor);
}

export function vo2max(day: number, adherence = 0): number {
  return VO2_PREFLIGHT * (1 - vo2DeficitPct(day, adherence) / 100);
}

export function vo2DeficitBand(day: number, adherence = 0): [number, number] {
  const d = vo2DeficitPct(day, adherence);
  if (day <= DAY_TODAY) return [d, d];
  const extra = d - vo2DeficitPct(DAY_TODAY, adherence);
  return [d - BAND_REL * extra, d + BAND_REL * extra];
}

/** Seuil effectif : le plus exigeant des deux normes. */
export function vo2Floor(): number {
  return Math.max(VO2_MIN_ABS, VO2_MIN_REL * VO2_PREFLIGHT);
}

// --- Alias attendus par les pages (stub de Walid, §7) ---------------------------------------
/** VO₂max (ml/kg/min) au jour donné. adherence : 0 = rythme actuel, 1 = avec le plan. */
export const vo2maxAt = (day: number, adherence = 0): number => vo2max(day, adherence);
/** Déficit de VO₂max (%) par rapport au pré-vol. */
export const vo2DeficitAt = (day: number, adherence = 0): number => vo2DeficitPct(day, adherence);
export const VO2_PREFLIGHT_ML_KG_MIN = VO2_PREFLIGHT;
