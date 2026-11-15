// Ordre et numéros des alarmes de la page Corps : le même dans la liste « Alertes » et sur les annotations 3D.
// Comme un radiologue numérote ses repères sur le cliché et les reprend dans le compte rendu,
// l'alarme n° 2 de la liste est le repère n° 2 sur le corps.
//
// Deux règles :
// - seuls les repères visibles sur la scène sont numérotés (calque affiché, ancre 3D connue, niveau non nominal).
//   Une alerte dont le calque est masqué reste dans la liste, grisée, sans numéro, en fin de liste ;
// - les numéros suivent le corps de haut en bas, donc ils se lisent toujours dans l'ordre sur la scène
//   (les étiquettes de la colonne sont rangées par hauteur d'ancre).
import type { Alert, DayBody, LayerId, Level, OrganId } from '../../types';
import { getAnchor, organLayers } from '../../three/anatomy';

const LEVEL_RANK: Record<Level, number> = { ROUGE: 0, ORANGE: 1, AMBRE: 2, DONNEES_INSUFFISANTES: 3, VERT: 4 };

/** Hauteur de l'organe sur le corps (ancre 3D) : plus haut = d'abord. Organe sans ancre : en dernier. */
const bodyHeight = (id: OrganId): number => getAnchor(id)?.[1] ?? Number.NEGATIVE_INFINITY;

const byHeight = (a: Alert, b: Alert): number => bodyHeight(b.organId) - bodyHeight(a.organId);
const byLevel = (a: Alert, b: Alert): number => (LEVEL_RANK[a.level] ?? 9) - (LEVEL_RANK[b.level] ?? 9);

/** Calques qui portent l'organe de l'alerte (atlas 3D + calque déclaré par la simulation). */
export function alertLayers(alert: Alert, body?: DayBody): LayerId[] {
  const ls = new Set<LayerId>(organLayers(alert.organId));
  const organ = body?.organs.find((o) => o.id === alert.organId);
  if (organ) ls.add(organ.layer);
  return [...ls];
}

/** Le repère de l'alerte est-il dessiné sur la scène ? (même test que les étiquettes 3D) */
export function isOnBody(alert: Alert, layers: Record<LayerId, boolean>, body?: DayBody): boolean {
  if (alert.level === 'VERT') return false; // un repère ne s'affiche jamais en vert
  if (!getAnchor(alert.organId)) return false;
  return alertLayers(alert, body).some((l) => layers[l]);
}

/**
 * Tri de la liste. Jour mesuré : gravité d'abord (comme le champ d'alarme d'un moniteur), puis de haut en bas.
 * Jour projeté : une prévision n'est pas une alarme, la liste suit le corps de haut en bas.
 * Avec `visible`, les alertes absentes de la scène passent en fin de liste.
 */
export function sortAlarms(alerts: readonly Alert[], projected = false, visible?: (a: Alert) => boolean): Alert[] {
  const hidden = (a: Alert): number => (visible && !visible(a) ? 1 : 0);
  return [...alerts].sort((a, b) => hidden(a) - hidden(b) || (projected ? 0 : byLevel(a, b)) || byHeight(a, b));
}

/** Numéro de repère (1, 2, 3…) des alertes visibles sur le corps, de haut en bas. Les autres n'ont pas de numéro. */
export function alarmNumbers(alerts: readonly Alert[], visible: (a: Alert) => boolean): Map<string, number> {
  return new Map([...alerts].filter(visible).sort(byHeight).map((a, i) => [a.id, i + 1]));
}
