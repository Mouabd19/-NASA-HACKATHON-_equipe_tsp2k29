// Propriétaire : Mouad (ROADMAP §7). Signatures du contrat : ne pas les changer.
// Données SIMULÉES de Haddad (scripts/generate-sim.ts → public/data/sim/) interprétées par les modèles (./body.ts).
import type { BloodTest, CheckIn, DayBody, Measurement } from '../types.ts';
import { todayCheckIn } from '../ingest/checkin.ts';
import { DAY_TODAY } from './persona.ts';
import { bodyFor } from './body.ts';
import { analyteMetaSim, getBloodTestsSim, getCheckInSim, getWatchSeriesSim, type AnalyteMeta } from './loadSim.ts';

/** Corps du jour. Tout jour 0..860 (borné, arrondi) ; > J94 → projected: true, source: 'projection' (rythme actuel). Mémoïsé. */
export function getDayBody(day: number): DayBody {
  return bodyFor(day, 0);
}

/** Jours mesurés (0..94). */
export function getDays(): number[] {
  return Array.from({ length: DAY_TODAY + 1 }, (_, i) => i);
}

/** Analyses biologiques (capillaire hebdo + calcium urinaire quotidien), toutes ou pour un analyte. */
export function getBloodTests(analyte?: string): BloodTest[] {
  return getBloodTestsSim(analyte);
}

/** Série quotidienne de la montre (simulée ; la fusion avec l'export réel d'Ahmed viendra dim. 08:00). */
export function getWatchSeries(type: Measurement['type']): Measurement[] {
  return getWatchSeriesSim(type);
}

/** (v3.2) Check-in du jour : saisi s'il existe (todayCheckIn d'Ahmed), sinon simulé ; null hors J0..J94. */
export function getCheckIn(day: number): CheckIn | null {
  if (!Number.isInteger(day) || day < 0 || day > DAY_TODAY) return null;
  const manual = todayCheckIn();
  if (manual && manual.day === day) return manual;
  return getCheckInSim(day);
}

// --- Ajouts hors contrat §7 utilisés par les pages -----------------------------------------------

/** Corps du jour selon l'adhérence au plan (0 = rythme actuel, 1 = avec le plan ; ne diffère qu'après J94). */
export function getDayBodyPlan(day: number, adherence: number): DayBody {
  return bodyFor(day, adherence);
}

/** Libellé français, unité, référence et cadence d'un analyte (pour le panneau sang). */
export function getAnalyteMeta(analyte: string): AnalyteMeta | null {
  return analyteMetaSim(analyte);
}
export type { AnalyteMeta };
