// Propriétaire : Mouad (ROADMAP §7).
// STUB — remplace l'implémentation sans changer la signature.
// Pour l'instant : simple délégation vers src/mocks/ (données factices). Supprime le corps et code le vrai module.
import type { Reasoning } from '../types';
import { mockExplain } from '../mocks';

/** Chaîne donnée → modèle → norme → décision d'un item de la to-do. */
export function explain(reasoningId: string): Reasoning {
  return mockExplain(reasoningId);
}
