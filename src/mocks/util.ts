// MOCKS (Walid) — utilitaires déterministes partagés par les données factices.
// Aucun Math.random : tout bruit vient d'une graine (clé + jour), donc reproductible.
import { CHRONO_AGE_J0, MISSION_START_DATE } from './mission';

const DAY_MS = 86_400_000;
const T0 = Date.parse(`${MISSION_START_DATE}T00:00:00Z`);

/** Générateur pseudo-aléatoire à graine (mulberry32). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Hash FNV-1a d'une chaîne → entier 32 bits. */
export function hashStr(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Bruit déterministe dans [-1, 1] (distribution triangulaire) pour une clé et un jour. */
export function noise(key: string, day: number): number {
  const r = mulberry32(hashStr(key) ^ Math.imul(day + 1, 0x9e3779b1));
  r();
  return r() + r() - 1;
}

export function dateOfDay(day: number): string {
  return new Date(T0 + Math.round(day) * DAY_MS).toISOString().slice(0, 10);
}

export function dayOfDate(date: string): number {
  return Math.round((Date.parse(`${date.slice(0, 10)}T00:00:00Z`) - T0) / DAY_MS);
}

export function chronoAge(day: number): number {
  return CHRONO_AGE_J0 + day / 365.25;
}

export function round(v: number, digits = 2): number {
  const p = 10 ** digits;
  return Math.round((v + Number.EPSILON) * p) / p;
}

export function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/** Nombre au format français (virgule décimale). */
export function fr(v: number, digits = 1): string {
  return v.toFixed(digits).replace('.', ',');
}

/** Pente (par jour) d'une régression linéaire simple sur des valeurs espacées d'un jour. */
export function slopePerDay(values: number[]): number | null {
  const n = values.length;
  if (n < 3) return null;
  const xm = (n - 1) / 2;
  const ym = values.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - xm) * (values[i] - ym);
    den += (i - xm) ** 2;
  }
  return num / den;
}

export function mean(values: number[]): number {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : NaN;
}

/** Résout tau tel que (1 − e^(−d1/tau)) / (1 − e^(−d2/tau)) = ratio (bissection, d1 < d2). */
export function solveTau(ratio: number, d1: number, d2: number): number {
  const f = (tau: number) => (1 - Math.exp(-d1 / tau)) / (1 - Math.exp(-d2 / tau));
  let lo = 1;
  let hi = 1e6;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (f(mid) > ratio) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}
