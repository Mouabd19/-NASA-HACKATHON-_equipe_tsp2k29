// Propriétaire : Mouad (ROADMAP §7).
// STUB — remplace l'implémentation sans changer la signature.
// Pour l'instant : simple délégation vers src/mocks/ (données factices). Supprime le corps et code le vrai module.
import type { TodoItem } from '../types';
import { mockPlanDay } from '../mocks';

export function planDay(day: number): TodoItem[] {
  return mockPlanDay(day);
}
