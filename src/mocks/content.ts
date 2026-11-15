// MOCKS (Walid) — contenus factices : normes, délai radio, synthèses par organe, bibliothèque.
// Aucune citation de norme n'est verbatim : `verified: false` tant que Steve n'a pas vérifié le PDF.
import type { DayBody, Metric, OrganId, OrganState, OrganSummary } from '../types';
import { DAY_END, DAY_SOL0, DAY_TODAY } from './mission';
import { lossPct, VO2_SOL0, vo2max } from './curves';
import { mockDayBody } from './body';
import { dayOfDate, fr, round } from './util';

// --- Normes ---------------------------------------------------------------------------------
export const NASA_STD_3001_URL =
  'https://standards.nasa.gov/sites/default/files/standards/NASA/C//nasa-std-3001-vol-1-rev-c-signature.pdf';

export interface Standard { id: string; title: string; quote: string; url: string; verified: boolean }

const STANDARDS: Record<string, Standard> = {
  'V1 4027': {
    id: 'V1 4027',
    title: 'NASA-STD-3001 Vol. 1 Rev. C — [V1 4027] In-mission bone mineral density',
    quote: 'Summary (to be verified against the PDF): bone mass must stay ≥ 95% of the preflight value at the hip and ≥ 90% at the femoral neck.',
    url: NASA_STD_3001_URL,
    verified: false,
  },
  'V1 4003': {
    id: 'V1 4003',
    title: 'NASA-STD-3001 Vol. 1 Rev. C — [V1 4003] In-mission aerobic capacity',
    quote: 'Summary (to be verified against the PDF): in-flight aerobic capacity must be maintained at ≥ 80% of the preflight value.',
    url: NASA_STD_3001_URL,
    verified: false,
  },
  'V1 4002': {
    id: 'V1 4002',
    title: 'NASA-STD-3001 Vol. 1 Rev. C — [V1 4002] Minimum aerobic capacity',
    quote: 'Summary (to be verified against the PDF): VO₂max ≥ 36.5 ml/kg/min for demanding tasks (EVA, surface operations).',
    url: NASA_STD_3001_URL,
    verified: false,
  },
};

export function mockStandard(id: string): Standard {
  return STANDARDS[id.trim()] ?? {
    id, title: `Standard ${id} — not referenced`, quote: 'Reference missing from the local database (to be completed).', url: NASA_STD_3001_URL, verified: false,
  };
}
export const STANDARD_IDS = Object.keys(STANDARDS);

// --- Délai radio Terre–Mars -----------------------------------------------------------------
// Table figée (sera remplacée par horizons.json, JPL Horizons). Entre deux points : modèle circulaire
// coplanaire recalé pour donner exactement 11,01 min le 2026-11-14 [mock].
const LIGHT_TABLE: Record<string, number> = { '2026-11-14': 11.01 };
const AU_LIGHT_MIN = 8.3167;
const SYNODIC_DAYS = 779.94;
const OPPOSITION = '2027-02-19';
const MARS_AU = 1.524;
const circular = (date: string) => {
  const days = (Date.parse(`${date.slice(0, 10)}T00:00:00Z`) - Date.parse(`${OPPOSITION}T00:00:00Z`)) / 86_400_000;
  const theta = (2 * Math.PI * days) / SYNODIC_DAYS;
  return AU_LIGHT_MIN * Math.sqrt(1 + MARS_AU ** 2 - 2 * MARS_AU * Math.cos(theta));
};
const CALIB = LIGHT_TABLE['2026-11-14'] / circular('2026-11-14');

/** Temps lumière aller simple Terre–Mars, en minutes. */
export function mockLightTimeMin(date: string): number {
  const key = date.slice(0, 10);
  if (LIGHT_TABLE[key] !== undefined) return LIGHT_TABLE[key];
  const v = circular(key) * CALIB;
  return Number.isFinite(v) ? round(v, 2) : NaN;
}

/** 'table' si la date est tabulée, sinon 'approx' (orbite circulaire recalée — hypothèse d'équipe). */
export function mockLightTimeSource(date: string): 'table' | 'approx' {
  return LIGHT_TABLE[date.slice(0, 10)] !== undefined ? 'table' : 'approx';
}

// --- Synthèses par organe (texte gabarit, hors ligne, à partir des chiffres du corps du jour) -
export const SUMMARY_KEY_DAYS = [0, 30, 60, DAY_TODAY, DAY_SOL0, DAY_END].sort((a, b) => a - b);

const val = (o: OrganState, key: string): Metric | undefined => o.metrics.find((m) => m.key === key);
const when = (b: DayBody, a = 0) =>
  b.day === 0 ? 'Baseline assessment D0'
    : b.projected ? `Projection D${b.day} ${a >= 0.5 ? 'with the plan followed' : 'at current pace'} (model, not a measurement)`
      : `D${b.day}`;
const STATUS_TXT = { green: 'nominal', amber: 'to monitor (amber)', red: 'out of limits (red)', grey: 'unknown' } as const;
const trendSentence = (m?: Metric) =>
  m?.trend7d === undefined ? '' : ` The 7-day trend is ${m.trend7d > 0 ? '+' : '−'}${fr(Math.abs(m.trend7d), 2)}%/week.`;

function summaryText(o: OrganState, b: DayBody, a = 0): string | null {
  const gap = o.bioAge - o.chronoAge;
  const age = ` Estimated age gap [H]: +${fr(gap, 1)} year${round(gap, 1) >= 2 ? 's' : ''} (equivalent in years, partly reversible after return).`;
  switch (o.id) {
    case 'hanche': case 'rachis': case 'femur': {
      const d = val(o, 'densite_osseuse');
      const thr = d?.ref?.low ?? 95;
      const end = lossPct(o.id, DAY_END, 0) as number;
      const endPlan = lossPct(o.id, DAY_END, 1) as number;
      return `${when(b, a)}: estimated bone density (${o.name.toLowerCase()}) is ${fr(d?.value ?? NaN, 2)}% of preflight, a loss of ${fr(100 - (d?.value ?? NaN), 2)}%; status ${STATUS_TXT[o.status]}. ` +
        `This value comes from the model calibrated on the preflight ground assessment and urinary markers: the scanner does not measure bone. ` +
        `NASA threshold V1 4027: ≥ ${thr}%. At D${DAY_END}, the loss would reach ${fr(end, 2)}% at current pace versus ${fr(endPlan, 2)}% with the plan followed.${age}`;
    }
    case 'cuisse': case 'mollet': case 'paravertebraux': {
      const v = val(o, 'volume');
      return `${when(b, a)}: muscle volume (${o.name.toLowerCase()}) is ${fr(v?.value ?? NaN, 1)}% of D0 on the scan, status ${STATUS_TXT[o.status]}.${trendSentence(v)} ` +
        `Today's data point is noisy (± ${fr(v?.noise ?? 0, 1)} point): only the 7-day trend triggers an alert. ` +
        `Suggested countermeasure: loaded work on ARED and sustained protein intake.${age}`;
    }
    case 'coeur': {
      const v = val(o, 'vo2max');
      const p = val(o, 'vo2_pct');
      const fe = val(o, 'fraction_ejection');
      return `${when(b, a)}: VO₂max at ${fr(v?.value ?? NaN, 1)} ml/kg/min, i.e. ${fr(p?.value ?? NaN, 1)}% of preflight; status ${STATUS_TXT[o.status]}. ` +
        `Ejection fraction on the scan: ${fr(fe?.value ?? NaN, 0)}%, within the reference range. ` +
        `At current pace, arrival (Sol 0) would be at ${fr(vo2max(DAY_SOL0, 0), 1)} ml/kg/min, at the limit of the ${fr(VO2_SOL0, 1)} threshold [NASA V1 4002]; with the plan, ${fr(vo2max(DAY_SOL0, 1), 1)}.${age}`;
    }
    case 'reins': {
      const c = val(o, 'calcium_urinaire');
      const k = val(o, 'calculs');
      return `${when(b, a)}: ${k?.value ? `${k.value} stone(s) detected` : 'no stones detected'} on the scan; urinary calcium at ${fr(c?.value ?? NaN, 0)} mg/24 h (reference < 300), status ${STATUS_TXT[o.status]}.${trendSentence(c)} ` +
        `The rise in urinary calcium accompanies bone loss and increases kidney stone risk. ` +
        `Suggested action: increased hydration and a kidney check on the next scan.`;
    }
    case 'sang': {
      const hb = val(o, 'hemoglobine');
      const s = val(o, 'spo2');
      const j = val(o, 'volume_jambes');
      return `${when(b, a)}: hemoglobin at ${fr(hb?.value ?? NaN, 1)} g/dL (reference 13.5–17.5), down slightly since D0, consistent with space anemia. ` +
        `SpO₂ at ${fr(s?.value ?? NaN, 0)}%, stable. Leg volume is ${fr(j?.value ?? NaN, 1)}% of D0: headward fluid shift, expected in microgravity. ` +
        `Status ${STATUS_TXT[o.status]}; VO₂max is tracked with the heart.`;
    }
    case 'yeux': {
      const g = val(o, 'gaine_nerf_optique');
      return `${when(b, a)}: optic nerve sheath diameter is ${fr(g?.value ?? NaN, 2)} mm (5.5 mm watch threshold [H]), status ${STATUS_TXT[o.status]}.${trendSentence(g)} ` +
        `This measurement reflects intracranial pressure and the risk of SANS eye changes. ` +
        `Suggested action: vision test and measurements sent to the ground flight surgeon.`;
    }
    case 'dose': {
      const d = val(o, 'dose_cumulee');
      const j = val(o, 'dose_jour');
      return `${when(b, a)}: cumulative dose of ${fr(d?.value ?? NaN, 0)} mSv, in line with plan; today's dose ${fr(j?.value ?? NaN, 2)} mSv. ` +
        `Cruise reference: 1.84 mSv/d [Published RAD]. The 600 mSv threshold is a team hypothesis [H] to be verified. ` +
        `Status ${STATUS_TXT[o.status]}.`;
    }
    default:
      return null; // organe non modélisé : pas de synthèse
  }
}

const summaryCache = new Map<string, OrganSummary | null>();

/** Synthèse du jour clé le plus proche (J0, J30, J60, J94, Sol 0, J860). null si l'organe n'est pas modélisé. */
export function mockSummary(organId: OrganId, day: number, adherence = 0): OrganSummary | null {
  let a = adherence >= 0.5 ? 1 : 0;
  let key = SUMMARY_KEY_DAYS[0];
  for (const k of SUMMARY_KEY_DAYS) if (Math.abs(k - day) < Math.abs(key - day)) key = k;
  if (key <= DAY_TODAY) a = 0; // jour mesuré : un seul texte
  const ck = `${organId}/${key}/${a}`;
  if (summaryCache.has(ck)) return summaryCache.get(ck) ?? null;
  const body = mockDayBody(key, a);
  const o = body.organs.find((x) => x.id === organId);
  const text = o && o.status !== 'grey' ? summaryText(o, body, a) : null;
  const out: OrganSummary | null = text ? { organId, day: key, text, generatedBy: 'IA-sol', reviewed: false } : null;
  summaryCache.set(ck, out);
  return out;
}

// --- Bibliothèque (exercices, menus, textes « Pourquoi ? ») ---------------------------------
export interface Exercise {
  id: string; title: string; device: 'ARED' | 'CEVIS' | 'T2' | 'aucun';
  durationMin: number; intensity: string; target: OrganId[]; detail: string;
}
export interface Meal {
  id: string; title: string; items: string[];
  kcal: number; proteinG: number; calciumMg: number; vitaminDUI: number;
}

const EXERCISES: Exercise[] = [
  { id: 'ared-squat-sdt', title: 'ARED — squat 4×8 + deadlift 4×6', device: 'ARED', durationMin: 45, intensity: 'heavy load (≈ 80% 1RM)', target: ['hanche', 'femur', 'rachis', 'cuisse'], detail: 'High axial loading: stimulates bone formation at the hip and spine.' },
  { id: 'ared-cuisse', title: 'ARED — lunges 3×10 + hip extension 3×12', device: 'ARED', durationMin: 25, intensity: 'moderate load', target: ['cuisse', 'mollet'], detail: 'Targeted quadriceps strengthening after the 7-day trend drops.' },
  { id: 'cevis-intervalles', title: 'CEVIS cycle — intervals 6×3 min', device: 'CEVIS', durationMin: 35, intensity: '90% HRmax, 2 min recovery', target: ['coeur', 'sang'], detail: 'Interval protocol to slow the VO₂max decline.' },
  { id: 't2-continu', title: 'T2 treadmill — continuous run', device: 'T2', durationMin: 30, intensity: '70% HRmax', target: ['coeur', 'mollet'], detail: 'Aerobic maintenance and ground-impact loading.' },
  { id: 'ared-entretien', title: 'ARED — maintenance session', device: 'ARED', durationMin: 35, intensity: 'standard load', target: ['hanche', 'cuisse', 'paravertebraux'], detail: 'Baseline protocol, no active alert.' },
];
const MEALS: Meal[] = [
  { id: 'dej-calcium', title: 'Lunch — salmon, rice, spinach, fortified yogurt', items: ['Rehydrated salmon', 'Brown rice', 'Spinach', 'Calcium-fortified yogurt'], kcal: 780, proteinG: 46, calciumMg: 520, vitaminDUI: 600 },
  { id: 'diner-proteines', title: 'Dinner — chicken, lentils, cheese, applesauce', items: ['Thermostabilized chicken', 'Lentils', 'Cheese', 'Applesauce'], kcal: 820, proteinG: 58, calciumMg: 380, vitaminDUI: 80 },
  { id: 'dej-standard', title: 'Lunch — standard menu', items: ['Beef', 'Pasta', 'Vegetables', 'Dried fruit'], kcal: 750, proteinG: 40, calciumMg: 260, vitaminDUI: 60 },
  { id: 'diner-standard', title: 'Dinner — standard menu', items: ['Turkey', 'Mashed potatoes', 'Green beans', 'Cookie'], kcal: 760, proteinG: 42, calciumMg: 240, vitaminDUI: 60 },
];
const WHY: Record<string, string> = {
  'V1 4027': 'The NASA standard requires keeping bone density above 95% of preflight at the hip (90% at the femoral neck). Your estimate is getting close: we act now, while it is still reversible.',
  'V1 4003': 'The NASA standard requires keeping at least 80% of preflight aerobic capacity. Your VO₂max is dropping: intervals are the most effective way to hold it.',
  'V1 4002': 'Demanding tasks on arrival require a VO₂max of at least 36.5 ml/kg/min. At current pace, you would arrive right at the limit.',
  'TENDANCE-7J': 'A single measurement can be noisy. We only alert when the 7-day slope leaves the scanner noise band.',
  'SANS-ONSD': 'Optic nerve sheath diameter reflects intracranial pressure. An increase is an early sign of SANS eye syndrome.',
  'CALCIUM-U': 'Calcium released from bone passes into the urine and increases kidney stone risk.',
  'RAD-DOSE': 'Dose accumulates throughout the mission; we compare it with the plan (1.84 mSv/d in cruise).',
};

export function mockExercise(id: string): Exercise | null { return EXERCISES.find((e) => e.id === id) ?? null; }
export function mockMeal(id: string): Meal | null { return MEALS.find((m) => m.id === id) ?? null; }
export function mockWhyText(rule: string): string {
  return WHY[rule] ?? 'Explanation not available for this rule (content to be completed).';
}

/** Jour de mission d'une date ISO (utile pour le délai radio du jour). */
export const missionDayOf = dayOfDate;
