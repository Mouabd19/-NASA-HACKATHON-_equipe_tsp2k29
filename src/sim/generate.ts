// Générateur de la mission simulée de Haddad, J0 → J94 (SIMULÉ, graine fixe).
// Fonction pure : generateSim(seed) → données. Le script scripts/generate-sim.ts les écrit dans public/data/sim/.
//
// Règle v3.2 : le scanner (échographie) ne mesure QUE muscles, fluides, reins, nerf optique et cœur.
// L'os vient du modèle `bone` (étiquette [H]), jamais du scanner.
import type {
  BloodTest, CheckIn, Color, DayBody, LayerId, Measurement, Metric, OrganId, OrganState, Provenance, Tag,
} from '../types.ts';
import { createRng, type Rng } from './rng.ts';
import { CHRONO_AGE_J0, DAY_TODAY, PERSONA, SIM_SEED, SIM_VERSION, chronoAge, dayToDate } from './persona.ts';
import { BONE_RED, BONE_STANDARD, boneDensityPct, boneLossPct, type BoneSite } from '../models/bone.ts';
import { muscleLossPct, MUSCLE_THRESHOLDS, type MuscleSite } from '../models/muscle.ts';
import { VO2_PREFLIGHT, VO2_STANDARD, vo2Floor, vo2max } from '../models/aerobic.ts';
import { boneColor, muscleColor, vo2Color, worstColor as worst } from '../models/rules.ts';
import { lossToYears } from '../models/agingRates.ts';
import { computePhenoAge, type PhenoAgeMarkers } from '../models/phenoAgeFormula.ts';
import { round, trendPctPerWeek } from '../models/stats.ts';

export interface SimMeta {
  seed: number;
  version: string;
  persona: typeof PERSONA;
  days: [number, number];
  phenoAgeTarget: { day: number; value: number };
  notes: string[];
}

export interface SimData {
  meta: SimMeta;
  days: DayBody[];
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

type Series = { day: number; value: number }[];
const ramp = (d: number, end = DAY_TODAY) => Math.min(1, Math.max(0, d / end));
const sat = (d: number, tau: number) => 1 - Math.exp(-d / tau);

function series(rng: Rng, days: number[], base: (d: number) => number, sd: number, digits = 2): Series {
  return days.map(day => ({ day, value: round(base(day) + rng.gauss(sd), digits) }));
}
const valueAt = (s: Series, day: number) => {
  let v: number | undefined;
  for (const p of s) if (p.day <= day) v = p.value;   // dernière mesure ≤ day (scans hebdo)
  return v;
};

// ---------------------------------------------------------------------------------------------
// Séries brutes
// ---------------------------------------------------------------------------------------------

function scannerSeries(rng: Rng) {
  const muscle = (site: MuscleSite) => series(rng, DAYS, d => -muscleLossPct(site, d), 0.1);
  return {
    cuisse: muscle('cuisse'),
    mollet: muscle('mollet'),
    paravertebraux: muscle('paravertebraux'),
    volume_jambes: series(rng, DAYS, d => -11 * sat(d, 2), 0.4),
    epaisseur_tissus_front: series(rng, DAYS, d => 6.0 + 0.7 * sat(d, 2), 0.08),
    gaine_nerf_optique: series(rng, DAYS, d => 4.9 + 0.7 * ramp(d) ** 0.8, 0.06),
    fraction_ejection: series(rng, DAYS.filter(SCAN_WEEKLY), d => 62 - 2.5 * ramp(d), 0.8, 1),
    masse_vg: series(rng, DAYS.filter(SCAN_WEEKLY), d => 150 - 8 * ramp(d), 2, 0),
    calculs_nb: DAYS.filter(SCAN_WEEKLY).map(day => ({ day, value: 0 })),
  };
}

function watchSeries(rng: Rng): Measurement[] {
  const defs: { type: Measurement['type']; unit: string; base: (d: number) => number; sd: number; clamp?: [number, number] }[] = [
    { type: 'RestingHeartRate', unit: 'count/min', base: d => 57 + 5 * ramp(d), sd: 1.5 },
    { type: 'HeartRateVariabilitySDNN', unit: 'ms', base: d => 58 - 11 * ramp(d), sd: 5 },
    { type: 'VO2Max', unit: 'mL/min·kg', base: d => vo2max(d), sd: 0.4 },
    { type: 'OxygenSaturation', unit: '%', base: () => 98.2, sd: 0.6, clamp: [97, 99.5] },
    { type: 'AppleSleepingWristTemperature', unit: 'degC', base: d => 35.6 + 0.15 * ramp(d), sd: 0.15 },
    { type: 'SleepAnalysis', unit: 'hr', base: d => 7.1 - 0.7 * ramp(d), sd: 0.4 },
  ];
  const out: Measurement[] = [];
  for (const day of DAYS) {
    for (const def of defs) {
      let v = def.base(day) + rng.gauss(def.sd);
      if (def.clamp) v = Math.min(def.clamp[1], Math.max(def.clamp[0], v));
      out.push({
        type: def.type, value: round(v, 1), unit: def.unit,
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
  { analyte: 'pal', unit: 'U/L', j0: 68, j91: 82, low: 40, high: 130, sd: 2 },
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
      lymphocytes_pct: get('lymphocytes_pct'), vgm: get('vgm'), idr: get('idr'), pal: get('pal'), leucocytes: get('leucocytes'),
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

function urineTests(rng: Rng): BloodTest[] {
  const out: BloodTest[] = [];
  for (const day of DAYS) {
    out.push({ day, analyte: 'urine_calcium', value: round(4.5 + 2.7 * sat(day, 30) + rng.gauss(0.3), 2),
      unit: 'mmol/24h', refLow: 2.5, refHigh: 7.5, tag: SIM_TAG });
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
// Corps du jour
// ---------------------------------------------------------------------------------------------

interface MetricInput {
  key: string; label: string; value: number; unit: string; color: Color; tag: Tag; provenance: Provenance;
  ref?: Metric['ref']; noise?: number; trend?: Series; base?: number;
}

function metric(day: number, m: MetricInput): Metric {
  const out: Metric = { key: m.key, label: m.label, value: m.value, unit: m.unit, color: m.color, tag: m.tag, provenance: m.provenance };
  if (m.ref) out.ref = m.ref;
  if (m.trend && m.base !== undefined) {
    const t = trendPctPerWeek(m.trend, day, m.base);
    if (t !== null) out.trend7d = round(t, 3);
  }
  if (m.noise !== undefined) out.noise = m.noise;
  return out;
}

function organ(id: OrganId, layer: LayerId, name: string, day: number, metrics: Metric[], lossPct?: number): OrganState {
  const age = round(chronoAge(day), 2);
  const years = lossPct === undefined ? null : lossToYears(id, lossPct);
  return {
    id, layer, name, status: worst(metrics.map(m => m.color)), metrics,
    chronoAge: age, bioAge: years === null ? age : round(age + years, 2), bioAgeTag: 'H',
  };
}

function boneOrgan(site: BoneSite, name: string, day: number, series: Series): OrganState {
  const value = round(boneDensityPct(site, day), 2);
  const red = BONE_RED[site];
  const color = boneColor(site, value);
  return organ(site, 'squelette', name, day, [metric(day, {
    key: 'densite_osseuse', label: 'Densité osseuse estimée (modèle bone + marqueurs urinaires)', value, unit: '% pré-vol',
    color, tag: 'H', provenance: 'H', ref: { low: red, standardId: BONE_STANDARD }, trend: series, base: 100,
  })], boneLossPct(site, day));
}

function muscleOrgan(site: MuscleSite, name: string, day: number, s: Series): OrganState {
  const value = valueAt(s, day)!;
  const color = muscleColor(value);
  return organ(site, 'muscles', name, day, [metric(day, {
    key: 'volume', label: 'Volume musculaire vs J0 (scan)', value, unit: '% vs J0', color, tag: SIM_TAG, provenance: 'SIMULÉ',
    ref: { low: -MUSCLE_THRESHOLDS.amber }, noise: 0.1, trend: s, base: 100,
  })], muscleLossPct(site, day));
}

function buildDays(scan: ReturnType<typeof scannerSeries>, watch: Measurement[], blood: BloodTest[]): DayBody[] {
  const watchSeriesOf = (type: Measurement['type']): Series =>
    watch.filter(m => m.type === type).map((m, i) => ({ day: i, value: m.value }));
  const spo2 = watchSeriesOf('OxygenSaturation');
  const fc = watchSeriesOf('RestingHeartRate');
  const vo2 = watchSeriesOf('VO2Max');
  const hb = blood.filter(b => b.analyte === 'hemoglobine').map(b => ({ day: b.day, value: b.value }));
  const boneSeries = (site: BoneSite) => DAYS.map(d => ({ day: d, value: boneDensityPct(site, d) }));
  const bones = { hanche: boneSeries('hanche'), femur: boneSeries('femur'), rachis: boneSeries('rachis') };
  const onsd0 = scan.gaine_nerf_optique[0].value;

  return DAYS.map(day => {
    const vo2v = valueAt(vo2, day)!;
    const fe = valueAt(scan.fraction_ejection, day)!;
    const onsd = valueAt(scan.gaine_nerf_optique, day)!;
    const onsdRise = (onsd / onsd0 - 1) * 100;
    const sp = valueAt(spo2, day)!;
    const hbv = valueAt(hb, day)!;
    const tension = round(118 + 5 * ramp(day), 0);
    const nonModelled = (id: OrganId, name: string) => organ(id, 'organes', name, day, []);

    const organs: OrganState[] = [
      boneOrgan('hanche', 'Hanche', day, bones.hanche),
      boneOrgan('femur', 'Col du fémur', day, bones.femur),
      boneOrgan('rachis', 'Rachis', day, bones.rachis),
      muscleOrgan('cuisse', 'Cuisse', day, scan.cuisse),
      muscleOrgan('mollet', 'Mollet', day, scan.mollet),
      muscleOrgan('paravertebraux', 'Paravertébraux', day, scan.paravertebraux),
      organ('coeur', 'organes', 'Cœur', day, [
        metric(day, { key: 'vo2max', label: 'VO₂max', value: vo2v, unit: 'ml/kg/min', tag: SIM_TAG, provenance: 'SIMULÉ',
          color: vo2Color(vo2v),
          ref: { low: vo2Floor(), standardId: VO2_STANDARD }, noise: 0.4, trend: vo2, base: VO2_PREFLIGHT }),
        metric(day, { key: 'fraction_ejection', label: 'Fraction d\'éjection (scan hebdo)', value: fe, unit: '%',
          tag: SIM_TAG, provenance: 'SIMULÉ', color: fe < 50 ? 'red' : fe < 55 ? 'amber' : 'green', ref: { low: 55 }, noise: 0.8 }),
        metric(day, { key: 'masse_vg', label: 'Masse du ventricule gauche (scan hebdo)', value: valueAt(scan.masse_vg, day)!,
          unit: 'g', tag: SIM_TAG, provenance: 'SIMULÉ', color: 'green', noise: 2 }),
      ], (1 - vo2max(day) / VO2_PREFLIGHT) * 100),
      organ('reins', 'organes', 'Reins', day, [
        metric(day, { key: 'calculs_nb', label: 'Calculs rénaux (scan hebdo)', value: valueAt(scan.calculs_nb, day)!, unit: 'nb',
          tag: SIM_TAG, provenance: 'SIMULÉ', color: valueAt(scan.calculs_nb, day)! > 0 ? 'amber' : 'green', ref: { high: 0 } }),
      ]),
      nonModelled('poumons', 'Poumons'),
      nonModelled('foie', 'Foie'),
      nonModelled('cerveau', 'Cerveau'),
      organ('yeux', 'nerveux', 'Yeux / nerf optique', day, [
        metric(day, { key: 'gaine_nerf_optique', label: 'Diamètre de la gaine du nerf optique (scan)', value: onsd, unit: 'mm',
          tag: SIM_TAG, provenance: 'SIMULÉ', color: onsdRise >= 20 ? 'red' : onsdRise >= 10 ? 'amber' : 'green',
          ref: { high: round(onsd0 * 1.1, 2) }, noise: 0.06, trend: scan.gaine_nerf_optique, base: onsd0 }),
      ]),
      organ('sang', 'cardio', 'Sang et fluides', day, [
        metric(day, { key: 'spo2', label: 'SpO₂', value: sp, unit: '%', tag: SIM_TAG, provenance: 'SIMULÉ',
          color: sp < 90 ? 'red' : sp < 95 ? 'amber' : 'green', ref: { low: 95 }, noise: 0.6 }),
        metric(day, { key: 'fc_repos', label: 'FC de repos', value: valueAt(fc, day)!, unit: 'bpm', tag: SIM_TAG,
          provenance: 'SIMULÉ', color: 'green', noise: 1.5, trend: fc, base: fc[0].value }),
        metric(day, { key: 'tension_sys', label: 'Tension systolique', value: tension, unit: 'mmHg', tag: SIM_TAG,
          provenance: 'SIMULÉ', color: tension >= 140 ? 'amber' : 'green', ref: { high: 140 } }),
        metric(day, { key: 'hemoglobine', label: 'Hémoglobine (prélèvement hebdo)', value: hbv, unit: 'g/dL', tag: SIM_TAG,
          provenance: 'SIMULÉ', color: hbv < 12 ? 'red' : hbv < 13.5 ? 'amber' : 'green', ref: { low: 13.5, high: 17.5 } }),
        metric(day, { key: 'volume_jambes', label: 'Volume des jambes vs J0 (scan, déplacement des fluides)',
          value: valueAt(scan.volume_jambes, day)!, unit: '% vs J0', tag: SIM_TAG, provenance: 'SIMULÉ', color: 'green', noise: 0.4 }),
        metric(day, { key: 'epaisseur_tissus_front', label: 'Œdème du visage : épaisseur des tissus du front (scan)',
          value: valueAt(scan.epaisseur_tissus_front, day)!, unit: 'mm', tag: SIM_TAG, provenance: 'SIMULÉ', color: 'green', noise: 0.08 }),
      ]),
    ];
    return { day, date: dayToDate(day), projected: false, organs, source: 'scan-midjourney-sim' } satisfies DayBody;
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
  const days = buildDays(scan, watch, blood);
  return {
    meta: {
      seed, version: SIM_VERSION, persona: PERSONA, days: [0, DAY_TODAY], phenoAgeTarget: PHENOAGE_TARGET,
      notes: [
        `Haddad, ${CHRONO_AGE_J0} ans [Persona]. Toutes les valeurs sont SIMULÉES.`,
        'Le scanner ne mesure que muscles, fluides, reins, nerf optique et cœur ; la densité osseuse vient du modèle bone [H].',
        'CRP calibrée pour PhenoAge(J91) = 43,1 ans (mock roadmap §7).',
      ],
    },
    days, blood, urine, checkins, watch,
  };
}
