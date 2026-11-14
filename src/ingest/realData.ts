// Propriétaire : Ahmed (B). Ajout : vraies données montre du présentateur.
// Source : public/data/watch/presenter.json (généré en local par scripts/parse-health.ts, ignoré par git)
// ou le dernier import fait dans l'app. Aucun appel réseau externe : c'est un fichier servi par Vite.
import type { Baseline, Measurement } from '../types';
import { baseline30d } from './baseline30d';

type MType = Measurement['type'];

export interface PresenterFile {
  generatedAt: string;
  exportDate?: string;
  counts: Partial<Record<MType, number>>;
  measurements: Measurement[];
  baselines: Baseline[];
}

let data: Measurement[] = [];
let loaded: Promise<void> | null = null;
const listeners = new Set<() => void>();

/** Charge presenter.json une fois. Absent → aucune donnée réelle (l'UI le dit, jamais de vert). */
export function loadRealData(url = '/data/watch/presenter.json'): Promise<void> {
  loaded ??= fetch(url)
    .then((r) => (r.ok ? (r.json() as Promise<PresenterFile>) : null))
    .then((f) => { if (f?.measurements?.length) setRealData(f.measurements); })
    .catch(() => undefined);
  return loaded;
}

/** Remplace les données réelles (import d'un export.zip dans l'app). */
export function setRealData(ms: Measurement[]): void {
  data = ms.filter((m) => m.source !== 'simulated');
  listeners.forEach((f) => f());
}

export function onRealDataChange(f: () => void): () => void {
  listeners.add(f);
  return () => listeners.delete(f);
}

export function getRealSeries(type: MType): Measurement[] {
  return data.filter((m) => m.type === type);
}

export function getRealBaseline(type: MType): Baseline {
  return baseline30d(data, type);
}

// ---------- Repli SIMULÉ pour ce que la montre du présentateur ne mesure pas ----------
// Montre sans oxygène sanguin, sans suivi du sommeil ni température : séries simulées,
// déterministes, étiquetées SIMULÉ par `source: 'simulated'`.

const SIM: Partial<Record<MType, { mean: number; sd: number; unit: string; min: number; max: number }>> = {
  OxygenSaturation: { mean: 97.6, sd: 0.8, unit: '%', min: 94, max: 100 },
  SleepAnalysis: { mean: 6.9, sd: 0.6, unit: 'h', min: 4.5, max: 9 },
  AppleSleepingWristTemperature: { mean: 34.9, sd: 0.25, unit: '°C', min: 34, max: 36 },
};

/** Générateur pseudo-aléatoire à graine fixe (mulberry32) : mêmes valeurs à chaque filage. */
function rng(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function simulatedSeries(type: MType, days = 30, end = new Date()): Measurement[] {
  const s = SIM[type];
  if (!s) return [];
  const r = rng(type.length * 7919 + 17);
  const out: Measurement[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(end);
    d.setUTCDate(d.getUTCDate() - i);
    d.setUTCHours(6, 30, 0, 0);
    // Box-Muller
    const g = Math.sqrt(-2 * Math.log(r() || 1e-9)) * Math.cos(2 * Math.PI * r());
    const v = Math.min(s.max, Math.max(s.min, s.mean + g * s.sd));
    out.push({ type, value: Math.round(v * 10) / 10, unit: s.unit, date: d.toISOString(), source: 'simulated' });
  }
  return out;
}

/** Série du présentateur : réelle si la montre la mesure, sinon simulée (source = 'simulated'). */
export function getPresenterSeries(type: MType): Measurement[] {
  const real = getRealSeries(type);
  return real.length ? real : simulatedSeries(type);
}
