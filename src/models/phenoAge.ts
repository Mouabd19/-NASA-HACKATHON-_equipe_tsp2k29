// Propriétaire : Mouad (ROADMAP §7).
// STUB — remplace l'implémentation sans changer la signature.
// Pour l'instant : simple délégation vers src/mocks/ (données factices). Supprime le corps et code le vrai module.
import type { PhenoAgeResult } from '../types';
import { mockPhenoAge } from '../mocks';

/** (v3.2) PhenoAge [Publié] sur le dernier prélèvement ≤ day. */
export function phenoAge(day: number): PhenoAgeResult | null {
  return mockPhenoAge(day);
}
