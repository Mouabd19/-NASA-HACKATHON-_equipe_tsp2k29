// Ordre et numéros des alarmes de la page Corps : le même dans la liste « Alertes » et sur les annotations 3D.
// Comme un radiologue numérote ses repères sur le cliché et les reprend dans le compte rendu,
// l'alarme n° 2 de la liste est le repère n° 2 sur le corps.
import type { Alert, Level, OrganId } from '../../types';
import { getAnchor } from '../../three/anatomy';

const LEVEL_RANK: Record<Level, number> = { ROUGE: 0, ORANGE: 1, AMBRE: 2, DONNEES_INSUFFISANTES: 3, VERT: 4 };

/** Hauteur de l'organe sur le corps (ancre 3D) : plus haut = d'abord. Organe sans ancre : en dernier. */
const bodyHeight = (id: OrganId): number => getAnchor(id)?.[1] ?? Number.NEGATIVE_INFINITY;

/** Tri : gravité, puis du haut vers le bas du corps. */
export function sortAlarms(alerts: readonly Alert[]): Alert[] {
  return [...alerts].sort((a, b) => ((LEVEL_RANK[a.level] ?? 9) - (LEVEL_RANK[b.level] ?? 9)) || (bodyHeight(b.organId) - bodyHeight(a.organId)));
}

/** Numéro de repère (1, 2, 3…) de chaque alerte, dans l'ordre de la liste. */
export function alarmNumbers(alerts: readonly Alert[]): Map<string, number> {
  return new Map(sortAlarms(alerts).map((a, i) => [a.id, i + 1]));
}
