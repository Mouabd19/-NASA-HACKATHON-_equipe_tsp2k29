// Formats d'affichage partagés (français : virgule décimale).
import { MISSION_START_DATE } from '../mocks/mission';

const DAY_MS = 86_400_000;
const cache = new Map<string, Intl.NumberFormat>();

function formatter(min: number, max: number): Intl.NumberFormat {
  const key = `${min}:${max}`;
  let f = cache.get(key);
  if (!f) {
    f = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: min, maximumFractionDigits: max, useGrouping: true });
    cache.set(key, f);
  }
  return f;
}

/**
 * Nombre au format français. `digits` donné → décimales fixes (fmt(8.7, 2) = '8,70').
 * Sans `digits` → au plus 2 décimales, sans zéros inutiles. Valeur non finie → '—'.
 */
export function fmt(n: number, digits?: number): string {
  if (!Number.isFinite(n)) return '—';
  const d = digits === undefined ? undefined : Math.max(0, Math.min(20, Math.trunc(digits)));
  const out = d === undefined ? formatter(0, 2).format(n) : formatter(d, d).format(n);
  // « -0 » → « 0 » ; signe moins typographique d'Intl ramené au tiret simple pour la police mono.
  return out.replace(/−/g, '-').replace(/^-(0(?:,0+)?)$/, '$1');
}

/** Jour de mission : 94 → 'J94'. */
export function fmtDay(day: number): string {
  return `J${Math.round(day)}`;
}

/** Date ISO (AAAA-MM-JJ) d'un jour de mission, à partir de MISSION_START_DATE (J0), en UTC. */
export function dayToDate(day: number): string {
  const t0 = Date.parse(`${MISSION_START_DATE}T00:00:00Z`);
  return new Date(t0 + Math.round(day) * DAY_MS).toISOString().slice(0, 10);
}
