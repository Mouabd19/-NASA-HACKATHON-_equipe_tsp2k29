// Propriétaire : Mouad (ROADMAP §7).
// STUB — remplace l'implémentation sans changer la signature.
// Pour l'instant : simple délégation vers src/mocks/ (données factices). Supprime le corps et code le vrai module.
import type { TriageResult } from '../types';
import { mockTriage } from '../mocks';

export function triage(day: number): TriageResult {
  return mockTriage(day);
}
