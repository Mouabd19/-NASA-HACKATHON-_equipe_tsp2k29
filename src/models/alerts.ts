// Propriétaire : Mouad (ROADMAP §7). Une alerte par organe en danger, dérivée du corps du jour
// (donc cohérente avec les statuts sur toute la timeline). Les statuts muscle / nerf optique / reins
// sont calculés sur 7 jours (moyenne et pente), jamais sur un point isolé (§8).
import type { Alert, Color, Level, Metric, OrganState } from '../types.ts';
import { getDayBodyPlan } from '../sim/load.ts';
import { DAY_END, DAY_SOL0, DAY_TODAY } from '../sim/persona.ts';
import { BONE_RED, boneLossPct, type BoneSite } from './bone.ts';
import { VO2_MIN_ABS, vo2max } from './aerobic.ts';
import { DOSE_CAREER_LIMIT_MSV, DOSE_CRUISE_MSV_DAY } from './radiation.ts';
import { redOnTwoMeasures } from '../sim/body.ts';

const LEVEL: Partial<Record<Color, Level>> = { amber: 'AMBRE', red: 'ROUGE' };
const ORDER: Level[] = ['ROUGE', 'ORANGE', 'AMBRE', 'DONNEES_INSUFFISANTES', 'VERT'];
const fr = (v: number, digits = 1) => v.toFixed(digits);
const get = (o: OrganState, key: string): Metric | undefined => o.metrics.find(m => m.key === key);
const trendTxt = (m?: Metric) =>
  m?.trend7d === undefined ? '7-day trend unavailable' : `7-day trend ${m.trend7d > 0 ? '+' : '−'}${fr(Math.abs(m.trend7d), 2)}%/wk`;

function boneAlert(o: OrganState, level: Level, name: string, day: number, a: number): Alert {
  const site = o.id as BoneSite;
  const pace = a >= 0.5 ? 'with the plan' : 'at current pace';
  const thr = BONE_RED[site];
  const dens = get(o, 'densite_osseuse')?.value ?? NaN;
  const loss = get(o, 'perte_osseuse')?.value ?? NaN;
  const end = 100 - boneLossPct(site, DAY_END, a);
  const message = level === 'ROUGE'
    ? `Estimated density ${fr(dens, 2)}% of preflight (loss ${fr(loss, 2)}%): below the NASA threshold ≥ ${thr}%. Model estimate [H], not a scanner measurement.`
    : `Projection D${DAY_END} ${pace}: ${fr(end, 2)}% ${end < thr ? '→ RED' : '→ stays above the threshold'} (NASA threshold ≥ ${thr}%). ${day > DAY_TODAY ? `At D${day}` : 'Today'}: estimated density ${fr(dens, 2)}% of preflight (loss ${fr(loss, 2)}%), model [H].`;
  return { id: `alert-${o.id}`, organId: o.id, level, title: `${name} — ESTIMATED BONE LOSS`, message, rule: 'V1 4027' };
}

/** Alerte immédiate (exception §8) : seuil rouge franchi sur les 2 dernières mesures, sans attendre la moyenne 7 j. */
const IMMEDIATE = 'Red threshold crossed on the last 2 measurements: immediate alert, without waiting for the 7-day average.';

function muscleAlert(o: OrganState, level: Level, name: string, day: number): Alert {
  const now = redOnTwoMeasures(o.id, 'volume', day);
  const vol = get(o, 'volume');
  return {
    id: `alert-${o.id}`, organId: o.id, level, title: `${name} — MUSCLE ATROPHY`,
    message: `Scan volume ${fr(vol?.value ?? NaN, 1)}% of D0 (7-day average loss), ${trendTxt(vol)} (measurement noise ± ${fr(vol?.noise ?? 0, 2)}). ${now ? IMMEDIATE : 'Alert based on 7 days, not on today\'s data point.'}`,
    rule: now ? 'ROUGE-2-MESURES' : 'TENDANCE-7J',
  };
}

function organAlert(o: OrganState, level: Level, day: number, a: number): Alert | null {
  switch (o.id) {
    case 'hanche': return boneAlert(o, level, 'HIP', day, a);
    case 'rachis': return boneAlert(o, level, 'LUMBAR SPINE', day, a);
    case 'femur': return boneAlert(o, level, 'FEMORAL NECK', day, a);
    case 'cuisse': return muscleAlert(o, level, 'THIGH', day);
    case 'mollet': return muscleAlert(o, level, 'CALF', day);
    case 'paravertebraux': return muscleAlert(o, level, 'PARASPINAL MUSCLES', day);
    case 'coeur': {
      const v = get(o, 'vo2max')?.value ?? NaN;
      const pct = get(o, 'vo2_pct')?.value ?? NaN;
      const sol0 = vo2max(DAY_SOL0, a);
      const tail = day < DAY_SOL0
        ? ` Projection Sol 0 (D${DAY_SOL0}) ${a >= 0.5 ? 'with the plan' : 'at current pace'}: ${fr(sol0, 1)} — ${sol0 - VO2_MIN_ABS < 0.5 ? 'at the limit of the' : 'above the'} ${fr(VO2_MIN_ABS, 1)} threshold [NASA V1 4002].`
        : ` Thresholds: ≥ 80% of preflight [NASA V1 4003], ≥ ${fr(VO2_MIN_ABS, 1)} [NASA V1 4002].`;
      return {
        id: 'alert-coeur', organId: 'coeur', level, title: 'HEART — VO₂MAX DECLINING',
        message: `VO₂max ${fr(v, 1)} ml/kg/min (−${fr(100 - pct, 2)}% vs preflight, aerobic model).${tail}`,
        rule: 'V1 4003',
      };
    }
    case 'yeux': {
      const g = get(o, 'gaine_nerf_optique');
      return {
        id: 'alert-yeux', organId: 'yeux', level, title: 'OPTIC NERVE — SHEATH WIDENING',
        message: `Sheath diameter ${fr(g?.value ?? NaN, 2)} mm, ${redOnTwoMeasures('yeux', 'gaine_nerf_optique', day) ? IMMEDIATE.toLowerCase() : '7-day average above the 5.5 mm watch threshold [H].'} Indirect marker of intracranial pressure: SANS risk to monitor.`,
        rule: 'SANS-ONSD',
      };
    }
    case 'reins': {
      const c = get(o, 'calcium_urinaire');
      return {
        id: 'alert-reins', organId: 'reins', level,
        title: (get(o, 'calculs')?.value ?? 0) >= 1 ? 'KIDNEYS — STONE DETECTED ON SCAN' : 'KIDNEYS — ELEVATED URINARY CALCIUM',
        message: `${(get(o, 'calculs')?.value ?? 0) >= 1 ? `${fr(get(o, 'calculs')!.value, 0)} stone(s) seen on scan. ` : ''}Urinary calcium ${fr(c?.value ?? NaN, 0)} mg/24 h (reference < 300), ${trendTxt(c)}.${redOnTwoMeasures('reins', 'calcium_urinaire', day) ? ` ${IMMEDIATE}` : ''} Stone risk: increased hydration, kidney ultrasound.`,
        rule: 'CALCIUM-U',
      };
    }
    case 'dose': {
      const d = get(o, 'dose_cumulee');
      return {
        id: 'alert-dose', organId: 'dose', level, title: 'RADIATION — CUMULATIVE DOSE',
        message: `Cumulative dose ${fr(d?.value ?? NaN, 0)} mSv (career limit ${DOSE_CAREER_LIMIT_MSV} mSv [NASA V1 4030], ${fr(DOSE_CRUISE_MSV_DAY, 2)} mSv/d in cruise [Published RAD]).`,
        rule: 'V1 4030',
      };
    }
    case 'sang': {
      // le VO₂ est porté par l'alerte « cœur » : ici seulement hémoglobine / SpO₂ / tension hors référence
      const bad = o.metrics.filter(m => m.key !== 'vo2max' && (m.color === 'amber' || m.color === 'red'));
      if (!bad.length) return null;
      return {
        id: 'alert-sang', organId: 'sang', level: bad.some(m => m.color === 'red') ? 'ROUGE' : 'AMBRE',
        title: 'BLOOD — VALUE OUT OF RANGE', message: bad.map(m => `${m.label} ${fr(m.value, 1)} ${m.unit}`).join(' · '),
        rule: 'SANG-REF',
      };
    }
    default: return null;
  }
}

const cache: [Map<number, Alert[]>, Map<number, Alert[]>] = [new Map(), new Map()];

/** Alertes du jour selon l'adhérence au plan (0 = rythme actuel, 1 = avec le plan ; ne diffère qu'après J94). */
export function alertsForDayPlan(day: number, adherence: number): Alert[] {
  const body = getDayBodyPlan(day, adherence);
  const a = body.day > DAY_TODAY && adherence >= 0.5 ? 1 : 0;
  const hit = cache[a].get(body.day);
  if (hit) return hit;
  const out: Alert[] = [];
  for (const o of body.organs) {
    const level = LEVEL[o.status];
    if (!level) continue;
    const al = organAlert(o, level, body.day, a);
    if (al) out.push(al);
  }
  out.sort((x, y) => ORDER.indexOf(x.level) - ORDER.indexOf(y.level));
  cache[a].set(body.day, out);
  return out;
}

/** Alertes du jour (mesuré ou projeté), les plus graves d'abord. */
export function alertsForDay(day: number): Alert[] {
  return alertsForDayPlan(day, 0);
}
