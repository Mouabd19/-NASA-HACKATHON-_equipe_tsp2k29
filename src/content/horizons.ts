// Propriétaire : Steve (ROADMAP §7).
// STUB — remplace l'implémentation sans changer la signature.
// Pour l'instant : simple délégation vers src/mocks/ (données factices). Supprime le corps et code le vrai module.
import { mockLightTimeMin } from '../mocks';

/** Temps lumière aller simple Terre–Mars en minutes (test : 11,01 le 2026-11-14). */
export function lightTimeMin(date: string): number {
  return mockLightTimeMin(date);
}
