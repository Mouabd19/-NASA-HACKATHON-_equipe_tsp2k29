// Courbes de perte « à saturation » : L(t) = Linf · (1 − e^(−t/τ)), fonctions pures.
// Choix [H] tant que la fiche §7 n'est pas dans le repo : on cale la courbe sur deux points connus.

export interface Saturating { linf: number; tau: number }

export function saturating(c: Saturating, day: number): number {
  return c.linf * (1 - Math.exp(-Math.max(0, day) / c.tau));
}

/** Trouve la courbe qui passe par (t1, v1) et (t2, v2), avec 0 < t1 < t2 et 1 < v2/v1 < t2/t1. */
export function fitSaturating(t1: number, v1: number, t2: number, v2: number): Saturating {
  const target = v2 / v1;
  const ratio = (tau: number) => (1 - Math.exp(-t2 / tau)) / (1 - Math.exp(-t1 / tau));
  let lo = 1e-3, hi = 1e7;               // ratio croît avec τ
  for (let i = 0; i < 200; i++) {
    const mid = Math.sqrt(lo * hi);
    if (ratio(mid) < target) lo = mid; else hi = mid;
  }
  const tau = Math.sqrt(lo * hi);
  return { tau, linf: v1 / (1 - Math.exp(-t1 / tau)) };
}

/**
 * Perte avec plan : identique jusqu'à `fromDay`, puis seule une fraction `factor`
 * de la perte restante du « rythme actuel » s'ajoute.
 */
export function withPlan(c: Saturating, day: number, fromDay: number, factor: number): number {
  const base = saturating(c, Math.min(day, fromDay));
  if (day <= fromDay) return base;
  return base + factor * (saturating(c, day) - base);
}
