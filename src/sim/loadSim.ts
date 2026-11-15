// Accès aux mesures brutes simulées (public/data/sim/, produites par scripts/generate-sim.ts).
// Les JSON sont chargés à la compilation (import.meta.glob eager) : tout est synchrone et hors ligne.
// Le corps du jour (interprétation par les modèles) est construit dans ./body.ts.
import type { BloodTest, CheckIn, Measurement } from '../types.ts';
import type { ScanSeries, Series, SimMeta } from './generate.ts';

const files = import.meta.glob('../../public/data/sim/*.json', { eager: true, import: 'default' }) as Record<string, unknown>;
const file = <T>(name: string, fallback: T): T => (files[`../../public/data/sim/${name}`] as T | undefined) ?? fallback;

export const META = file<SimMeta | null>('meta.json', null);
export const SCAN = file<Partial<ScanSeries>>('scan.json', {});
const BLOOD = file<BloodTest[]>('blood.json', []);
const URINE = file<BloodTest[]>('urine.json', []);
const CHECKINS = file<CheckIn[]>('checkins.json', []);
const WATCH = file<Measurement[]>('watch.json', []);

/** Dernière valeur mesurée ≤ day (scans hebdo, prélèvements). undefined avant la première mesure. */
export function lastAt(s: Series | undefined, day: number): number | undefined {
  let v: number | undefined;
  for (const p of s ?? []) { if (p.day <= day) v = p.value; else break; }
  return v;
}

/** Prélèvement capillaire hebdo + urine quotidienne. Triés par jour. */
export function getBloodTestsSim(analyte?: string): BloodTest[] {
  const all = [...BLOOD, ...URINE];
  return (analyte ? all.filter(b => b.analyte === analyte) : all).sort((a, b) => a.day - b.day);
}

/** Série simulée de la montre de Haddad (une mesure par jour, J0 → J94). */
export function getWatchSeriesSim(type: Measurement['type']): Measurement[] {
  return WATCH.filter(m => m.type === type);
}

/** Série de la montre indexée par jour de mission. */
export function watchByDay(type: Measurement['type']): Series {
  return getWatchSeriesSim(type).map((m, day) => ({ day, value: m.value }));
}

/** Check-in simulé du jour (J0 → J94), null sinon. */
export function getCheckInSim(day: number): CheckIn | null {
  return CHECKINS.find(c => c.day === day) ?? null;
}

// --- Métadonnées d'affichage des analytes (panneau sang) ---------------------------------------
export interface AnalyteMeta {
  analyte: string; label: string; unit: string; refLow: number; refHigh: number; digits: number;
  cadence: 'hebdo' | 'quotidien';
}
const LABELS: Record<string, [string, number]> = {
  hemoglobine: ['Hemoglobin', 1], hematocrite: ['Hematocrit', 1], leucocytes: ['White blood cells', 1],
  lymphocytes_pct: ['Lymphocytes', 1], vgm: ['MCV', 1], idr: ['RDW', 1], crp: ['CRP', 1], calcium: ['Calcium', 2],
  vitamine_d: ['Vitamin D', 0], creatinine: ['Creatinine', 0], albumine: ['Albumin', 1],
  phosphatases_alcalines: ['Alkaline phosphatase', 0], glucose: ['Glucose', 1], cortisol: ['Cortisol', 0],
  calcium_urinaire: ['Urinary calcium', 0], urine_ctx: ['Urinary CTX (bone resorption)', 0],
};

export function analyteMetaSim(analyte: string): AnalyteMeta | null {
  const b = getBloodTestsSim(analyte)[0];
  if (!b) return null;
  const [label, digits] = LABELS[analyte] ?? [analyte, 1];
  return {
    analyte, label, unit: b.unit, refLow: b.refLow, refHigh: b.refHigh, digits,
    cadence: URINE.some(u => u.analyte === analyte) ? 'quotidien' : 'hebdo',
  };
}
