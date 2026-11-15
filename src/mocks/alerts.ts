// MOCKS (Walid) — alertes, triage et routeur factices, dérivés du corps du jour (donc cohérents sur toute la timeline).
import type { Alert, Color, Level, LinkPos, Metric, OrganState, RouterOutput, TriageResult } from '../types';
import { DAY_END, DAY_SOL0, DAY_TODAY } from './mission';
import { BONE_THRESHOLD, lossPct, VO2_SOL0, vo2max } from './curves';
import { mockDayBody } from './body';
import { mockCheckIn } from './checkin';
import { fr } from './util';

const LEVEL: Partial<Record<Color, Level>> = { amber: 'AMBRE', red: 'ROUGE' };
const get = (o: OrganState, key: string): Metric | undefined => o.metrics.find((m) => m.key === key);
const trendTxt = (m?: Metric) =>
  m?.trend7d === undefined ? '7-day trend unavailable' : `7-day trend ${m.trend7d > 0 ? '+' : '−'}${fr(Math.abs(m.trend7d), 2)}%/wk`;

function boneAlert(o: OrganState, level: Level, name: string, day: number, a: number): Alert {
  const pace = a >= 0.5 ? 'with the plan' : 'at current pace';
  const thr = BONE_THRESHOLD[o.id];
  const dens = get(o, 'densite_osseuse')?.value ?? NaN;
  const loss = get(o, 'perte_osseuse')?.value ?? NaN;
  const end = 100 - (lossPct(o.id, DAY_END, a) as number);
  const endLevel = end < thr ? '→ RED' : '→ stays above the threshold';
  const message = level === 'ROUGE'
    ? `Estimated density ${fr(dens, 2)}% of preflight (loss ${fr(loss, 2)}%): below the NASA threshold ≥ ${thr}%. Model estimate [H], not a scanner measurement.`
    : `Projection D${DAY_END} ${pace}: ${fr(end, 2)}% ${endLevel} (NASA threshold ≥ ${thr}%). ${day > DAY_TODAY ? `At D${day}` : 'Today'}: estimated density ${fr(dens, 2)}% of preflight (loss ${fr(loss, 2)}%), model [H].`;
  return { id: `alert-${o.id}`, organId: o.id, level, title: `${name} — ESTIMATED BONE LOSS`, message, rule: 'V1 4027' };
}

function muscleAlert(o: OrganState, level: Level, name: string): Alert {
  const vol = get(o, 'volume');
  return {
    id: `alert-${o.id}`, organId: o.id, level, title: `${name} — MUSCLE ATROPHY`,
    message: `Scan volume ${fr(vol?.value ?? NaN, 1)}% of D0, ${trendTxt(vol)} (measurement noise ± ${fr(vol?.noise ?? 0, 1)}). Alert based on the 7-day trend, not on today's data point.`,
    rule: 'TENDANCE-7J',
  };
}

function organAlert(o: OrganState, level: Level, day: number, a: number): Alert | null {
  switch (o.id) {
    case 'hanche': return boneAlert(o, level, 'HIP', day, a);
    case 'rachis': return boneAlert(o, level, 'LUMBAR SPINE', day, a);
    case 'femur': return boneAlert(o, level, 'FEMORAL NECK', day, a);
    case 'cuisse': return muscleAlert(o, level, 'THIGH');
    case 'mollet': return muscleAlert(o, level, 'CALF');
    case 'paravertebraux': return muscleAlert(o, level, 'PARASPINAL MUSCLES');
    case 'coeur': {
      const v = get(o, 'vo2max')?.value ?? NaN;
      const pct = get(o, 'vo2_pct')?.value ?? NaN;
      const sol0 = vo2max(DAY_SOL0, a);
      const tail = day < DAY_SOL0
        ? ` Projection Sol 0 (D${DAY_SOL0}) ${a >= 0.5 ? 'with the plan' : 'at current pace'}: ${fr(sol0, 1)} — ${sol0 - VO2_SOL0 < 0.5 ? 'at the limit of the' : 'above the'} ${fr(VO2_SOL0, 1)} threshold [NASA V1 4002].`
        : ` Thresholds: ≥ 80% of preflight [NASA V1 4003], ≥ ${fr(VO2_SOL0, 1)} [NASA V1 4002].`;
      return {
        id: 'alert-coeur', organId: 'coeur', level, title: 'HEART — VO₂MAX DECLINING',
        message: `VO₂max ${fr(v, 1)} ml/kg/min (−${fr(100 - pct, 2)}% vs preflight).${tail}`,
        rule: 'V1 4003',
      };
    }
    case 'yeux': {
      const g = get(o, 'gaine_nerf_optique');
      return {
        id: 'alert-yeux', organId: 'yeux', level, title: 'OPTIC NERVE — SHEATH WIDENING',
        message: `Sheath diameter ${fr(g?.value ?? NaN, 2)} mm (5.5 mm watch threshold [H]), ${trendTxt(g)}. Reflects intracranial pressure: SANS risk to monitor.`,
        rule: 'SANS-ONSD',
      };
    }
    case 'reins': {
      const c = get(o, 'calcium_urinaire');
      return {
        id: 'alert-reins', organId: 'reins', level, title: 'KIDNEYS — ELEVATED URINARY CALCIUM',
        message: `Urinary calcium ${fr(c?.value ?? NaN, 0)} mg/24 h (reference < 300), ${trendTxt(c)}. Stone risk: increased hydration, kidney scan tomorrow.`,
        rule: 'CALCIUM-U',
      };
    }
    case 'dose': {
      const d = get(o, 'dose_cumulee');
      return {
        id: 'alert-dose', organId: 'dose', level, title: 'RADIATION — CUMULATIVE DOSE',
        message: `Cumulative dose ${fr(d?.value ?? NaN, 0)} mSv (600 mSv threshold [H], 1.84 mSv/d in cruise [Published RAD]).`,
        rule: 'RAD-DOSE',
      };
    }
    case 'sang': {
      // Le VO₂ est porté par l'alerte « cœur » : ici on n'alerte que sur l'hémoglobine ou la SpO₂.
      const bad = o.metrics.filter((m) => m.key !== 'vo2max' && (m.color === 'amber' || m.color === 'red'));
      if (!bad.length) return null;
      const lvl: Level = bad.some((m) => m.color === 'red') ? 'ROUGE' : 'AMBRE';
      return {
        id: 'alert-sang', organId: 'sang', level: lvl, title: 'BLOOD — VALUE OUT OF RANGE',
        message: bad.map((m) => `${m.label} ${fr(m.value, 1)} ${m.unit}`).join(' · '),
        rule: 'SANG-REF',
      };
    }
    default: return null;
  }
}

const ORDER: Level[] = ['ROUGE', 'ORANGE', 'AMBRE', 'DONNEES_INSUFFISANTES', 'VERT'];
const cache: [Map<number, Alert[]>, Map<number, Alert[]>] = [new Map(), new Map()];

/**
 * Alertes du jour (mesuré ou projeté), les plus graves d'abord.
 * adherence (ajout) : 0 = rythme actuel (défaut), 1 = avec le plan — ne change que les jours projetés.
 */
export function mockAlertsForDay(day: number, adherence = 0): Alert[] {
  const body = mockDayBody(day, adherence);
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

const PAIN_ZONE: Record<string, string> = { paravertebraux: 'lower back' };

export function mockTriage(day: number): TriageResult {
  const alerts = mockAlertsForDay(day);
  const ci = mockCheckIn(day);
  const level: Level = alerts.some((a) => a.level === 'ROUGE') ? 'ROUGE' : alerts.length ? 'AMBRE' : 'VERT';
  const reasons = alerts.map((a) => `${a.title} [${a.rule}]`);
  if (ci) {
    const pain = ci.pain > 0 ? `pain ${ci.pain}/3${ci.painZone ? ` (${PAIN_ZONE[ci.painZone] ?? ci.painZone})` : ''}` : 'no pain';
    reasons.push(`Check-in: mood ${ci.mood}/5, fatigue ${ci.fatigue}/5, ${pain}`);
  } else if (day <= DAY_TODAY) {
    reasons.push('Morning check-in missing');
  }
  const groundRoutine: string[] = [];
  const has = (id: string) => alerts.some((a) => a.organId === id);
  if (has('hanche') || has('rachis') || has('femur')) groundRoutine.push('Bone: reassess bisphosphonates with the ground flight surgeon');
  if (has('coeur')) groundRoutine.push('Aerobic: get the interval protocol approved');
  if (has('yeux')) groundRoutine.push('SANS risk: send the optic nerve sheath measurements');
  if (has('reins')) groundRoutine.push('Kidneys: advice on kidney stone risk');
  return { level, reasons, groundRoutine };
}

const NOW: Record<Level, string> = {
  VERT: 'Follow today’s protocol. No immediate action.',
  AMBRE: 'Carry out today’s plan: reinforced countermeasures (ARED heavy loading, intervals). Not urgent.',
  ORANGE: 'Carry out today’s plan without delay and notify the CMO today.',
  ROUGE: 'Stop the current activity, notify the CMO, follow the contingency procedure card.',
  DONNEES_INSUFFISANTES: 'Insufficient data: repeat the measurement (check-in, blood draw) before any decision.',
};
const PROCESSING_MIN = 30; // temps de traitement au sol [H]

/** MAINTENANT ne dépend que du triage (calculé à bord) ; seul ENSUITE dépend du lien Terre. */
export function mockRouter(t: TriageResult, pos: LinkPos, delayMin: number): RouterOutput {
  const maintenant = NOW[t.level];
  if (t.level === 'VERT') {
    return { maintenant, ensuite: { decideur: 'moi', texte: 'Nothing urgent to transmit. Summary sent with today’s telemetry.' } };
  }
  if (t.level === 'ROUGE' || pos === 'Conjonction') {
    const why = pos === 'Conjonction' ? 'No Earth link (solar conjunction): ' : '';
    return { maintenant, ensuite: { decideur: 'CMO', texte: `${why}${why ? 'the' : 'The'} CMO decides. Earth is informed as soon as the link allows.` } };
  }
  const reponseMin = Math.round(2 * Math.max(0, delayMin) + PROCESSING_MIN);
  return {
    maintenant,
    ensuite: {
      decideur: 'sol',
      reponseMin,
      texte: `AI summary and ground flight surgeon’s advice expected in ≈ ${reponseMin} min (radio round trip 2 × ${fr(Math.max(0, delayMin), 1)} min + processing).`,
    },
  };
}
