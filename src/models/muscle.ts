// Atrophie des muscles posturaux (volume au scan vs J0) [H].
// Ordres de grandeur des vols longue durée ; à sourcer par Steve. Mesurée par le scanner jusqu'à J94,
// projetée au-delà.
import { withPlan, type Saturating } from './curves.ts';
import { DAY_TODAY } from '../sim/persona.ts';

export type MuscleSite = 'cuisse' | 'mollet' | 'paravertebraux';

const CURVES: Record<MuscleSite, Saturating> = {
  cuisse: { linf: 6.0 / (1 - Math.exp(-94 / 300)), tau: 300 },          // 6,0 % à J94
  mollet: { linf: 4.5 / (1 - Math.exp(-94 / 300)), tau: 300 },          // 4,5 % à J94
  paravertebraux: { linf: 3.5 / (1 - Math.exp(-94 / 300)), tau: 300 },  // 3,5 % à J94
};
/** Avec le plan (ARED charge lourde), on ne garde que 35 % de la perte restante [H]. */
const PLAN_FACTOR = 0.35;
/** Seuils [H] sur la perte de volume : ambre ≥ 5 %, rouge ≥ 10 %. */
export const MUSCLE_THRESHOLDS = { amber: 5, red: 10 };

export function muscleLossPct(site: MuscleSite, day: number, adherence = 0): number {
  const factor = 1 - adherence * (1 - PLAN_FACTOR);
  return withPlan(CURVES[site], day, DAY_TODAY, factor);
}
