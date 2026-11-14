// Propriétaire : Mouad (ROADMAP §7). Écart d'âge par organe [H] (§8) :
// bioAge = âge réel + perte cumulée % / vitesse de vieillissement terrestre (agingRates.ts, sourcée).
import type { BioAgePoint, OrganId } from '../types.ts';
import { DAY_END, DAY_SOL0, DAY_TODAY, chronoAge } from '../sim/persona.ts';
import { MODELLED_LOSS_ORGANS, modelLossPct } from '../sim/body.ts';
import { lossToYears } from './agingRates.ts';
import { round } from './stats.ts';

const PREDICT_STEP = 5;
const MEASURED_HALF_WIDTH_YEARS = 0.15;   // incertitude du point mesuré [H]
const BAND_REL = 0.25;                     // la bande prédite s'ouvre de ±25 % de la perte à venir [H]
const cache = new Map<string, BioAgePoint[]>();

/** Écart d'âge par organe [H] : mesuré J0–J94 (predicted: false) + prédit jusqu'à J860 (bande qui s'élargit). */
export function bioAgeSeries(organId: OrganId, adherence: number): BioAgePoint[] {
  const a = Math.min(1, Math.max(0, Number.isFinite(adherence) ? adherence : 0));
  const key = `${organId}/${a}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const days = Array.from({ length: DAY_TODAY + 1 }, (_, d) => d);
  const future = new Set<number>([DAY_SOL0, DAY_END]);
  for (let d = DAY_TODAY + 1; d <= DAY_END; d += PREDICT_STEP) future.add(d);
  days.push(...[...future].sort((x, y) => x - y));

  const gap = (d: number) => {
    const loss = modelLossPct(organId, d, a);
    return loss === null ? 0 : lossToYears(organId, loss) ?? 0;
  };
  const modelled = hasBioAgeModel(organId);
  const gapToday = gap(DAY_TODAY);
  const out = days.map((d): BioAgePoint => {
    const predicted = d > DAY_TODAY;
    const bioAge = chronoAge(d) + gap(d);
    const p: BioAgePoint = { day: d, bioAge: round(bioAge, 2), predicted };
    if (modelled) {
      const hw = MEASURED_HALF_WIDTH_YEARS + (predicted ? BAND_REL * Math.abs(gap(d) - gapToday) : 0);
      p.band = [round(bioAge - hw, 2), round(bioAge + hw, 2)];
    }
    return p;
  });
  cache.set(key, out);
  return out;
}

/** (ajout hors contrat §7) true si l'organe a un modèle de perte, donc un écart d'âge [H]. Sinon « non modélisé ». */
export function hasBioAgeModel(organId: OrganId): boolean {
  return MODELLED_LOSS_ORGANS.includes(organId);
}
