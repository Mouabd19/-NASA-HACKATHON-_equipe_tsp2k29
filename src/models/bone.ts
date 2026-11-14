// Propriétaire : Mouad (ROADMAP §7).
// STUB — remplace l'implémentation sans changer la signature.
// Pour l'instant : simple délégation vers src/mocks/ (données factices). Supprime le corps et code le vrai module.
import { BONE_THRESHOLD, lossPct } from '../mocks';

export type BoneSite = 'hanche' | 'femur' | 'rachis';

/** Perte osseuse estimée (%) vs pré-vol. adherence : 0 = rythme actuel, 1 = avec le plan. */
export function boneLossPct(site: BoneSite, day: number, adherence = 0): number {
  return lossPct(site, day, adherence) as number;
}
/** Seuil NASA V1 4027 (% du pré-vol) pour un site. */
export function boneThresholdPct(site: BoneSite): number {
  return BONE_THRESHOLD[site];
}
