// Propriétaire : Mouad (ROADMAP §7).
// STUB — remplace l'implémentation sans changer la signature.
// Pour l'instant : simple délégation vers src/mocks/ (données factices). Supprime le corps et code le vrai module.
import type { LinkPos, RouterOutput, TriageResult } from '../types';
import { mockRouter } from '../mocks';

/** MAINTENANT ne dépend jamais du lien Terre (pos, delayMin) ; seul ENSUITE en dépend. */
export function router(t: TriageResult, pos: LinkPos, delayMin: number): RouterOutput {
  return mockRouter(t, pos, delayMin);
}
