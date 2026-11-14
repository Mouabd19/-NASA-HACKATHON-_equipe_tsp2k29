// Propriétaire : Mouad (ROADMAP §7).
// STUB — remplace l'implémentation sans changer la signature.
// Pour l'instant : simple délégation vers src/mocks/ (données factices). Supprime le corps et code le vrai module.
import type { BioAgePoint, OrganId } from '../types';
import { MODELLED_LOSS_ORGANS, mockBioAgeSeries } from '../mocks';

/** Écart d'âge par organe [H] : mesuré J0–J94 (predicted: false) + prédit jusqu'à J860 (bande qui s'élargit). adherence : 0 = rythme actuel, 1 = avec le plan. */
export function bioAgeSeries(organId: OrganId, adherence: number): BioAgePoint[] {
  return mockBioAgeSeries(organId, adherence);
}

/** (ajout hors contrat §7) true si l'organe a un modèle de perte, donc un écart d'âge [H]. Sinon : « non modélisé », jamais « +0,0 ». */
export function hasBioAgeModel(organId: OrganId): boolean {
  return MODELLED_LOSS_ORGANS.includes(organId);
}
