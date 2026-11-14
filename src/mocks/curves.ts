// MOCKS (Walid) — courbes factices calées sur les chiffres de la fiche (ROADMAP §7 « Mocks », §8).
// Ce ne sont PAS les modèles de Mouad : juste des courbes saturantes qui passent par les points imposés.
//   Hanche : perte 1,99 % à J94 ; J860 : 8,70 % (rythme actuel) / 4,22 % (avec le plan).
//   VO₂max : déficit 10,84 % à J94 ; Sol 0 : 36,5 (rythme actuel) / 37,3 (avec le plan) ml/kg/min.
import { DAY_END, DAY_SOL0, DAY_TODAY } from './mission';
import { clamp, solveTau } from './util';

export const HIP_LOSS_TODAY = 1.99;
export const HIP_LOSS_END = 8.7;
export const HIP_LOSS_END_PLAN = 4.22;
export const VO2_PREFLIGHT = 45.0;            // ml/kg/min [Persona] — cohérent avec 36,5 = 81,1 % du pré-vol
export const VO2_DEFICIT_TODAY = 10.84;       // %
export const VO2_SOL0 = 36.5;
export const VO2_SOL0_PLAN = 37.3;
export const DOSE_CRUISE_MSV_DAY = 1.84;      // [Publié RAD, croisière MSL]
export const DOSE_SURFACE_MSV_DAY = 0.64;     // [Publié RAD, surface]

const sat = (d: number, tau: number) => 1 - Math.exp(-d / tau);

// --- Os -------------------------------------------------------------------------------------
const hipTau = solveTau(HIP_LOSS_TODAY / HIP_LOSS_END, DAY_TODAY, DAY_END);
const hipA = HIP_LOSS_END / sat(DAY_END, hipTau);
const hipCurrent = (d: number) => hipA * sat(d, hipTau);
const hipPlan = (d: number) =>
  d <= DAY_TODAY
    ? hipCurrent(d)
    : HIP_LOSS_TODAY +
      ((HIP_LOSS_END_PLAN - HIP_LOSS_TODAY) * (hipCurrent(d) - HIP_LOSS_TODAY)) / (HIP_LOSS_END - HIP_LOSS_TODAY);

/** Rapport de perte par site vs hanche [H mock]. */
const BONE_FACTOR: Record<string, number> = { hanche: 1, femur: 1.1, rachis: 0.7 };
/** Seuil NASA V1 4027 : densité ≥ x % du pré-vol. */
export const BONE_THRESHOLD: Record<string, number> = { hanche: 95, femur: 90, rachis: 95 };

// --- VO₂max ---------------------------------------------------------------------------------
const vo2DefSol0 = ((VO2_PREFLIGHT - VO2_SOL0) / VO2_PREFLIGHT) * 100;
const vo2DefSol0Plan = ((VO2_PREFLIGHT - VO2_SOL0_PLAN) / VO2_PREFLIGHT) * 100;
const vo2Tau = solveTau(VO2_DEFICIT_TODAY / vo2DefSol0, DAY_TODAY, DAY_SOL0);
const vo2A = vo2DefSol0 / sat(DAY_SOL0, vo2Tau);
/** Après Sol 0 (0,38 g) : plateau [H mock]. */
const vo2Current = (d: number) => vo2A * sat(Math.min(d, DAY_SOL0), vo2Tau);
const vo2Plan = (d: number) =>
  d <= DAY_TODAY
    ? vo2Current(d)
    : VO2_DEFICIT_TODAY +
      ((vo2DefSol0Plan - VO2_DEFICIT_TODAY) * (vo2Current(d) - VO2_DEFICIT_TODAY)) / (vo2DefSol0 - VO2_DEFICIT_TODAY);

// --- Muscles (volume au scan, perte en % vs J0) ---------------------------------------------
const CUISSE_TODAY = 4.6;
const cuisseBase = (d: number) => 3.8 * sat(d, 70);
const cuisseK = (CUISSE_TODAY - cuisseBase(DAY_TODAY)) / (DAY_TODAY - 80); // décrochage depuis J80
const cuisseCurrent = (d: number) =>
  d <= DAY_TODAY
    ? cuisseBase(d) + Math.max(0, d - 80) * cuisseK
    : CUISSE_TODAY + 7.5 * sat(d - DAY_TODAY, 300);
const cuissePlan = (d: number) =>
  d <= DAY_TODAY ? cuisseCurrent(d) : CUISSE_TODAY - 1.2 * sat(d - DAY_TODAY, 120);

const molletCurrent = (d: number) => 3.6 * sat(d, 70);
const paraCurrent = (d: number) => 4.4 * sat(d, 90);
const damped = (cur: (d: number) => number, k: number) => (d: number) =>
  d <= DAY_TODAY ? cur(d) : cur(DAY_TODAY) + k * (cur(d) - cur(DAY_TODAY));

const LOSS: Record<string, { current: (d: number) => number; plan: (d: number) => number }> = {
  hanche: { current: hipCurrent, plan: hipPlan },
  femur: { current: (d) => BONE_FACTOR.femur * hipCurrent(d), plan: (d) => BONE_FACTOR.femur * hipPlan(d) },
  rachis: { current: (d) => BONE_FACTOR.rachis * hipCurrent(d), plan: (d) => BONE_FACTOR.rachis * hipPlan(d) },
  cuisse: { current: cuisseCurrent, plan: cuissePlan },
  mollet: { current: molletCurrent, plan: damped(molletCurrent, 0.4) },
  paravertebraux: { current: paraCurrent, plan: damped(paraCurrent, 0.4) },
  coeur: { current: vo2Current, plan: vo2Plan },
};

/** Organes qui ont un modèle de perte (donc un écart d'âge [H]). */
export const MODELLED_LOSS_ORGANS = Object.keys(LOSS);

/**
 * Perte cumulée (%) d'un organe modélisé au jour `day`. adherence : 0 = rythme actuel, 1 = avec le plan
 * (les deux courbes ne divergent qu'après J94). null si l'organe n'a pas de modèle.
 */
export function lossPct(organId: string, day: number, adherence = 0): number | null {
  const m = LOSS[organId];
  if (!m) return null;
  const a = clamp(adherence, 0, 1);
  const d = clamp(day, 0, DAY_END);
  if (a === 0) return m.current(d);
  if (a === 1) return m.plan(d);
  return (1 - a) * m.current(d) + a * m.plan(d);
}

export function vo2DeficitPct(day: number, adherence = 0): number {
  return lossPct('coeur', day, adherence) as number;
}
export function vo2max(day: number, adherence = 0): number {
  return VO2_PREFLIGHT * (1 - vo2DeficitPct(day, adherence) / 100);
}

// --- Autres courbes (rythme unique) ---------------------------------------------------------
export const opticSheathMm = (d: number) => 5.0 + 0.9 * sat(d, 80);          // gaine du nerf optique
export const urineCalcium = (d: number) => 180 + 150 * sat(d, 120);          // mg/24 h
export const hemoglobin = (d: number) => 15.2 - 1.5 * sat(d, 70);            // g/dL (anémie spatiale)
export const ejectionFraction = (d: number) => 62 - 3 * sat(d, 150);         // %
export const heartSizePct = (d: number) => 100 - 5 * sat(d, 110);            // masse VG, % vs J0
export const legVolumePct = (d: number) => 100 - 11 * sat(d, 4);             // déplacement des fluides
export const restingHr = (d: number) => 52 + 7 * sat(d, 60);                 // bpm
export const hrvSdnn = (d: number) => 62 - 13 * sat(d, 70);                  // ms
export const systolic = (d: number) => 118 - 7 * sat(d, 40);                 // mmHg
export const diastolic = (d: number) => 76 - 4 * sat(d, 40);                 // mmHg
export const pvtMs = (d: number) => 262 + 22 * sat(d, 90);                   // temps de réaction
export function cumulativeDose(d: number): number {                          // mSv
  return d <= DAY_SOL0
    ? DOSE_CRUISE_MSV_DAY * d
    : DOSE_CRUISE_MSV_DAY * DAY_SOL0 + DOSE_SURFACE_MSV_DAY * (d - DAY_SOL0);
}
export const dailyDose = (d: number) => (d <= DAY_SOL0 ? DOSE_CRUISE_MSV_DAY : DOSE_SURFACE_MSV_DAY);
