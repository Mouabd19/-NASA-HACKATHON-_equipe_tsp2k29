// Propriétaire : Steve (ROADMAP §7).
// STUB — remplace l'implémentation sans changer la signature.
// Pour l'instant : simple délégation vers src/mocks/ (données factices). Supprime le corps et code le vrai module.
import { mockStandard } from '../mocks';

export function getStandard(id: string): { id: string; title: string; quote: string; url: string; verified: boolean } {
  return mockStandard(id);
}
