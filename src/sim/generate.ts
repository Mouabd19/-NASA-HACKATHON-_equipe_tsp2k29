// Générateur de la mission simulée de Haddad, J0 → J94 (SIMULÉ, graine fixe).
// Fonction pure : generateSim(seed) → données. Le script scripts/generate-sim.ts les écrit dans public/data/sim/.
//
// Règle v3.2 : le scanner (échographie) ne mesure QUE muscles, fluides, reins, nerf optique et cœur.
// L'os vient du modèle `bone` (étiquette [H]), jamais du scanner.
import type { BloodTest, CheckIn, Measurement, OrganId, Tag } from '../types.ts';
import { createRng, type Rng } from './rng.ts';
import { CHRONO_AGE_J0, DAY_TODAY, PERSONA, SIM_SEED, SIM_VERSION, chronoAge, dayToDate } from './persona.ts';
import { muscleLossPct, type MuscleSite } from '../models/muscle.ts';
import { vo2max } from '../models/aerobic.ts';
import { computePhenoAge, type PhenoAgeMarkers } from '../models/phenoAgeFormula.ts';
import { round } from '../models/stats.ts';

export interface SimMeta {
  seed: number;
  version: string;
  persona: typeof PERSONA;
  days: [number, number];
  phenoAgeTarget: { day: number; value: number };
  notes: string[];
}

/** Séries brutes du scanner et des appareils de bord, une valeur par jour de mesure. */
export type Series = { day: number; value: number }[];
export type ScanSeries = Record<
  'cuisse' | 'mollet' | 'paravertebraux' | 'volume_jambes' | 'epaisseur_tissus_front' | 'gaine_nerf_optique'
  | 'fraction_ejection' | 'taille' | 'calculs' | 'tension_sys' | 'tension_dia' | 'pvt', Series>;

export interface SimData {
  meta: SimMeta;
  scan: ScanSeries;
  blood: BloodTest[];
  urine: BloodTest[];
  checkins: CheckIn[];
  watch: Measurement[];
}

const DAYS = Array.from({ length: DAY_TODAY + 1 }, (_, d) => d);
const SCAN_WEEKLY = (d: number) => d % 7 === 0;
const BLOOD_DAYS = DAYS.filter(d => d % 7 === 0);         // J0, J7 … J91
const PHENOAGE_TARGET = { day: 91, value: 43.1 };        // mock roadmap §7
const SIM_TAG: Tag = 'Persona';
const MUSCLE_NOISE = 0.03;   // point de % vs J0, écart-type par mesure
const VO2_NOISE = 0.03;      // ml/kg/min, écart-type par mesure

const ramp = (d: number, end = DAY_TODAY) => Math.min(1, Math.max(0, d / end));
const sat = (d: number, tau: number) => 1 - Math.exp(-d / tau);

function series(rng: Rng, days: number[], base: (d: number) => number, sd: number, digits = 2): Series {
  return days.map(day => ({ day, value: round(base(day) + rng.gauss(sd), digits) }));
}

// ---------------------------------------------------------------------------------------------
// Séries brutes
// ---------------------------------------------------------------------------------------------

function scannerSeries(rng: Rng): ScanSeries {
  // Bruit [H] : volume musculaire = moyenne de plusieurs coupes du scan du jour → ±0,03 point.
  // Assez bas pour que la tendance 7 j sorte nettement du bruit (cuisse ≈ −0,39 %/sem ± 0,04).
  const muscle = (site: MuscleSite) => series(rng, DAYS, d => -muscleLossPct(site, d), MUSCLE_NOISE);
  return {
    cuisse: muscle('cuisse'),
    mollet: muscle('mollet'),
    paravertebraux: muscle('paravertebraux'),
    volume_jambes: series(rng, DAYS, d => -11 * sat(d, 2), 0.4),
    epaisseur_tissus_front: series(rng, DAYS, d => 6.0 + 0.7 * sat(d, 2), 0.08),
    gaine_nerf_optique: series(rng, DAYS, d => 4.9 + 0.7 * ramp(d) ** 0.8, 0.06),
    fraction_ejection: series(rng, DAYS.filter(SCAN_WEEKLY), d => 62 - 2.5 * ramp(d), 0.8, 1),
    taille: series(rng, DAYS.filter(SCAN_WEEKLY), d => 100 - 5 * ramp(d), 0.3, 1),     // masse du VG, % vs J0
    calculs: DAYS.filter(SCAN_WEEKLY).map(day => ({ day, value: 0 })),
    tension_sys: series(rng, DAYS, d => 118 + 5 * ramp(d), 2, 0),                      // brassard, mmHg
    tension_dia: series(rng, DAYS, d => 76 + 2 * ramp(d), 1.5, 0),
    pvt: series(rng, DAYS, d => 262 + 20 * ramp(d), 8, 0),                              // vigilance, ms
  };
}

function watchSeries(rng: Rng): Measurement[] {
  const defs: { type: Measurement['type']; unit: string; base: (d: number) => number; sd: number; clamp?: [number, number]; digits?: number }[] = [
    { type: 'RestingHeartRate', unit: 'count/min', base: d => 57 + 5 * ramp(d), sd: 1.5 },
    { type: 'HeartRateVariabilitySDNN', unit: 'ms', base: d => 58 - 11 * ramp(d), sd: 5 },
    // La montre lisse son estimation de VO₂max sur plusieurs jours → bruit quotidien faible [H].
    { type: 'VO2Max', unit: 'mL/min·kg', base: d => vo2max(d), sd: VO2_NOISE, digits: 2 },
    { type: 'OxygenSaturation', unit: '%', base: () => 98.2, sd: 0.6, clamp: [97, 99] },
    { type: 'AppleSleepingWristTemperature', unit: 'degC', base: d => 35.6 + 0.15 * ramp(d), sd: 0.15 },
    { type: 'SleepAnalysis', unit: 'hr', base: d => 7.1 - 0.7 * ramp(d), sd: 0.4 },
  ];
  const out: Measurement[] = [];
  for (const day of DAYS) {
    for (const def of defs) {
      let v = def.base(day) + rng.gauss(def.sd);
      if (def.clamp) v = Math.min(def.clamp[1], Math.max(def.clamp[0], v));
      out.push({
        type: def.type, value: round(v, def.digits ?? 1), unit: def.unit,
        date: `${dayToDate(day)}T${def.type === 'SleepAnalysis' ? '06:30' : '07:00'}:00Z`, source: 'simulated',
      });
    }
  }
  return out;
}

const BLOOD_DEFS: { analyte: string; unit: string; j0: number; j91: number; low: number; high: number; sd: number }[] = [
  { analyte: 'hemoglobine', unit: 'g/dL', j0: 15.2, j91: 14.3, low: 13.5, high: 17.5, sd: 0.15 },
  { analyte: 'hematocrite', unit: '%', j0: 45, j91: 42.5, low: 40, high: 52, sd: 0.4 },
  { analyte: 'leucocytes', unit: '10³/µL', j0: 6.2, j91: 6.8, low: 4, high: 10, sd: 0.3 },
  { analyte: 'lymphocytes_pct', unit: '%', j0: 32, j91: 27, low: 20, high: 40, sd: 1 },
  { analyte: 'vgm', unit: 'fL', j0: 89, j91: 90, low: 80, high: 100, sd: 0.5 },
  { analyte: 'idr', unit: '%', j0: 12.6, j91: 13.8, low: 11.5, high: 14.5, sd: 0.1 },
  { analyte: 'calcium', unit: 'mmol/L', j0: 2.38, j91: 2.48, low: 2.2, high: 2.6, sd: 0.02 },
  { analyte: 'vitamine_d', unit: 'nmol/L', j0: 80, j91: 58, low: 50, high: 125, sd: 2 },
  { analyte: 'creatinine', unit: 'µmol/L', j0: 82, j91: 88, low: 60, high: 110, sd: 2 },
  { analyte: 'albumine', unit: 'g/L', j0: 45, j91: 42, low: 35, high: 50, sd: 0.5 },
  { analyte: 'phosphatases_alcalines', unit: 'U/L', j0: 68, j91: 82, low: 40, high: 130, sd: 2 },
  { analyte: 'glucose', unit: 'mmol/L', j0: 5.0, j91: 5.4, low: 3.9, high: 6.1, sd: 0.1 },
  { analyte: 'cortisol', unit: 'nmol/L', j0: 380, j91: 470, low: 140, high: 690, sd: 15 },
];
const CRP = { analyte: 'crp', unit: 'mg/L', j0: 0.6, low: 0, high: 5 };

function bloodTests(rng: Rng): BloodTest[] {
  const out: BloodTest[] = [];
  for (const def of BLOOD_DEFS) {
    for (const day of BLOOD_DAYS) {
      const v = def.j0 + (def.j91 - def.j0) * ramp(day, 91) + rng.gauss(def.sd);
      out.push({ day, analyte: def.analyte, value: round(v, 2), unit: def.unit, refLow: def.low, refHigh: def.high, tag: SIM_TAG });
    }
  }
  // CRP : bruit multiplicatif tiré d'abord, puis valeur finale calibrée pour PhenoAge(J91) = 43,1 (mock).
  const crpNoise = BLOOD_DAYS.map(() => Math.exp(rng.gauss(0.1)));
  const crpAt = (end: number) => BLOOD_DAYS.map((day, i) => round((CRP.j0 + (end - CRP.j0) * ramp(day, 91)) * crpNoise[i], 2));
  const markersJ91 = (crp: number): PhenoAgeMarkers => {
    const get = (a: string) => out.find(b => b.day === PHENOAGE_TARGET.day && b.analyte === a)!.value;
    return {
      albumine: get('albumine'), creatinine: get('creatinine'), glucose: get('glucose'), crp,
      lymphocytes_pct: get('lymphocytes_pct'), vgm: get('vgm'), idr: get('idr'), pal: get('phosphatases_alcalines'), leucocytes: get('leucocytes'),
    };
  };
  const ageJ91 = chronoAge(PHENOAGE_TARGET.day);
  let lo = 0.05, hi = 100;
  for (let i = 0; i < 100; i++) {
    const mid = Math.sqrt(lo * hi);
    const crp91 = crpAt(mid)[BLOOD_DAYS.length - 1];
    if (computePhenoAge(markersJ91(crp91), ageJ91) < PHENOAGE_TARGET.value) lo = mid; else hi = mid;
  }
  const crpValues = crpAt(Math.sqrt(lo * hi));
  BLOOD_DAYS.forEach((day, i) =>
    out.push({ day, analyte: CRP.analyte, value: crpValues[i], unit: CRP.unit, refLow: CRP.low, refHigh: CRP.high, tag: SIM_TAG }));
  return out.sort((a, b) => a.day - b.day || a.analyte.localeCompare(b.analyte));
}

/** Calcium urinaire (mg/24 h) : monte dès J15–J30 puis plateau (Okada 2022 ; Smith, NASA) [Publié, allure]. */
export const urineCalciumMg = (d: number) => 180 + 90 * sat(d, 30);

function urineTests(rng: Rng): BloodTest[] {
  const out: BloodTest[] = [];
  for (const day of DAYS) {
    out.push({ day, analyte: 'calcium_urinaire', value: round(urineCalciumMg(day) + rng.gauss(12), 0),
      unit: 'mg/24 h', refLow: 100, refHigh: 300, tag: SIM_TAG });
    out.push({ day, analyte: 'urine_ctx', value: round(180 + 140 * sat(day, 30) + rng.gauss(15), 0),
      unit: 'µg/mmol créat.', refLow: 100, refHigh: 300, tag: SIM_TAG });
  }
  return out;
}

function checkIns(rng: Rng): CheckIn[] {
  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Math.round(v)));
  return DAYS.map(day => {
    if (day === DAY_TODAY) {   // mock roadmap §7 : humeur 3, fatigue 3, douleur 1 (bas du dos)
      return { day, mood: 3, fatigue: 3, pain: 1, painZone: 'paravertebraux', sleepFelt: 3, source: 'simulated' } satisfies CheckIn;
    }
    const drift = day > 60 ? (day - 60) / 34 : 0;
    const pain = clamp(rng.next() < 0.15 + 0.25 * drift ? 1 : 0, 0, 3) as CheckIn['pain'];
    return {
      day,
      mood: clamp(4 - 0.8 * drift + rng.gauss(0.5), 1, 5) as CheckIn['mood'],
      fatigue: clamp(2 + 0.8 * drift + rng.gauss(0.5), 1, 5) as CheckIn['fatigue'],
      pain,
      ...(pain > 0 ? { painZone: 'paravertebraux' as OrganId } : {}),
      sleepFelt: clamp(4 - 0.7 * drift + rng.gauss(0.5), 1, 5) as CheckIn['sleepFelt'],
      source: 'simulated',
    };
  });
}

// ---------------------------------------------------------------------------------------------

export function generateSim(seed = SIM_SEED): SimData {
  const rng = createRng(seed);
  const scan = scannerSeries(rng);
  const watch = watchSeries(rng);
  const blood = bloodTests(rng);
  const urine = urineTests(rng);
  const checkins = checkIns(rng);
  return {
    meta: {
      seed, version: SIM_VERSION, persona: PERSONA, days: [0, DAY_TODAY], phenoAgeTarget: PHENOAGE_TARGET,
      notes: [
        `Haddad, ${CHRONO_AGE_J0} ans [Persona]. Toutes les valeurs sont SIMULÉES.`,
        'Le scanner ne mesure que muscles, fluides, reins, nerf optique et cœur ; la densité osseuse vient du modèle bone [H].',
        'CRP calibrée pour PhenoAge(J91) = 43,1 ans (mock roadmap §7).',
      ],
    },
    scan, blood, urine, checkins, watch,
  };
}
