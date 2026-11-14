// Corps du jour (contrat §6 / tests/mocks.contract.test.ts) : 14 organes, J0 → J860.
// J0–J94 = MESURÉ (séries simulées du générateur, avec bruit) ; > J94 = PROJETÉ par les modèles (sans bruit).
// Règle d'honnêteté : un organe ou une métrique sans modèle de projection n'est pas inventé → gris / absent.
import type { Color, DayBody, LayerId, Metric, OrganId, OrganState, Provenance, Tag } from '../types.ts';
import { BONE_RED, BONE_STANDARD, boneLossPct, type BoneSite } from '../models/bone.ts';
import { muscleLossPct, type MuscleSite } from '../models/muscle.ts';
import { VO2_MIN_ABS, VO2_PREFLIGHT, vo2DeficitPct, vo2max } from '../models/aerobic.ts';
import { lossToYears } from '../models/agingRates.ts';
import { BANDS, boneColor, inBand, levelUp, muscleColor, stonesColor, vo2Color, worstColor } from '../models/rules.ts';
import { MUSCLE_THRESHOLDS } from '../models/muscle.ts';
import { round, slope } from '../models/stats.ts';
import { cumulativeDoseMSv, dailyDoseMSv } from '../models/radiation.ts';
import { DAY_END, DAY_TODAY, chronoAge, dayToDate } from './persona.ts';
import { getBloodTestsSim, lastAt, SCAN, watchByDay } from './loadSim.ts';
import { urineCalciumMg } from './generate.ts';

type VF = (day: number, a: number) => number;
const measured = (d: number) => d <= DAY_TODAY;
const NaNv = Number.NaN;

const BONES: BoneSite[] = ['hanche', 'rachis', 'femur'];
const MUSCLES: MuscleSite[] = ['cuisse', 'mollet', 'paravertebraux'];
export const MUSCLE_NOISE = 0.03;                    // = bruit du générateur (point de % vs J0)
const MUSCLE_REF_CM3: Record<MuscleSite, number> = { cuisse: 2450, mollet: 890, paravertebraux: 610 };
const SHEATH = { amber: 5.5, red: 6.0, noise: 0.06 }; // mm [H]
const URINE_CA = { amber: 280, red: 350, noise: 12 }; // mg/24 h [H]
const DOSE = { amber: 450, red: 600 };              // mSv, repère de carrière 600 [V1 4030]

const scanAt = (key: keyof typeof SCAN) => (d: number) => lastAt(SCAN[key], d) ?? NaNv;
const vo2Watch = watchByDay('VO2Max');
const rhrWatch = watchByDay('RestingHeartRate');
const spo2Watch = watchByDay('OxygenSaturation');
const hbDraws = getBloodTestsSim('hemoglobine').map(b => ({ day: b.day, value: b.value }));
const urineCa = getBloodTestsSim('calcium_urinaire').map(b => ({ day: b.day, value: b.value }));

/** Seulement si mesuré (≤ J94) ; NaN en projection = pas de modèle → métrique absente. */
const measuredOnly = (f: (d: number) => number): VF => d => (measured(d) ? f(d) : NaNv);

const muscleVolume = (site: MuscleSite): VF => (d, a) =>
  measured(d) ? 100 + (lastAt(SCAN[site], d) ?? NaNv) : 100 - muscleLossPct(site, d, a);
const vo2: VF = (d, a) => (measured(d) ? lastAt(vo2Watch, d) ?? NaNv : vo2max(d, a));

/** Fonctions de valeur par organe et par métrique : source unique du corps du jour et de trend7d. */
const VALUES: Partial<Record<OrganId, Record<string, VF>>> = {
  ...Object.fromEntries(BONES.map(site => [site, {
    densite_osseuse: (d: number, a: number) => 100 - boneLossPct(site, d, a),
    perte_osseuse: (d: number, a: number) => boneLossPct(site, d, a),
    ...(site === 'hanche' ? { projection_j860: (_d: number, a: number) => boneLossPct(site, DAY_END, a) } : {}),
  }])),
  ...Object.fromEntries(MUSCLES.map(site => [site, {
    volume: muscleVolume(site),
    volume_cm3: (d: number, a: number) => (MUSCLE_REF_CM3[site] * muscleVolume(site)(d, a)) / 100,
  }])),
  coeur: {
    vo2max: vo2,
    vo2_pct: (d, a) => 100 - vo2DeficitPct(d, a),
    fraction_ejection: measuredOnly(scanAt('fraction_ejection')),
    taille: measuredOnly(scanAt('taille')),
  },
  reins: {
    calculs: measuredOnly(scanAt('calculs')),
    calcium_urinaire: d => (measured(d) ? lastAt(urineCa, d) ?? NaNv : urineCalciumMg(d)),
  },
  sang: {
    vo2max: vo2,
    fc_repos: measuredOnly(d => lastAt(rhrWatch, d) ?? NaNv),
    spo2: measuredOnly(d => lastAt(spo2Watch, d) ?? NaNv),
    tension_sys: measuredOnly(scanAt('tension_sys')),
    tension_dia: measuredOnly(scanAt('tension_dia')),
    hemoglobine: measuredOnly(d => lastAt(hbDraws, d) ?? NaNv),
    volume_jambes: measuredOnly(d => 100 + (lastAt(SCAN.volume_jambes, d) ?? NaNv)),
  },
  yeux: {
    gaine_nerf_optique: measuredOnly(scanAt('gaine_nerf_optique')),
    pvt: measuredOnly(scanAt('pvt')),
  },
  dose: {
    dose_cumulee: d => cumulativeDoseMSv(d),
    dose_prevue: d => cumulativeDoseMSv(d),
    dose_jour: d => dailyDoseMSv(d),
  },
};

function window7(fn: VF, day: number, a: number): number[] {
  const out: number[] = [];
  for (let d = Math.max(0, day - 6); d <= day; d++) out.push(fn(d, a));
  return out;
}
const mean = (v: number[]) => v.reduce((s, x) => s + x, 0) / v.length;

/**
 * Pente des 7 derniers jours (régression linéaire), en % de la moyenne par semaine.
 * null s'il manque des points (moins de 5 valeurs sur 7), si la métrique n'existe pas ou n'est pas finie.
 */
export function trend7dFor(organId: OrganId, key: string, day: number, a = 0): number | null {
  const fn = VALUES[organId]?.[key];
  if (!fn || !(day >= 0) || day > DAY_END) return null;
  const vals = window7(fn, Math.round(day), a).filter(Number.isFinite);
  if (vals.length < 5) return null;
  const b = slope(vals.map((y, x) => ({ x, y })));
  const m = mean(vals);
  return b === null || !m ? null : round(((b * 7) / Math.abs(m)) * 100, 3);
}
const mean7 = (organId: OrganId, key: string, day: number, a: number) =>
  mean(window7(VALUES[organId]![key], day, a).filter(Number.isFinite));

/**
 * Exception à la règle des 7 jours (ROADMAP §8) : un seuil rouge franchi sur les 2 dernières mesures
 * (jours J et J−1, mesurés) donne une alerte immédiate, sans attendre la moyenne.
 */
export function redOnTwoMeasures(organId: OrganId, key: string, day: number): boolean {
  const test = Object.values(RED_TEST).find(t => t.organs.includes(organId) && t.key === key);
  const fn = VALUES[organId]?.[key];
  if (!test || !fn || !measured(day) || day < 1) return false;
  const [v1, v0] = [fn(day, 0), fn(day - 1, 0)];
  return Number.isFinite(v1) && Number.isFinite(v0) && test.isRed(v1) && test.isRed(v0);
}
/** Statut sur la moyenne 7 j, relevé à ROUGE si les 2 dernières mesures sont rouges. */
const withImmediateRed = (st: Color, organId: OrganId, key: string, day: number): Color =>
  st !== 'red' && redOnTwoMeasures(organId, key, day) ? 'red' : st;

/** Seuils rouges des métriques suivies sur 7 jours (exception « 2 mesures »). */
export const RED_TEST: Record<'muscle' | 'gaine' | 'calcium', { organs: OrganId[]; key: string; isRed: (v: number) => boolean }> = {
  muscle: { organs: ['cuisse', 'mollet', 'paravertebraux'], key: 'volume', isRed: v => 100 - v >= MUSCLE_THRESHOLDS.red },
  gaine: { organs: ['yeux'], key: 'gaine_nerf_optique', isRed: v => v >= 6.0 },
  calcium: { organs: ['reins'], key: 'calcium_urinaire', isRed: v => v >= 350 },
};

interface MOpts { ref?: Metric['ref']; noise?: number; digits?: number; trend?: boolean }

/** null si la valeur n'existe pas ce jour-là (projection sans modèle) : la métrique est omise, jamais inventée. */
function metric(organId: OrganId, key: string, label: string, unit: string, day: number, a: number,
  color: Color, tag: Tag, provenance: Provenance, o: MOpts = {}): Metric | null {
  const v = VALUES[organId]![key](day, a);
  if (!Number.isFinite(v)) return null;
  const projected = !measured(day) && provenance !== 'H';
  const out: Metric = {
    key, label, unit, color, tag: projected ? 'H' : tag, provenance: projected ? 'H' : provenance,
    value: round(v, o.digits ?? 2),
  };
  if (o.ref) out.ref = o.ref;
  if (o.noise !== undefined && measured(day)) out.noise = o.noise;
  if (o.trend !== false) {
    const t = trend7dFor(organId, key, day, a);
    if (t !== null) out.trend7d = t;
  }
  return out;
}
const keep = (ms: (Metric | null)[]) => ms.filter((m): m is Metric => m !== null);

/** Perte modélisée utilisée pour l'écart d'âge [H] (même source que bioAgeSeries). */
export function modelLossPct(organId: OrganId, day: number, a: number): number | null {
  if ((BONES as string[]).includes(organId)) return boneLossPct(organId as BoneSite, day, a);
  if ((MUSCLES as string[]).includes(organId)) return muscleLossPct(organId as MuscleSite, day, a);
  if (organId === 'coeur') return vo2DeficitPct(day, a);
  return null;
}

function organ(id: OrganId, layer: LayerId, name: string, status: Color, metrics: Metric[], day: number, a: number): OrganState {
  const chrono = chronoAge(day);
  const loss = modelLossPct(id, day, a);
  const years = loss === null ? null : lossToYears(id, loss);
  return {
    id, layer, name, status, metrics,
    chronoAge: round(chrono, 2),
    bioAge: round(chrono + (years ?? 0), 2),
    bioAgeTag: 'H',
  };
}

function build(day: number, a: number): DayBody {
  const S: Provenance = 'SIMULÉ';
  const P: Tag = 'Persona';
  const organs: OrganState[] = [];

  // Squelette — densité ESTIMÉE (modèle bone + bilan au sol + marqueurs urinaires), jamais mesurée par le scanner.
  const bone = (id: BoneSite, name: string) => {
    const dens = round(100 - boneLossPct(id, day, a), 2);
    const st = boneColor(id, dens, a);
    const ms = [
      metric(id, 'densite_osseuse', 'Densité osseuse estimée vs pré-vol', '%', day, a, st, 'H', 'H',
        { ref: { low: BONE_RED[id], standardId: BONE_STANDARD } }),
      metric(id, 'perte_osseuse', 'Perte cumulée estimée', '%', day, a, st, 'H', 'H', { trend: false }),
    ];
    if (id === 'hanche') {
      const end = 100 - boneLossPct(id, DAY_END, a);
      ms.push(metric(id, 'projection_j860', 'Perte projetée à J860', '%', day, a, end < BONE_RED[id] ? 'red' : 'amber', 'H', 'H', { trend: false }));
    }
    organs.push(organ(id, 'squelette', name, st, keep(ms), day, a));
  };
  bone('hanche', 'Hanche');
  bone('rachis', 'Rachis lombaire');
  bone('femur', 'Col du fémur');

  // Muscles — volume au scan vs J0 ; statut sur la perte moyenne des 7 derniers jours.
  const muscle = (id: MuscleSite, name: string) => {
    const st = withImmediateRed(muscleColor(100 - mean7(id, 'volume', day, a)), id, 'volume', day);
    organs.push(organ(id, 'muscles', name, st, keep([
      metric(id, 'volume', 'Volume vs J0 (scan)', '%', day, a, st, P, S, { noise: MUSCLE_NOISE, ref: { low: 95 } }),
      metric(id, 'volume_cm3', 'Volume', 'cm³', day, a, st, P, S, { digits: 0, noise: round(MUSCLE_REF_CM3[id] * MUSCLE_NOISE / 100, 1) }),
    ]), day, a));
  };
  muscle('cuisse', 'Cuisse (quadriceps)');
  muscle('mollet', 'Mollet');
  muscle('paravertebraux', 'Paravertébraux');

  // Cœur — statut sur le modèle aerobic (estimation lissée), la mesure montre est affichée.
  const heart = vo2Color(vo2max(day, a));
  const vo2Metric = (id: OrganId) =>
    metric(id, 'vo2max', 'VO₂max', 'ml/kg/min', day, a, heart, P, S, { digits: 1, noise: 0.03, ref: { low: VO2_MIN_ABS, standardId: 'V1 4002' } });
  organs.push(organ('coeur', 'organes', 'Cœur', heart, keep([
    vo2Metric('coeur'),
    metric('coeur', 'vo2_pct', `VO₂max vs pré-vol (${VO2_PREFLIGHT})`, '%', day, a, heart, 'H', 'H', { ref: { low: 80, standardId: 'V1 4003' } }),
    metric('coeur', 'fraction_ejection', "Fraction d'éjection (scan hebdo)", '%', day, a, inBand(VALUES.coeur!.fraction_ejection(day, a), BANDS.fraction_ejection), P, S, { digits: 1, noise: 0.8, ref: { low: 55, high: 70 }, trend: false }),
    metric('coeur', 'taille', 'Masse ventriculaire vs J0 (scan hebdo)', '%', day, a, inBand(VALUES.coeur!.taille(day, a), BANDS.taille), P, S, { digits: 1, noise: 0.3, trend: false }),
  ]), day, a));

  // Reins — calcium urinaire quotidien (moyenne 7 j, ou 2 mesures rouges) + calculs au scan (1 ou plus → ambre).
  const calcium = withImmediateRed(levelUp(mean7('reins', 'calcium_urinaire', day, a), URINE_CA.amber, URINE_CA.red), 'reins', 'calcium_urinaire', day);
  const stones = measured(day) ? stonesColor(VALUES.reins!.calculs(day, a)) : 'grey';
  const kidneys = worstColor([calcium, stones]);
  organs.push(organ('reins', 'organes', 'Reins', kidneys, keep([
    metric('reins', 'calculs', 'Calculs détectés (scan hebdo)', '', day, a, stones, P, S, { digits: 0, ref: { high: 0 }, trend: false }),
    metric('reins', 'calcium_urinaire', 'Calcium urinaire', 'mg/24 h', day, a, calcium, P, S, { digits: 0, noise: URINE_CA.noise, ref: { low: 100, high: 300 } }),
  ]), day, a));

  // Non modélisés : gris, aucune métrique, bioAge = âge réel.
  for (const [id, name] of [['poumons', 'Poumons'], ['foie', 'Foie'], ['cerveau', 'Cerveau']] as const) {
    organs.push(organ(id, 'organes', `${name} (non modélisé)`, 'grey', [], day, a));
  }

  // Sang / cardiovasculaire — le VO₂max est rappelé mais son statut est porté par le cœur.
  const blood = keep([
    vo2Metric('sang'),
    metric('sang', 'fc_repos', 'FC de repos', 'bpm', day, a, inBand(VALUES.sang!.fc_repos(day, a), BANDS.fc_repos), P, S, { digits: 0, noise: 1.5 }),
    (() => { const v = VALUES.sang!.spo2(day, a); return metric('sang', 'spo2', 'SpO₂', '%', day, a, v < 92 ? 'red' : v < 95 ? 'amber' : 'green', P, S, { digits: 1, ref: { low: 95 } }); })(),
    metric('sang', 'tension_sys', 'Tension systolique', 'mmHg', day, a, inBand(VALUES.sang!.tension_sys(day, a), BANDS.tension_sys), P, S, { digits: 0, noise: 2, ref: { low: 90, high: 130 } }),
    metric('sang', 'tension_dia', 'Tension diastolique', 'mmHg', day, a, inBand(VALUES.sang!.tension_dia(day, a), BANDS.tension_dia), P, S, { digits: 0, noise: 1.5, ref: { low: 60, high: 85 } }),
    (() => { const v = VALUES.sang!.hemoglobine(day, a); return metric('sang', 'hemoglobine', 'Hémoglobine (prélèvement hebdo)', 'g/dL', day, a, v < 12 ? 'red' : v < 13.5 ? 'amber' : 'green', P, S, { digits: 1, ref: { low: 13.5, high: 17.5 }, trend: false }); })(),
    metric('sang', 'volume_jambes', 'Volume des jambes vs J0 (fluides, scan)', '%', day, a, inBand(VALUES.sang!.volume_jambes(day, a), BANDS.volume_jambes), P, S, { digits: 1, noise: 0.4 }),
  ]);
  organs.push(organ('sang', 'cardio', 'Sang / cardiovasculaire', worstColor(blood.filter(m => m.key !== 'vo2max').map(m => m.color)), blood, day, a));

  // Yeux — gaine du nerf optique (moyenne 7 j : indicateur indirect, on n'alerte jamais sur un point).
  const sheath = measured(day)
    ? withImmediateRed(levelUp(mean7('yeux', 'gaine_nerf_optique', day, a), SHEATH.amber, SHEATH.red), 'yeux', 'gaine_nerf_optique', day)
    : 'grey';
  const pvt = measured(day) ? inBand(mean7('yeux', 'pvt', day, a), BANDS.pvt) : 'grey';
  organs.push(organ('yeux', 'nerveux', 'Yeux — nerf optique', sheath, keep([
    metric('yeux', 'gaine_nerf_optique', 'Diamètre de la gaine du nerf optique (scan)', 'mm', day, a, sheath, P, S, { noise: SHEATH.noise, ref: { high: SHEATH.amber } }),
    metric('yeux', 'pvt', 'Vigilance (PVT, temps de réaction)', 'ms', day, a, pvt, P, S, { digits: 0, noise: 8 }),
  ]), day, a));

  // Exposition — dose prévue (RAD, croisière 1,84 mSv/j, surface 0,64) [Publié].
  const cum = cumulativeDoseMSv(day);
  const dose = levelUp(cum, DOSE.amber, DOSE.red);
  organs.push(organ('dose', 'exposition', 'Exposition — dose', dose, keep([
    metric('dose', 'dose_cumulee', 'Dose cumulée', 'mSv', day, a, dose, 'H', 'H', { digits: 1, ref: { high: 600, standardId: 'V1 4030' }, trend: false }),
    metric('dose', 'dose_prevue', 'Dose prévue à ce jour', 'mSv', day, a, dose, 'Publié', 'H', { digits: 1, trend: false }),
    metric('dose', 'dose_jour', 'Dose du jour', 'mSv/j', day, a, inBand(dailyDoseMSv(day), BANDS.dose_jour), 'Publié', 'H', { digits: 2, ref: { high: 1.84 }, trend: false }),
  ]), day, a));

  return {
    day, date: dayToDate(day), projected: day > DAY_TODAY, organs,
    source: day > DAY_TODAY ? 'projection' : 'scan-midjourney-sim',
  };
}

const memo: [Map<number, DayBody>, Map<number, DayBody>] = [new Map(), new Map()];

/**
 * Corps du jour (mémoïsé). day borné à 0..860 et arrondi. adherence : 0 = rythme actuel, 1 = avec le plan
 * (n'a d'effet qu'après J94 : un jour mesuré est un fait).
 */
export function bodyFor(day: number, adherence = 0): DayBody {
  const d = Math.min(DAY_END, Math.max(0, Math.round(Number.isFinite(day) ? day : DAY_TODAY)));
  const a = d > DAY_TODAY && adherence >= 0.5 ? 1 : 0;
  const hit = memo[a].get(d);
  if (hit) return hit;
  const body = build(d, a);
  memo[a].set(d, body);
  return body;
}

/** Organes qui ont un modèle de perte, donc un écart d'âge [H]. */
export const MODELLED_LOSS_ORGANS: OrganId[] = [...BONES, ...MUSCLES, 'coeur'];
