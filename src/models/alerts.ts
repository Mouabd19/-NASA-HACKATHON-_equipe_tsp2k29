// Propriétaire : Mouad (ROADMAP §7).
// STUB — remplace l'implémentation sans changer la signature.
// Pour l'instant : simple délégation vers src/mocks/ (données factices). Supprime le corps et code le vrai module.
import type { Alert } from '../types';
import { mockAlertsForDay } from '../mocks';

/** Alertes du jour (sur la tendance 7 j, jamais sur un point isolé). Marche aussi sur les jours projetés. */
export function alertsForDay(day: number): Alert[] {
  return mockAlertsForDay(day);
}

// --- Ajout hors contrat §7 (non cassant) -------------------------------------------------------

/** Alertes du jour selon l'adhérence au plan (0 = rythme actuel, 1 = avec le plan ; ne diffère qu'après J94). */
export function alertsForDayPlan(day: number, adherence: number): Alert[] {
  return mockAlertsForDay(day, adherence);
}
