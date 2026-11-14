// Corps PROJETÉ au-delà de J94 (timeline : Sol 0, J860), au rythme actuel (adhérence 0).
// Seules les métriques qui ont un modèle sont projetées ; les autres organes passent en gris.
import type { DayBody, Metric, OrganState } from '../types.ts';
import { boneDensityPct, boneLossPct, type BoneSite } from '../models/bone.ts';
import { muscleLossPct, type MuscleSite } from '../models/muscle.ts';
import { VO2_PREFLIGHT, vo2max } from '../models/aerobic.ts';
import { lossToYears } from '../models/agingRates.ts';
import { boneColor, muscleColor, vo2Color, worstColor } from '../models/rules.ts';
import { round } from '../models/stats.ts';
import { chronoAge, dayToDate } from './persona.ts';

const BONES: BoneSite[] = ['hanche', 'femur', 'rachis'];
const MUSCLES: MuscleSite[] = ['cuisse', 'mollet', 'paravertebraux'];

export function projectDayBody(today: DayBody, day: number, adherence = 0): DayBody {
  const age = round(chronoAge(day), 2);
  const projectedMetric = (m: Metric, value: number, color: Metric['color']): Metric => {
    const { trend7d: _t, noise: _n, ...rest } = m;
    return { ...rest, value: round(value, 2), color, tag: 'H', provenance: 'H' };
  };
  const organs: OrganState[] = today.organs.map(o => {
    let metrics: Metric[] = [];
    let loss: number | undefined;
    if ((BONES as string[]).includes(o.id)) {
      const site = o.id as BoneSite;
      const v = boneDensityPct(site, day, adherence);
      metrics = o.metrics.filter(m => m.key === 'densite_osseuse').map(m => projectedMetric(m, v, boneColor(site, v)));
      loss = boneLossPct(site, day, adherence);
    } else if ((MUSCLES as string[]).includes(o.id)) {
      const site = o.id as MuscleSite;
      const v = -muscleLossPct(site, day, adherence);
      metrics = o.metrics.filter(m => m.key === 'volume').map(m => projectedMetric(m, v, muscleColor(v)));
      loss = muscleLossPct(site, day, adherence);
    } else if (o.id === 'coeur') {
      const v = vo2max(day, adherence);
      metrics = o.metrics.filter(m => m.key === 'vo2max').map(m => projectedMetric(m, v, vo2Color(v)));
      loss = (1 - v / VO2_PREFLIGHT) * 100;
    }
    const years = loss === undefined ? null : lossToYears(o.id, loss);
    return {
      ...o, metrics, status: worstColor(metrics.map(m => m.color)),
      chronoAge: age, bioAge: years === null ? age : round(age + years, 2),
    };
  });
  return { day, date: dayToDate(day), projected: true, organs, source: 'projection' };
}
