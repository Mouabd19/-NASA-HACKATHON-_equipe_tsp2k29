// Inférence des trois modèles d'IA entraînés AVANT la démo (scripts/ml/*.py → public/data/ml/*.json).
// Aucun appel réseau : les poids sont chargés à la compilation, le calcul est fait dans le navigateur.
// Ces modèles PRÉDISENT et SIGNALENT ; les seuils d'alerte restent des normes NASA (ROADMAP §8).
import type { OrganId } from '../../types.ts';
import { getBloodTests, getCheckIn, getWatchSeries } from '../../sim/load.ts';
import { SCAN, lastAt } from '../../sim/loadSim.ts';
import { DAY_TODAY, chronoAge } from '../../sim/persona.ts';
import { VO2_PREFLIGHT } from '../aerobic.ts';
import { round, slope } from '../stats.ts';

const files = import.meta.glob('../../../public/data/ml/*.json', { eager: true, import: 'default' }) as Record<string, unknown>;
const model = <T>(name: string): T | null => (files[`../../../public/data/ml/${name}`] as T | undefined) ?? null;

export interface ModelCard { id: string; title: string; learning: string; data: string; tag: string; limits: string[]; metrics: Record<string, unknown> }

// --- A. Âge sanguin (NHANES) ---------------------------------------------------------------------
interface BloodAgeModel extends ModelCard {
  markers: { key: string; log: boolean; mean: number; sd: number; coef: number }[];
  intercept: number; bias: { alpha: number; beta: number };
}
const BLOOD = model<BloodAgeModel>('blood-age.json');

export interface BloodAgePoint {
  day: number; chronoAge: number; bloodAge: number; gap: number;
  /** contribution de chaque marqueur, en années (positif = tire l'âge vers le haut) — pour « Pourquoi ? » */
  contributions: { key: string; years: number }[];
}

/** Âge sanguin à chaque prélèvement (modèle A). [] si le modèle ou un marqueur manque : rien d'inventé. */
export function bloodAgeSeries(): BloodAgePoint[] {
  if (!BLOOD) return [];
  const days = [...new Set(getBloodTests('crp').map(b => b.day))];
  const out: BloodAgePoint[] = [];
  for (const day of days) {
    const contributions: { key: string; years: number }[] = [];
    let pred = BLOOD.intercept;
    let complete = true;
    for (const m of BLOOD.markers) {
      const v = getBloodTests(m.key).find(b => b.day === day)?.value;
      if (v === undefined) { complete = false; break; }
      const x = m.log ? Math.log(Math.max(v, 0.1)) : v;
      const years = m.coef * (x - m.mean) / m.sd;
      pred += years;
      contributions.push({ key: m.key, years: round(years, 2) });
    }
    if (!complete) continue;
    const age = chronoAge(day);
    const gap = pred - age - (BLOOD.bias.alpha + BLOOD.bias.beta * age);
    out.push({
      day, chronoAge: round(age, 2), bloodAge: round(age + gap, 1), gap: round(gap, 1),
      contributions: contributions.sort((a, b) => Math.abs(b.years) - Math.abs(a.years)),
    });
  }
  return out;
}

// --- B. Projection des organes (régression quantile) --------------------------------------------
interface QuantileModel { features: string[]; quantiles: Record<string, { coef: number[]; intercept: number }> }
interface OrganForecastModel extends ModelCard { units: Record<string, string>; models: Record<string, QuantileModel> }
const ORGANS = model<OrganForecastModel>('organ-forecast.json');

export type ForecastOrgan = Extract<OrganId, 'hanche' | 'cuisse' | 'coeur'>;
export interface Forecast { organId: ForecastOrgan; day: 210 | 860; adherence: 0 | 1; p10: number; p50: number; p90: number; unit: string }

const mean = (v: number[]) => v.reduce((s, x) => s + x, 0) / v.length;
const lastN = (s: { day: number; value: number }[], n: number) => s.filter(p => p.day > DAY_TODAY - n && p.day <= DAY_TODAY);
const slopePerWeek = (s: { day: number; value: number }[]) => (slope(s.map(p => ({ x: p.day, y: p.value }))) ?? NaN) * 7;

/** Ce que le modèle B voit chez Haddad à J94 (mêmes définitions que scripts/ml/cohort.py). */
export function forecastFeatures(): Record<string, number> {
  const urine = (a: string) => getBloodTests(a).map(b => ({ day: b.day, value: b.value }));
  const rise = (s: { day: number; value: number }[]) => mean(lastN(s, 7).map(p => p.value)) - mean(s.filter(p => p.day < 7).map(p => p.value));
  const thigh = (SCAN.cuisse ?? []).map(p => ({ day: p.day, value: -p.value }));
  const vo2def = getWatchSeries('VO2Max').map((m, day) => ({ day, value: (1 - m.value / VO2_PREFLIGHT) * 100 }));
  return {
    uca_rise: rise(urine('calcium_urinaire')),
    ctx_rise: rise(urine('urine_ctx')),
    thigh_loss_now: mean(lastN(thigh, 7).map(p => p.value)),
    thigh_slope28: slopePerWeek(lastN(thigh, 28)),
    vo2_def_now: mean(lastN(vo2def, 7).map(p => p.value)),
    vo2_slope28: slopePerWeek(lastN(vo2def, 28)),
  };
}

/** Projection à Sol 0 (J210) ou J860 avec quantiles 10/50/90 % (modèle B). null si le modèle manque. */
export function organForecast(organId: ForecastOrgan, day: 210 | 860, adherence: 0 | 1 = 0): Forecast | null {
  const m = ORGANS?.models[`${organId}/${day}/${adherence ? 'plan' : 'cur'}`];
  if (!m) return null;
  const f = forecastFeatures();
  const x = m.features.map(k => f[k]);
  if (!x.every(Number.isFinite)) return null;
  const q = (k: string) => m.quantiles[k].intercept + m.quantiles[k].coef.reduce((s, c, i) => s + c * x[i], 0);
  const [p10, p50, p90] = [q('0.1'), q('0.5'), q('0.9')].sort((a, b) => a - b);  // pas de croisement de quantiles
  return { organId, day, adherence, p10: round(p10, 2), p50: round(p50, 2), p90: round(p90, 2), unit: ORGANS!.units[organId] };
}

// --- C. Signal d'humeur (régression logistique sur la référence personnelle) --------------------
interface MoodModel extends ModelCard {
  features: string[]; baseline_days: number; window: number; consecutive_days: number;
  coef: number[]; intercept: number; threshold: number;
}
const MOOD = model<MoodModel>('mood-risk.json');

function moodSeries(key: string): number[] {
  const days = Array.from({ length: DAY_TODAY + 1 }, (_, d) => d);
  switch (key) {
    case 'mood': return days.map(d => getCheckIn(d)?.mood ?? NaN);
    case 'fatigue': return days.map(d => getCheckIn(d)?.fatigue ?? NaN);
    case 'sleep_felt': return days.map(d => getCheckIn(d)?.sleepFelt ?? NaN);
    case 'sleep_h': return getWatchSeries('SleepAnalysis').map(m => m.value);
    case 'hrv': return getWatchSeries('HeartRateVariabilitySDNN').map(m => m.value);
    case 'cortisol': {
      const draws = getBloodTests('cortisol').map(b => ({ day: b.day, value: b.value }));
      return days.map(d => lastAt(draws, d) ?? NaN);
    }
    default: return [];
  }
}

export interface MoodSignal { day: number; score: number; alert: boolean; z: Record<string, number> }

/** Score de glissement d'humeur J28 → J94 (modèle C). Signal à regarder, jamais un diagnostic. */
export function moodSignals(): MoodSignal[] {
  if (!MOOD) return [];
  const series = Object.fromEntries(MOOD.features.map(k => [k, moodSeries(k)]));
  const out: MoodSignal[] = [];
  let run = 0;
  for (let day = MOOD.baseline_days + MOOD.window - 1; day <= DAY_TODAY; day++) {
    const z: Record<string, number> = {};
    for (const k of MOOD.features) {
      const x = series[k];
      const base = x.slice(0, MOOD.baseline_days);
      const mu = mean(base);
      const sdRaw = Math.sqrt(mean(base.map(v => (v - mu) ** 2)));
      const floor = ['mood', 'fatigue', 'sleep_felt'].includes(k) ? 0.25 : 1e-3 + 0.05 * Math.abs(mu);
      z[k] = (mean(x.slice(day - MOOD.window + 1, day + 1)) - mu) / Math.max(sdRaw, floor);
    }
    const logit = MOOD.intercept + MOOD.features.reduce((s, k, i) => s + MOOD.coef[i] * z[k], 0);
    const score = 1 / (1 + Math.exp(-logit));
    run = score >= MOOD.threshold ? run + 1 : 0;
    out.push({ day, score: round(score, 3), alert: run >= MOOD.consecutive_days, z: Object.fromEntries(Object.entries(z).map(([k, v]) => [k, round(v, 2)])) });
  }
  return out;
}

/** Fiches des modèles (données, méthode, métriques, limites) pour la page Raisonnement / le pitch. */
export function modelCards(): ModelCard[] {
  return [BLOOD, ORGANS, MOOD].filter((m): m is NonNullable<typeof m> => m !== null);
}
