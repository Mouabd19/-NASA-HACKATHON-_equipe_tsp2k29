// Propriétaire : Mouad (ROADMAP §7).
// STUB — remplace l'implémentation sans changer la signature.
// Pour l'instant : simple délégation vers src/mocks/ (données factices). Supprime le corps et code le vrai module.
import type { BloodTest, CheckIn, DayBody, Measurement } from '../types';
import { analyteMeta, mockBloodTests, mockCheckIn, mockDayBody, mockDays, mockWatchSeries } from '../mocks';
import type { AnalyteMeta } from '../mocks';

/** Corps du jour. Tout jour 0..860 ; > J94 → projected: true, source: 'projection' (rythme actuel). Mémoïsé. */
export function getDayBody(day: number): DayBody {
  return mockDayBody(day);
}

/** Jours mesurés (0..94). */
export function getDays(): number[] {
  return mockDays();
}

/** Analyses biologiques (capillaire hebdo + calcium urinaire quotidien), toutes ou pour un analyte. */
export function getBloodTests(analyte?: string): BloodTest[] {
  return mockBloodTests(analyte);
}

/** Série quotidienne de la montre (simulée tant que l'export réel n'est pas branché). */
export function getWatchSeries(type: Measurement['type']): Measurement[] {
  return mockWatchSeries(type);
}

/** (v3.2) Check-in du jour : saisi s'il existe, sinon simulé ; null hors J0..J94. */
export function getCheckIn(day: number): CheckIn | null {
  return mockCheckIn(day);
}

// --- Ajouts hors contrat §7 (non cassants, à garder ou à supprimer) ---------------------------

/** Corps du jour selon l'adhérence au plan (0 = rythme actuel, 1 = avec le plan ; ne diffère qu'après J94). */
export function getDayBodyPlan(day: number, adherence: number): DayBody {
  return mockDayBody(day, adherence);
}

/** Libellé français, unité, référence et cadence d'un analyte (pour le panneau sang). */
export function getAnalyteMeta(analyte: string): AnalyteMeta | null {
  return analyteMeta(analyte);
}
export type { AnalyteMeta };
