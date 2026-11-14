// Propriétaire : Steve (ROADMAP §7).
// STUB — remplace l'implémentation sans changer la signature.
// Pour l'instant : simple délégation vers src/mocks/ (données factices). Supprime le corps et code le vrai module.
import type { OrganId, OrganSummary } from '../types';
import { mockSummary } from '../mocks';

/** Synthèse IA (générée au sol, hors ligne) du jour clé le plus proche. null si l'organe n'est pas modélisé. */
export function getSummary(organId: OrganId, day: number): OrganSummary | null {
  return mockSummary(organId, day);
}

/**
 * (ajout hors contrat §7) Origine du texte : 'gabarit' = texte à trous calculé dans le navigateur (mock),
 * 'ia-sol' = vraie synthèse IA hors ligne lue dans public/data/summaries/. À passer à 'ia-sol' avec le vrai module.
 */
export const SUMMARY_SOURCE: 'gabarit' | 'ia-sol' = 'gabarit';

/** (ajout hors contrat §7) Synthèse selon l'adhérence au plan (0 = rythme actuel, 1 = avec le plan ; ne diffère qu'après J94). */
export function getSummaryPlan(organId: OrganId, day: number, adherence: number): OrganSummary | null {
  return mockSummary(organId, day, adherence);
}
