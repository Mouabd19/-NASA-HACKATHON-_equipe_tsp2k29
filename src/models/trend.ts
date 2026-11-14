// Propriétaire : Mouad (ROADMAP §7).
// STUB — remplace l'implémentation sans changer la signature.
// Pour l'instant : simple délégation vers src/mocks/ (données factices). Supprime le corps et code le vrai module.
import type { OrganId } from '../types';
import { mockTrend7d } from '../mocks';

/** (v3.2) Pente des 7 derniers jours d'une métrique, en %/semaine. null si indisponible. */
export function trend7d(organId: OrganId, metricKey: string, day: number): number | null {
  return mockTrend7d(organId, metricKey, day);
}
