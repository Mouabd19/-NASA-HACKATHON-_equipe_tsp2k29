// Propriétaire : Ahmed (ROADMAP §7).
// STUB — remplace l'implémentation sans changer la signature.
// Pour l'instant : simple délégation vers src/mocks/ (données factices). Supprime le corps et code le vrai module.
import type { Measurement } from '../types';
import { mockLatestLive } from '../mocks';

/** Dernière mesure en direct. Stub : dernière valeur SIMULÉE (source: 'simulated'), aucun appel réseau. */
export function latestLive(type: Measurement['type']): Promise<Measurement | null> {
  return mockLatestLive(type);
}
