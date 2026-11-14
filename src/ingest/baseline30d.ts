// Propriétaire : Ahmed (B). Référence personnelle sur 30 jours — ROADMAP §7.
import type { Baseline, Measurement } from '../types';

const WINDOW_MS = 30 * 86_400_000;

/**
 * Moyenne et écart-type (échantillon) des mesures du type demandé, sur les 30 jours
 * qui précèdent la dernière mesure de ce type (bornes : ]dernière − 30 j ; dernière]).
 * Aucune donnée → n = 0, mean = sd = NaN : l'UI affiche « données insuffisantes », jamais du vert.
 */
export function baseline30d(ms: Measurement[], type: Measurement['type']): Baseline {
  const pts = ms
    .filter((m) => m.type === type && Number.isFinite(m.value))
    .map((m) => ({ t: Date.parse(m.date), v: m.value }))
    .filter((p) => Number.isFinite(p.t));
  if (pts.length === 0) return { type, mean: NaN, sd: NaN, n: 0 };
  const last = Math.max(...pts.map((p) => p.t));
  const win = pts.filter((p) => p.t > last - WINDOW_MS);
  const n = win.length;
  const mean = win.reduce((s, p) => s + p.v, 0) / n;
  const sd = n > 1 ? Math.sqrt(win.reduce((s, p) => s + (p.v - mean) ** 2, 0) / (n - 1)) : 0;
  return { type, mean: round(mean), sd: round(sd), n };
}

/** Ajout : écart d'une valeur à la référence, en écarts-types. null si la référence est inexploitable. */
export function zScore(value: number, b: Baseline): number | null {
  if (b.n < 3 || !Number.isFinite(b.mean) || !(b.sd > 0)) return null;
  return round((value - b.mean) / b.sd);
}

const round = (x: number) => Math.round(x * 100) / 100;
