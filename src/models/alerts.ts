// Propriétaire : Mouad (ROADMAP §7). Une alerte par organe en danger, dérivée du corps du jour
// (donc cohérente avec les statuts sur toute la timeline). Les statuts muscle / nerf optique / reins
// sont calculés sur 7 jours (moyenne et pente), jamais sur un point isolé (§8).
import type { Alert, Color, Level, Metric, OrganState } from '../types.ts';
import { getDayBodyPlan } from '../sim/load.ts';
import { DAY_END, DAY_SOL0, DAY_TODAY } from '../sim/persona.ts';
import { BONE_RED, boneLossPct, type BoneSite } from './bone.ts';
import { VO2_MIN_ABS, vo2max } from './aerobic.ts';
import { DOSE_CAREER_LIMIT_MSV, DOSE_CRUISE_MSV_DAY } from './radiation.ts';

const LEVEL: Partial<Record<Color, Level>> = { amber: 'AMBRE', red: 'ROUGE' };
const ORDER: Level[] = ['ROUGE', 'ORANGE', 'AMBRE', 'DONNEES_INSUFFISANTES', 'VERT'];
const fr = (v: number, digits = 1) => v.toFixed(digits).replace('.', ',');
const get = (o: OrganState, key: string): Metric | undefined => o.metrics.find(m => m.key === key);
const trendTxt = (m?: Metric) =>
  m?.trend7d === undefined ? 'tendance 7 j indisponible' : `tendance 7 j ${m.trend7d > 0 ? '+' : '−'}${fr(Math.abs(m.trend7d), 2)} %/sem`;

function boneAlert(o: OrganState, level: Level, name: string, day: number, a: number): Alert {
  const site = o.id as BoneSite;
  const pace = a >= 0.5 ? 'avec le plan' : 'au rythme actuel';
  const thr = BONE_RED[site];
  const dens = get(o, 'densite_osseuse')?.value ?? NaN;
  const loss = get(o, 'perte_osseuse')?.value ?? NaN;
  const end = 100 - boneLossPct(site, DAY_END, a);
  const message = level === 'ROUGE'
    ? `Densité estimée ${fr(dens, 2)} % du pré-vol (perte ${fr(loss, 2)} %) : sous le seuil NASA ≥ ${thr} %. Estimation du modèle [H], pas une mesure du scanner.`
    : `Projection J${DAY_END} ${pace} : ${fr(end, 2)} % ${end < thr ? '→ ROUGE' : '→ reste au-dessus du seuil'} (seuil NASA ≥ ${thr} %). ${day > DAY_TODAY ? `À J${day}` : "Aujourd'hui"} : densité estimée ${fr(dens, 2)} % du pré-vol (perte ${fr(loss, 2)} %), modèle [H].`;
  return { id: `alert-${o.id}`, organId: o.id, level, title: `${name} — PERTE OSSEUSE ESTIMÉE`, message, rule: 'V1 4027' };
}

function muscleAlert(o: OrganState, level: Level, name: string): Alert {
  const vol = get(o, 'volume');
  return {
    id: `alert-${o.id}`, organId: o.id, level, title: `${name} — ATROPHIE MUSCULAIRE`,
    message: `Volume au scan ${fr(vol?.value ?? NaN, 1)} % de J0 (perte moyenne sur 7 j), ${trendTxt(vol)} (bruit de mesure ± ${fr(vol?.noise ?? 0, 2)}). Alerte sur 7 jours, pas sur le point du jour.`,
    rule: 'TENDANCE-7J',
  };
}

function organAlert(o: OrganState, level: Level, day: number, a: number): Alert | null {
  switch (o.id) {
    case 'hanche': return boneAlert(o, level, 'HANCHE', day, a);
    case 'rachis': return boneAlert(o, level, 'RACHIS', day, a);
    case 'femur': return boneAlert(o, level, 'COL DU FÉMUR', day, a);
    case 'cuisse': return muscleAlert(o, level, 'CUISSE');
    case 'mollet': return muscleAlert(o, level, 'MOLLET');
    case 'paravertebraux': return muscleAlert(o, level, 'PARAVERTÉBRAUX');
    case 'coeur': {
      const v = get(o, 'vo2max')?.value ?? NaN;
      const pct = get(o, 'vo2_pct')?.value ?? NaN;
      const sol0 = vo2max(DAY_SOL0, a);
      const tail = day < DAY_SOL0
        ? ` Projection Sol 0 (J${DAY_SOL0}) ${a >= 0.5 ? 'avec le plan' : 'au rythme actuel'} : ${fr(sol0, 1)} — ${sol0 - VO2_MIN_ABS < 0.5 ? 'à la limite du' : 'au-dessus du'} seuil ${fr(VO2_MIN_ABS, 1)} [NASA V1 4002].`
        : ` Seuils : ≥ 80 % du pré-vol [NASA V1 4003], ≥ ${fr(VO2_MIN_ABS, 1)} [NASA V1 4002].`;
      return {
        id: 'alert-coeur', organId: 'coeur', level, title: 'CŒUR — VO₂MAX EN BAISSE',
        message: `VO₂max ${fr(v, 1)} ml/kg/min (−${fr(100 - pct, 2)} % vs pré-vol, modèle aerobic).${tail}`,
        rule: 'V1 4003',
      };
    }
    case 'yeux': {
      const g = get(o, 'gaine_nerf_optique');
      return {
        id: 'alert-yeux', organId: 'yeux', level, title: 'NERF OPTIQUE — GAINE EN HAUSSE',
        message: `Diamètre de la gaine ${fr(g?.value ?? NaN, 2)} mm, moyenne 7 j au-dessus du seuil de vigilance 5,5 mm [H]. Indicateur indirect de pression intracrânienne : risque SANS à surveiller.`,
        rule: 'SANS-ONSD',
      };
    }
    case 'reins': {
      const c = get(o, 'calcium_urinaire');
      return {
        id: 'alert-reins', organId: 'reins', level, title: 'REINS — CALCIUM URINAIRE ÉLEVÉ',
        message: `Calcium urinaire ${fr(c?.value ?? NaN, 0)} mg/24 h (référence < 300), ${trendTxt(c)}. Risque de calculs : hydratation renforcée, scan des reins.`,
        rule: 'CALCIUM-U',
      };
    }
    case 'dose': {
      const d = get(o, 'dose_cumulee');
      return {
        id: 'alert-dose', organId: 'dose', level, title: 'EXPOSITION — DOSE CUMULÉE',
        message: `Dose cumulée ${fr(d?.value ?? NaN, 0)} mSv (repère de carrière ${DOSE_CAREER_LIMIT_MSV} mSv [NASA V1 4030], ${fr(DOSE_CRUISE_MSV_DAY, 2)} mSv/j en croisière [Publié RAD]).`,
        rule: 'V1 4030',
      };
    }
    case 'sang': {
      // le VO₂ est porté par l'alerte « cœur » : ici seulement hémoglobine / SpO₂ / tension hors référence
      const bad = o.metrics.filter(m => m.key !== 'vo2max' && (m.color === 'amber' || m.color === 'red'));
      if (!bad.length) return null;
      return {
        id: 'alert-sang', organId: 'sang', level: bad.some(m => m.color === 'red') ? 'ROUGE' : 'AMBRE',
        title: 'SANG — VALEUR HORS RÉFÉRENCE', message: bad.map(m => `${m.label} ${fr(m.value, 1)} ${m.unit}`).join(' · '),
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
