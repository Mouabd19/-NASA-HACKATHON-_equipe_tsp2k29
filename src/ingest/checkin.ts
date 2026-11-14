// Propriétaire : Ahmed (ROADMAP §7).
// STUB — remplace l'implémentation sans changer la signature.
// Pour l'instant : simple délégation vers src/mocks/ (données factices). Supprime le corps et code le vrai module.
import type { CheckIn } from '../types';
import { mockSaveCheckIn, mockTodayCheckIn } from '../mocks';

/** (v3.2) Le check-in saisi en démo remplace le simulé du jour (getCheckIn le renvoie ensuite). */
export function saveCheckIn(c: CheckIn): void {
  mockSaveCheckIn(c);
}
export function todayCheckIn(): CheckIn | null {
  return mockTodayCheckIn();
}
