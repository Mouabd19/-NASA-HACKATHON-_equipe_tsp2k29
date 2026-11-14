// Propriétaire : Steve (ROADMAP §7).
// STUB — remplace l'implémentation sans changer la signature.
// Pour l'instant : simple délégation vers src/mocks/ (données factices). Supprime le corps et code le vrai module.
import type { OrganId, OrganSummary } from '../types';
import { mockSummary } from '../mocks';

/** Synthèse IA (générée au sol, hors ligne) du jour clé le plus proche. null si l'organe n'est pas modélisé. */
export function getSummary(organId: OrganId, day: number): OrganSummary | null {
  return mockSummary(organId, day);
}
