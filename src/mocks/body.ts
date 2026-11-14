// MOCKS (Walid) — le « corps du jour » factice : 14 organes, J0..J860.
// J0..J94 = mesuré (scan simulé, avec bruit de mesure) ; > J94 = projeté (courbes sans bruit).
// Règle d'honnêteté : un organe sans modèle est GRIS (« non modélisé »), jamais vert par défaut.
import type { Color, DayBody, LayerId, Metric, OrganId, OrganState, Provenance, Tag } from '../types';
import { DAY_END, DAY_TODAY } from './mission';
import {
  BONE_THRESHOLD, cumulativeDose, dailyDose, diastolic, ejectionFraction, heartSizePct, hemoglobin,
  legVolumePct, lossPct, opticSheathMm, pvtMs, restingHr, systolic, urineCalcium, vo2DeficitPct, vo2max,
  VO2_SOL0,
} from './curves';
import { lastDraw, URINE_CA_NOISE, urineCalciumMeasured } from './blood';
import { spo2Measured } from './watch';
import { chronoAge, clamp, dateOfDay, mean, noise, round, slopePerDay } from './util';

type VF = (day: number, adherence: number) => number;

/** Bruit de mesure : uniquement sur les jours mesurés (≤ J94). */
const jitter = (key: string, amp: number, d: number) => (d <= DAY_TODAY ? amp * noise(key, d) : 0);

export const MUSCLE_NOISE = 0.25;  // ± points de % (volume au scan)
export const MUSCLE_TREND_AMBER = -0.8; // %/semaine [H]
export const SHEATH_NOISE = 0.08;  // ± mm
const MUSCLE_REF_CM3: Record<string, number> = { cuisse: 2450, mollet: 890, paravertebraux: 610 };

const boneValues = (site: string): Record<string, VF> => ({
  densite_osseuse: (d, a) => 100 - (lossPct(site, d, a) as number),
  perte_osseuse: (d, a) => lossPct(site, d, a) as number,
});
const muscleValues = (id: string): Record<string, VF> => {
  const vol: VF = (d, a) => 100 - (lossPct(id, d, a) as number) + jitter(`${id}/volume`, MUSCLE_NOISE, d);
  return { volume: vol, volume_cm3: (d, a) => (MUSCLE_REF_CM3[id] * vol(d, a)) / 100 };
};
const vo2Value: VF = (d, a) => round(vo2max(d, a), 1);

/** Fonctions de valeur par organe et par métrique (source unique de getDayBody et de trend7d). */
const VALUES: Record<string, Record<string, VF>> = {
  hanche: { ...boneValues('hanche'), projection_j860: (_d, a) => lossPct('hanche', DAY_END, a) as number },
  rachis: boneValues('rachis'),
  femur: boneValues('femur'),
  cuisse: muscleValues('cuisse'),
  mollet: muscleValues('mollet'),
  paravertebraux: muscleValues('paravertebraux'),
  coeur: {
    vo2max: vo2Value,
    vo2_pct: (d, a) => 100 - vo2DeficitPct(d, a),
    fraction_ejection: (d) => ejectionFraction(d) + jitter('coeur/fe', 0.8, d),
    taille: (d) => heartSizePct(d) + jitter('coeur/taille', 0.3, d),
  },
  reins: {
    calculs: () => 0,
    calcium_urinaire: (d) => (d <= DAY_TODAY ? urineCalciumMeasured(d) : urineCalcium(d)),
  },
  sang: {
    vo2max: vo2Value,
    fc_repos: (d) => restingHr(d) + jitter('w/rhr', 1.5, d),
    spo2: (d) => (d <= DAY_TODAY ? spo2Measured(d) : 98),
    tension_sys: (d) => systolic(d) + jitter('sang/sys', 2, d),
    tension_dia: (d) => diastolic(d) + jitter('sang/dia', 1.5, d),
    hemoglobine: (d) => (d <= DAY_TODAY ? (lastDraw('hemoglobine', d)?.value ?? hemoglobin(d)) : hemoglobin(d)),
    volume_jambes: (d) => legVolumePct(d) + jitter('sang/jambes', 0.4, d),
  },
  yeux: {
    gaine_nerf_optique: (d) => opticSheathMm(d) + jitter('yeux/gaine', SHEATH_NOISE, d),
    pvt: (d) => pvtMs(d) + jitter('yeux/pvt', 8, d),
  },
  dose: {
    dose_cumulee: (d) => cumulativeDose(d),
    dose_prevue: (d) => cumulativeDose(d),
    dose_jour: (d) => dailyDose(d) + jitter('dose/jour', 0.12, d),
  },
};

function window7(fn: VF, day: number, a: number): number[] {
  const out: number[] = [];
  for (let d = Math.max(0, day - 6); d <= day; d++) out.push(fn(d, a));
  return out;
}

/** Pente des 7 derniers jours, en % (relatif) par semaine. null si < 3 points ou métrique inconnue. */
export function mockTrend7d(organId: OrganId, metricKey: string, day: number, adherence = 0): number | null {
  const fn = VALUES[organId]?.[metricKey];
  if (!fn || !(day >= 0) || day > DAY_END) return null;
  const vals = window7(fn, Math.round(day), adherence);
  const slope = slopePerDay(vals);
  const m = mean(vals);
  if (slope === null || !m) return null;
  return round(((slope * 7) / Math.abs(m)) * 100, 2);
}

const mean7 = (organ: string, key: string, day: number, a: number) => mean(window7(VALUES[organ][key], day, a));

interface MOpts { ref?: Metric['ref']; noise?: number; digits?: number; trend?: boolean }

function metric(
  organ: string, key: string, label: string, unit: string, day: number, a: number,
  color: Color, tag: Tag, provenance: Provenance, o: MOpts = {},
): Metric {
  const out: Metric = {
    key, label, unit, color, tag, provenance,
    value: round(VALUES[organ][key](day, a), o.digits ?? 2),
  };
  if (o.ref) out.ref = o.ref;
  if (o.noise !== undefined) out.noise = o.noise;
  if (o.trend !== false) {
    const t = mockTrend7d(organ, key, day, a);
    if (t !== null) out.trend7d = t;
  }
  return out;
}

const worst = (colors: Color[]): Color =>
  colors.includes('red') ? 'red' : colors.includes('amber') ? 'amber' : colors.includes('green') ? 'green' : 'grey';

function organ(id: OrganId, layer: LayerId, name: string, status: Color, metrics: Metric[], day: number, a: number): OrganState {
  const loss = lossPct(id, day, a);
  const chrono = chronoAge(day);
  return {
    id, layer, name, status, metrics,
    chronoAge: round(chrono, 2),
    // §8 : bioAge = âge réel + perte cumulée % / vitesse de vieillissement terrestre (≈ 1 %/an) [H]
    bioAge: round(chrono + (loss ?? 0) / AGING_RATE_PCT_PER_YEAR, 2),
    bioAgeTag: 'H',
  };
}
export const AGING_RATE_PCT_PER_YEAR = 1;

// --- Statuts --------------------------------------------------------------------------------
/** Os : rouge sous le seuil NASA ; ambre si la perte est engagée ET que la projection J860 passe sous le seuil. */
export function boneStatus(site: string, day: number, a: number): Color {
  const thr = BONE_THRESHOLD[site];
  const loss = lossPct(site, day, a) as number;
  if (100 - loss < thr) return 'red';
  const projectedRed = 100 - (lossPct(site, DAY_END, a) as number) < thr;
  if (projectedRed && loss >= 1.5) return 'amber';
  if (loss >= 0.75 * (100 - thr)) return 'amber';
  return 'green';
}
/** Muscle : sur la moyenne et la pente des 7 derniers jours, jamais sur le point du jour. */
function muscleStatus(id: string, day: number, a: number): Color {
  const lossMean = 100 - mean7(id, 'volume', day, a);
  // pente sur une fenêtre complète de 7 j, confirmée 2 jours de suite, pour sortir de la bande de bruit
  const t = mockTrend7d(id, 'volume', day, a);
  const tPrev = day > 0 ? mockTrend7d(id, 'volume', day - 1, a) : null;
  const falling = day >= 7 && t !== null && tPrev !== null && t <= MUSCLE_TREND_AMBER && tPrev <= MUSCLE_TREND_AMBER;
  if (lossMean >= 10) return 'red';
  if (lossMean >= 4 || falling) return 'amber';
  return 'green';
}
function heartStatus(day: number, a: number): Color {
  const v = vo2Value(day, a);
  const pct = 100 - vo2DeficitPct(day, a);
  if (v < VO2_SOL0 || pct < 80) return 'red';
  if (pct < 90) return 'amber';
  return 'green';
}
const level = (v: number, amber: number, red: number): Color => (v >= red ? 'red' : v >= amber ? 'amber' : 'green');

// --- Construction ---------------------------------------------------------------------------
function build(day: number, a: number): DayBody {
  const scan: Provenance = 'SIMULÉ';
  const organs: OrganState[] = [];

  // Squelette — densité ESTIMÉE (modèle bone + bilan au sol + marqueurs), PAS mesurée par le scanner → [H]
  const bone = (id: string, name: string, extra: boolean) => {
    const st = boneStatus(id, day, a);
    const ms = [
      metric(id, 'densite_osseuse', 'Densité osseuse estimée vs pré-vol', '%', day, a, st, 'H', 'H', {
        ref: { low: BONE_THRESHOLD[id], standardId: 'V1 4027' },
      }),
      metric(id, 'perte_osseuse', 'Perte cumulée estimée', '%', day, a, st, 'H', 'H'),
    ];
    if (extra) {
      const proj = lossPct(id, DAY_END, a) as number;
      ms.push(metric(id, 'projection_j860', 'Perte projetée à J860', '%', day, a,
        100 - proj < BONE_THRESHOLD[id] ? 'red' : 'amber', 'H', 'H', { trend: false }));
    }
    organs.push(organ(id, 'squelette', name, st, ms, day, a));
  };
  bone('hanche', 'Hanche', true);
  bone('rachis', 'Rachis lombaire', false);
  bone('femur', 'Col du fémur', false);

  // Muscles — volume au scan vs J0, bruit de mesure + tendance 7 j
  const muscle = (id: string, name: string) => {
    const st = muscleStatus(id, day, a);
    organs.push(organ(id, 'muscles', name, st, [
      metric(id, 'volume', 'Volume vs J0 (scan)', '%', day, a, st, 'Persona', scan, { noise: MUSCLE_NOISE, ref: { low: 90 } }),
      metric(id, 'volume_cm3', 'Volume', 'cm³', day, a, st, 'Persona', scan, { digits: 0, noise: round(MUSCLE_REF_CM3[id] * MUSCLE_NOISE / 100, 0) }),
    ], day, a));
  };
  muscle('cuisse', 'Cuisse (quadriceps)');
  muscle('mollet', 'Mollet');
  muscle('paravertebraux', 'Paravertébraux');

  // Organes
  const heart = heartStatus(day, a);
  const vo2Metrics = (id: string) => [
    metric(id, 'vo2max', 'VO₂max', 'ml/kg/min', day, a, heart, 'Persona', scan, { digits: 1, ref: { low: VO2_SOL0, standardId: 'V1 4002' } }),
  ];
  organs.push(organ('coeur', 'organes', 'Cœur', heart, [
    ...vo2Metrics('coeur'),
    metric('coeur', 'vo2_pct', 'VO₂max vs pré-vol', '%', day, a, heart, 'Persona', scan, { ref: { low: 80, standardId: 'V1 4003' } }),
    metric('coeur', 'fraction_ejection', "Fraction d'éjection (scan)", '%', day, a, 'green', 'Persona', scan, { digits: 1, noise: 0.8, ref: { low: 55, high: 70 } }),
    metric('coeur', 'taille', 'Masse ventriculaire vs J0 (scan)', '%', day, a, 'green', 'Persona', scan, { digits: 1, noise: 0.3 }),
  ], day, a));

  const caMean = mean7('reins', 'calcium_urinaire', day, a);
  const kidneys = level(caMean, 280, 350);
  organs.push(organ('reins', 'organes', 'Reins', kidneys, [
    metric('reins', 'calculs', 'Calculs détectés (scan)', '', day, a, 'green', 'Persona', scan, { digits: 0, ref: { high: 0 }, trend: false }),
    metric('reins', 'calcium_urinaire', 'Calcium urinaire', 'mg/24 h', day, a, kidneys, 'Persona', scan, { digits: 0, noise: URINE_CA_NOISE, ref: { low: 100, high: 300 } }),
  ], day, a));

  // Non modélisés : gris, aucune métrique, bioAge = âge réel
  for (const [id, name] of [['poumons', 'Poumons'], ['foie', 'Foie'], ['cerveau', 'Cerveau']] as const) {
    organs.push(organ(id, 'organes', `${name} (non modélisé)`, 'grey', [], day, a));
  }

  // Cardiovasculaire / sang
  const hb = VALUES.sang.hemoglobine(day, a);
  const hbColor: Color = hb < 12 ? 'red' : hb < 13.5 ? 'amber' : 'green';
  const spo2 = VALUES.sang.spo2(day, a);
  const spo2Color: Color = spo2 < 92 ? 'red' : spo2 < 95 ? 'amber' : 'green';
  const blood = [
    ...vo2Metrics('sang'),
    metric('sang', 'fc_repos', 'FC de repos', 'bpm', day, a, 'green', 'Persona', scan, { digits: 0, noise: 1.5 }),
    metric('sang', 'spo2', 'SpO₂', '%', day, a, spo2Color, 'Persona', scan, { digits: 1, ref: { low: 95 } }),
    metric('sang', 'tension_sys', 'Tension systolique', 'mmHg', day, a, 'green', 'Persona', scan, { digits: 0, noise: 2, ref: { low: 90, high: 130 } }),
    metric('sang', 'tension_dia', 'Tension diastolique', 'mmHg', day, a, 'green', 'Persona', scan, { digits: 0, noise: 1.5, ref: { low: 60, high: 85 } }),
    metric('sang', 'hemoglobine', 'Hémoglobine', 'g/dL', day, a, hbColor, 'Persona', scan, { digits: 1, ref: { low: 13.5, high: 17.5 } }),
    metric('sang', 'volume_jambes', 'Volume des jambes vs J0 (fluides)', '%', day, a, 'green', 'Persona', scan, { digits: 1, noise: 0.4 }),
  ];
  organs.push(organ('sang', 'cardio', 'Sang / cardiovasculaire', worst(blood.map((x) => x.color)), blood, day, a));

  // Nerveux + yeux
  const sheath = level(mean7('yeux', 'gaine_nerf_optique', day, a), 5.5, 6.0);
  organs.push(organ('yeux', 'nerveux', 'Yeux — nerf optique', sheath, [
    metric('yeux', 'gaine_nerf_optique', 'Diamètre de la gaine du nerf optique (scan)', 'mm', day, a, sheath, 'Persona', scan, { noise: SHEATH_NOISE, ref: { high: 5.5 } }),
    metric('yeux', 'pvt', 'Vigilance (PVT, temps de réaction)', 'ms', day, a, 'green', 'Persona', scan, { digits: 0, noise: 8 }),
  ], day, a));

  // Exposition
  const cum = cumulativeDose(day);
  const dose = level(cum, 450, 600);
  organs.push(organ('dose', 'exposition', 'Exposition — dose', dose, [
    metric('dose', 'dose_cumulee', 'Dose cumulée', 'mSv', day, a, dose, 'H', scan, { digits: 1, ref: { high: 600 }, trend: false }),
    metric('dose', 'dose_prevue', 'Dose prévue à ce jour', 'mSv', day, a, 'green', 'Publié', 'H', { digits: 1, trend: false }),
    metric('dose', 'dose_jour', 'Dose du jour', 'mSv/j', day, a, 'green', 'Publié', scan, { noise: 0.12, ref: { high: 1.84 }, trend: false }),
  ], day, a));

  return {
    day,
    date: dateOfDay(day),
    projected: day > DAY_TODAY,
    organs,
    source: day > DAY_TODAY ? 'projection' : 'scan-midjourney-sim',
  };
}

const memo: [Map<number, DayBody>, Map<number, DayBody>] = [new Map(), new Map()];

/**
 * Corps du jour (mémoïsé). day est borné à 0..860 et arrondi. adherence : 0 = rythme actuel (défaut),
 * 1 = avec le plan — n'a d'effet qu'après J94.
 */
export function mockDayBody(day: number, adherence = 0): DayBody {
  const d = clamp(Math.round(Number.isFinite(day) ? day : DAY_TODAY), 0, DAY_END);
  const a = adherence >= 0.5 ? 1 : 0;
  const hit = memo[a].get(d);
  if (hit) return hit;
  const body = build(d, a);
  memo[a].set(d, body);
  return body;
}

let days: number[] | null = null;
/** Jours mesurés : 0..94. */
export function mockDays(): number[] {
  days ??= Array.from({ length: DAY_TODAY + 1 }, (_, i) => i);
  return days;
}
