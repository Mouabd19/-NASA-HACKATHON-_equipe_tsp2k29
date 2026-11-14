// Propriétaire : Ahmed (ROADMAP §7).
// STUB — remplace l'implémentation sans changer la signature.
// Pour l'instant : simple délégation vers src/mocks/ (données factices). Supprime le corps et code le vrai module.
import type { Baseline, Measurement } from '../types';
import { mockBaseline30d } from '../mocks';

export function baseline30d(ms: Measurement[], type: Measurement['type']): Baseline {
  return mockBaseline30d(ms, type);
}
