// MOCKS (Walid) — analyses biologiques SIMULÉES (ROADMAP §8).
// Micro-prélèvement capillaire HEBDOMADAIRE (J0, J7, … J91) + calcium urinaire QUOTIDIEN.
import type { BloodTest, PhenoAgeResult } from '../types';
import { DAY_TODAY } from './mission';
import { hemoglobin, urineCalcium } from './curves';
import { chronoAge, noise, round } from './util';

export interface AnalyteMeta {
  analyte: string;
  label: string;
  unit: string;
  refLow: number;
  refHigh: number;
  digits: number;
  cadence: 'hebdo' | 'quotidien';
}

interface AnalyteDef extends AnalyteMeta { v0: number; v91: number; amp: number }

export const LAST_DRAW_DAY = Math.floor(DAY_TODAY / 7) * 7; // J91
const s = (d: number) => (1 - Math.exp(-d / 60)) / (1 - Math.exp(-LAST_DRAW_DAY / 60));

// Valeurs de référence terrestres usuelles [Publié — à vérifier par Steve].
const WEEKLY: AnalyteDef[] = [
  { analyte: 'hemoglobine', label: 'Hemoglobin', unit: 'g/dL', refLow: 13.5, refHigh: 17.5, digits: 1, cadence: 'hebdo', v0: 15.2, v91: 14.1, amp: 0.12 },
  { analyte: 'hematocrite', label: 'Hematocrit', unit: '%', refLow: 40, refHigh: 52, digits: 1, cadence: 'hebdo', v0: 45.5, v91: 42.3, amp: 0.4 },
  { analyte: 'leucocytes', label: 'White blood cells', unit: 'G/L', refLow: 4, refHigh: 10, digits: 1, cadence: 'hebdo', v0: 6.2, v91: 6.6, amp: 0.25 },
  { analyte: 'lymphocytes_pct', label: 'Lymphocytes', unit: '%', refLow: 20, refHigh: 40, digits: 1, cadence: 'hebdo', v0: 31, v91: 28, amp: 0.8 },
  { analyte: 'vgm', label: 'MCV', unit: 'fL', refLow: 80, refHigh: 100, digits: 1, cadence: 'hebdo', v0: 89, v91: 90.5, amp: 0.3 },
  { analyte: 'idr', label: 'RDW', unit: '%', refLow: 11.5, refHigh: 14.5, digits: 1, cadence: 'hebdo', v0: 12.8, v91: 13.5, amp: 0.1 },
  { analyte: 'crp', label: 'CRP', unit: 'mg/L', refLow: 0, refHigh: 5, digits: 1, cadence: 'hebdo', v0: 0.9, v91: 1.6, amp: 0.2 },
  { analyte: 'calcium', label: 'Calcium', unit: 'mmol/L', refLow: 2.2, refHigh: 2.6, digits: 2, cadence: 'hebdo', v0: 2.36, v91: 2.48, amp: 0.02 },
  { analyte: 'vitamine_d', label: 'Vitamin D', unit: 'ng/mL', refLow: 30, refHigh: 60, digits: 0, cadence: 'hebdo', v0: 38, v91: 31, amp: 1 },
  { analyte: 'creatinine', label: 'Creatinine', unit: 'µmol/L', refLow: 60, refHigh: 110, digits: 0, cadence: 'hebdo', v0: 82, v91: 86, amp: 2 },
  { analyte: 'albumine', label: 'Albumin', unit: 'g/L', refLow: 35, refHigh: 50, digits: 1, cadence: 'hebdo', v0: 44, v91: 42, amp: 0.5 },
  { analyte: 'phosphatases_alcalines', label: 'Alkaline phosphatase', unit: 'U/L', refLow: 40, refHigh: 130, digits: 0, cadence: 'hebdo', v0: 68, v91: 84, amp: 2 },
  { analyte: 'glucose', label: 'Glucose', unit: 'mmol/L', refLow: 3.9, refHigh: 5.5, digits: 1, cadence: 'hebdo', v0: 4.9, v91: 5.2, amp: 0.1 },
  { analyte: 'cortisol', label: 'Cortisol', unit: 'nmol/L', refLow: 170, refHigh: 540, digits: 0, cadence: 'hebdo', v0: 340, v91: 420, amp: 15 },
];
const URINE: AnalyteMeta = {
  analyte: 'calcium_urinaire', label: 'Urinary calcium', unit: 'mg/24 h', refLow: 100, refHigh: 300, digits: 0, cadence: 'quotidien',
};
export const URINE_CA_NOISE = 12;

export const ANALYTES: AnalyteMeta[] = [...WEEKLY, URINE];

export function analyteMeta(analyte: string): AnalyteMeta | null {
  return ANALYTES.find((a) => a.analyte === analyte) ?? null;
}

/** Valeur mesurée (bruitée) du calcium urinaire quotidien. */
export function urineCalciumMeasured(day: number): number {
  return round(urineCalcium(day) + URINE_CA_NOISE * noise('urine/ca', day), 0);
}

function weeklyValue(def: AnalyteDef, day: number): number {
  const base = def.analyte === 'hemoglobine' ? hemoglobin(day) : def.v0 + (def.v91 - def.v0) * s(day);
  return round(base + def.amp * noise(`blood/${def.analyte}`, day), def.digits);
}

let cache: BloodTest[] | null = null;
function all(): BloodTest[] {
  if (cache) return cache;
  const out: BloodTest[] = [];
  for (let d = 0; d <= DAY_TODAY; d++) {
    if (d % 7 === 0) {
      for (const def of WEEKLY) {
        out.push({ day: d, analyte: def.analyte, value: weeklyValue(def, d), unit: def.unit, refLow: def.refLow, refHigh: def.refHigh, tag: 'Persona' });
      }
    }
    out.push({ day: d, analyte: URINE.analyte, value: urineCalciumMeasured(d), unit: URINE.unit, refLow: URINE.refLow, refHigh: URINE.refHigh, tag: 'Persona' });
  }
  cache = out;
  return out;
}

/** Tous les résultats (triés par jour), ou ceux d'un analyte. */
export function mockBloodTests(analyte?: string): BloodTest[] {
  return analyte ? all().filter((b) => b.analyte === analyte) : all();
}

/** Dernier prélèvement hebdomadaire ≤ day (borné à J91) pour un analyte. */
export function lastDraw(analyte: string, day: number): BloodTest | null {
  const d = Math.min(Math.floor(Math.max(0, day) / 7) * 7, LAST_DRAW_DAY);
  return all().find((b) => b.day === d && b.analyte === analyte) ?? null;
}

const PHENO_J0 = 42.3;
const PHENO_LAST = 43.1; // [mock] PhenoAge à J91 pour 42 ans réels
const PHENO_INPUTS = ['albumine', 'creatinine', 'glucose', 'crp', 'lymphocytes_pct', 'vgm', 'idr', 'phosphatases_alcalines', 'leucocytes'];

/** PhenoAge [Publié — valeur MOCK] calculé sur le dernier prélèvement ≤ day. */
export function mockPhenoAge(day: number): PhenoAgeResult | null {
  if (!(day >= 0)) return null;
  const d = Math.min(Math.floor(day / 7) * 7, LAST_DRAW_DAY);
  const inputs: Record<string, number> = {};
  for (const k of PHENO_INPUTS) inputs[k] = lastDraw(k, d)?.value ?? NaN;
  inputs.age = round(chronoAge(d), 1);
  return {
    day: d,
    phenoAge: round(PHENO_J0 + ((PHENO_LAST - PHENO_J0) * d) / LAST_DRAW_DAY, 1),
    chronoAge: round(chronoAge(d), 1),
    inputs,
    tag: 'Publié',
    mock: true, // la formule de Levine n'est pas encore calculée : interpolation factice
  };
}
