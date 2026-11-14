// Petites fonctions statistiques pures.

/** Pente de la régression linéaire y = a + b·x (unités de y par unité de x). null si < 3 points. */
export function slope(points: { x: number; y: number }[]): number | null {
  if (points.length < 3) return null;
  const n = points.length;
  const mx = points.reduce((s, p) => s + p.x, 0) / n;
  const my = points.reduce((s, p) => s + p.y, 0) / n;
  let sxy = 0, sxx = 0;
  for (const p of points) { sxy += (p.x - mx) * (p.y - my); sxx += (p.x - mx) ** 2; }
  return sxx === 0 ? null : sxy / sxx;
}

/**
 * Tendance sur 7 jours en %/semaine, relative à la valeur de référence `base` (J0).
 * Points pris sur [day − 6, day]. null s'il manque des points (moins de 5 sur 7).
 */
export function trendPctPerWeek(series: { day: number; value: number }[], day: number, base: number): number | null {
  const pts = series.filter(p => p.day > day - 7 && p.day <= day).map(p => ({ x: p.day, y: p.value }));
  if (pts.length < 5 || base === 0) return null;
  const b = slope(pts);
  return b === null ? null : (b * 7 / Math.abs(base)) * 100;
}

export const round = (v: number, digits = 2) => Math.round(v * 10 ** digits) / 10 ** digits;
