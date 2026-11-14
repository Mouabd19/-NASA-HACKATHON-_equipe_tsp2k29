// MOCKS (Walid) — série d'écart d'âge par organe [H] : mesurée J0..J94, prédite jusqu'à J860 avec bande.
import type { BioAgePoint, OrganId } from '../types';
import { DAY_END, DAY_SOL0, DAY_TODAY } from './mission';
import { lossPct } from './curves';
import { AGING_RATE_PCT_PER_YEAR } from './body';
import { chronoAge, clamp, round } from './util';

const cache = new Map<string, BioAgePoint[]>();
const PREDICT_STEP = 5;

export function mockBioAgeSeries(organId: OrganId, adherence: number): BioAgePoint[] {
  const a = round(clamp(Number.isFinite(adherence) ? adherence : 0, 0, 1), 2);
  const key = `${organId}/${a}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const days: number[] = [];
  for (let d = 0; d <= DAY_TODAY; d++) days.push(d);
  const future = new Set<number>([DAY_SOL0, DAY_END]);
  for (let d = DAY_TODAY + 1; d <= DAY_END; d += PREDICT_STEP) future.add(d);
  days.push(...[...future].filter((d) => d > DAY_TODAY).sort((x, y) => x - y));

  const modelled = lossPct(organId, 0, a) !== null;
  const gap = (d: number) => (lossPct(organId, d, a) ?? 0) / AGING_RATE_PCT_PER_YEAR;
  const gapToday = gap(DAY_TODAY);
  const out = days.map((d): BioAgePoint => {
    const predicted = d > DAY_TODAY;
    const bioAge = chronoAge(d) + gap(d);
    const p: BioAgePoint = { day: d, bioAge: round(bioAge, 2), predicted };
    if (modelled) {
      // bande : ± 0,15 an sur le mesuré ; s'élargit avec l'horizon et l'écart sur le prédit
      const hw = predicted ? 0.15 + 0.25 * Math.abs(gap(d) - gapToday) + 0.0012 * (d - DAY_TODAY) : 0.15;
      p.band = [round(bioAge - hw, 2), round(bioAge + hw, 2)];
    }
    return p;
  });
  cache.set(key, out);
  return out;
}
