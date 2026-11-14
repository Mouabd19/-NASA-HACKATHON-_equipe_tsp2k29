// Propriétaire : Mouad (ROADMAP §7).
// STUB — remplace l'implémentation sans changer la signature.
// Pour l'instant : simple délégation vers src/mocks/ (données factices). Supprime le corps et code le vrai module.
import { cumulativeDose, dailyDose } from '../mocks';

/** Dose cumulée prévue (mSv) au jour donné : 1,84 mSv/j en croisière [Publié RAD], 0,64 en surface. */
export function cumulativeDoseMSv(day: number): number {
  return cumulativeDose(day);
}
export function dailyDoseMSv(day: number): number {
  return dailyDose(day);
}
