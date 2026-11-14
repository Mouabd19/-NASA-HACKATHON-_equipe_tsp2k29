// Accès aux données simulées de Mouad (public/data/sim/, produites par scripts/generate-sim.ts).
// PAS ENCORE BRANCHÉ : src/sim/load.ts délègue toujours aux mocks de Walid, le temps d'aligner la forme
// des données sur tests/mocks.contract.test.ts. Ensuite load.ts réexportera ce module.
import type { BloodTest, CheckIn, DayBody, Measurement } from '../types.ts';
import { DAY_END, DAY_SOL0, DAY_TODAY, chronoAge, dayToDate } from './persona.ts';
import { projectDayBody } from './project.ts';

const files = import.meta.glob('../../public/data/sim/*.json', { eager: true, import: 'default' }) as Record<string, unknown>;
const file = <T>(name: string, fallback: T): T => (files[`../../public/data/sim/${name}`] as T | undefined) ?? fallback;

const DAYS = file<DayBody[]>('days.json', []);
const BLOOD = file<BloodTest[]>('blood.json', []);
const URINE = file<BloodTest[]>('urine.json', []);
const CHECKINS = file<CheckIn[]>('checkins.json', []);
const WATCH = file<Measurement[]>('watch.json', []);
const byDay = new Map(DAYS.map(d => [d.day, d]));

/** Corps vide : tous les organes inconnus, statut gris (jamais vert par défaut). */
function unknownBody(day: number): DayBody {
  const age = Math.round(chronoAge(day) * 100) / 100;
  const ref = byDay.get(DAY_TODAY);
  return {
    day, date: dayToDate(day), projected: day > DAY_TODAY, source: day > DAY_TODAY ? 'projection' : 'scan-midjourney-sim',
    organs: (ref?.organs ?? []).map(o => ({ ...o, metrics: [], status: 'grey', chronoAge: age, bioAge: age })),
  };
}

/** J0–J94 : corps mesuré (SIMULÉ). Au-delà : corps projeté au rythme actuel ([H]). */
export function getDayBody(day: number): DayBody {
  const measured = byDay.get(day);
  if (measured) return measured;
  const today = byDay.get(DAY_TODAY);
  if (day > DAY_TODAY && day <= DAY_END && today) return projectDayBody(today, day);
  return unknownBody(day);
}

/** Jours de la timeline : J0 → J94 (un par jour), puis la projection (une par semaine, + Sol 0 et J860). */
export function getDays(): number[] {
  const measured = DAYS.map(d => d.day);
  const projected: number[] = [];
  for (let d = DAY_TODAY + 7; d < DAY_END; d += 7) projected.push(d);
  return [...new Set([...measured, ...projected, DAY_SOL0, DAY_END])].sort((a, b) => a - b);
}

/** Prélèvement capillaire hebdo + urine quotidienne (analytes `urine_*`). Triés par jour. */
export function getBloodTests(analyte?: string): BloodTest[] {
  const all = [...BLOOD, ...URINE];
  return (analyte ? all.filter(b => b.analyte === analyte) : all).sort((a, b) => a.day - b.day);
}

/** Série simulée de la montre de Haddad. (Dim. 08:00 : fusion avec les vraies mesures, getRealSeries d'Ahmed.) */
export function getWatchSeries(type: Measurement['type']): Measurement[] {
  return WATCH.filter(m => m.type === type);
}

/** Check-in simulé du jour (le check-in saisi en démo est géré par Ahmed : todayCheckIn()). */
export function getCheckIn(day: number): CheckIn | null {
  return CHECKINS.find(c => c.day === day) ?? null;
}

