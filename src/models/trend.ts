// Propriétaire : Mouad (ROADMAP §7).
import type { OrganId } from '../types.ts';
import { trend7dFor } from '../sim/body.ts';

/**
 * (v3.2) Pente des 7 derniers jours d'une métrique (régression linéaire), en % de sa moyenne par semaine.
 * null s'il manque des points (moins de 5 sur 7) ou si la métrique n'existe pas pour cet organe.
 */
export function trend7d(organId: OrganId, metricKey: string, day: number): number | null {
  return trend7dFor(organId, metricKey, day, 0);
}
