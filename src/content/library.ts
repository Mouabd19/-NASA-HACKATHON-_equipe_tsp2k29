// Propriétaire : Steve (ROADMAP §7).
// STUB — remplace l'implémentation sans changer la signature.
// Pour l'instant : simple délégation vers src/mocks/ (données factices). Supprime le corps et code le vrai module.
import { mockExercise, mockMeal, mockWhyText } from '../mocks';
import type { Exercise, Meal } from '../mocks';

export type { Exercise, Meal };

export function getExercise(id: string): Exercise | null {
  return mockExercise(id);
}
export function getMeal(id: string): Meal | null {
  return mockMeal(id);
}
/** Texte « Pourquoi ? » en langage simple pour une règle ('V1 4027', 'TENDANCE-7J'…). */
export function whyText(rule: string): string {
  return mockWhyText(rule);
}
