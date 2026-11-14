// Modèle `radiation` : dose prévue d'après les mesures RAD de Curiosity [Publié].
// Croisière ≈ 1,84 mSv/j (MSL, Zeitlin 2013), surface de Mars ≈ 0,64 mSv/j (Hassler 2014).
// Repère de carrière 600 mSv [NASA V1 4030]. Indicatif : la dose réelle dépend du blindage du vaisseau.
import { DAY_SOL0 } from '../sim/persona.ts';

export const DOSE_CRUISE_MSV_DAY = 1.84;
export const DOSE_SURFACE_MSV_DAY = 0.64;
export const DOSE_CAREER_LIMIT_MSV = 600;

/** Dose cumulée prévue (mSv) au jour donné : 1,84 mSv/j en croisière [Publié RAD], 0,64 en surface. */
export function cumulativeDoseMSv(day: number): number {
  const d = Math.max(0, day);
  return d <= DAY_SOL0
    ? DOSE_CRUISE_MSV_DAY * d
    : DOSE_CRUISE_MSV_DAY * DAY_SOL0 + DOSE_SURFACE_MSV_DAY * (d - DAY_SOL0);
}

export function dailyDoseMSv(day: number): number {
  return day <= DAY_SOL0 ? DOSE_CRUISE_MSV_DAY : DOSE_SURFACE_MSV_DAY;
}
