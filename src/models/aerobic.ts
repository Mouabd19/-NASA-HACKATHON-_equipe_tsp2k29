// Propriétaire : Mouad (ROADMAP §7).
// STUB — remplace l'implémentation sans changer la signature.
// Pour l'instant : simple délégation vers src/mocks/ (données factices). Supprime le corps et code le vrai module.
import { VO2_PREFLIGHT, vo2DeficitPct, vo2max } from '../mocks';

/** VO₂max (ml/kg/min) au jour donné. adherence : 0 = rythme actuel, 1 = avec le plan. */
export function vo2maxAt(day: number, adherence = 0): number {
  return vo2max(day, adherence);
}
/** Déficit de VO₂max (%) par rapport au pré-vol. */
export function vo2DeficitAt(day: number, adherence = 0): number {
  return vo2DeficitPct(day, adherence);
}
export const VO2_PREFLIGHT_ML_KG_MIN = VO2_PREFLIGHT;
