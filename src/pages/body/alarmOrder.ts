// Ordre et numéros des alarmes de la page Corps : le même dans la liste « Alertes » et sur les annotations 3D.
// Comme un radiologue numérote ses repères sur le cliché et les reprend dans le compte rendu,
// l'alarme n° 2 de la liste est le repère n° 2 sur le corps.
//
// Règles :
// - les numéros sont fixés une fois pour la journée : ils ne dépendent pas des calques cochés. Le présentateur
//   peut dire « repère 2, la hanche » puis afficher tous les calques, le 2 reste la hanche ;
// - toute alerte non nominale qui a une ancre 3D reçoit un numéro. D'abord celles des calques affichés par défaut
//   (squelette, muscles, organes), de haut en bas, puis les autres, de haut en bas. Avec les calques par défaut,
//   la scène se lit donc 1, 2, 3… ;
// - une alerte dont le calque est masqué garde son numéro, en gris, en fin de liste, avec « Calque masqué ».
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
 * Tri de la liste. Jour mesuré : gravité d'abord (comme le champ d'alarme d'un moniteur), puis numéro de repère.
 * Jour projeté : une prévision n'est pas une alarme, la liste suit les numéros de repère.
 * Avec `visible`, les alertes absentes de la scène passent en fin de liste.
 */
export function sortAlarms(alerts: readonly Alert[], projected = false, visible?: (a: Alert) => boolean, body?: DayBody): Alert[] {
  const hidden = (a: Alert): number => (visible && !visible(a) ? 1 : 0);
  const nums = alarmNumbers(alerts, body);
  const num = (a: Alert): number => nums.get(a.id) ?? Number.POSITIVE_INFINITY;
  return [...alerts].sort((a, b) => hidden(a) - hidden(b) || (projected ? 0 : byLevel(a, b)) || (num(a) - num(b)) || byHeight(a, b));
}

/** Calques affichés à l'ouverture de la page Corps (même valeur que le store). */
export const DEFAULT_LAYERS: Record<LayerId, boolean> = {
  squelette: true, muscles: true, organes: true, cardio: false, nerveux: false, exposition: false,
};

/**
 * Numéro de repère (1, 2, 3…) de chaque alerte non nominale qui a une ancre 3D, stable pour la journée :
 * calques par défaut d'abord, puis les autres, chaque groupe de haut en bas. Indépendant des calques cochés.
 */
export function alarmNumbers(alerts: readonly Alert[], body?: DayBody): Map<string, number> {
  const group = (a: Alert): number => (isOnBody(a, DEFAULT_LAYERS, body) ? 0 : 1);
  return new Map(
    alerts
      .filter((a) => a.level !== 'VERT' && getAnchor(a.organId))
      .sort((a, b) => group(a) - group(b) || byHeight(a, b))
      .map((a, i) => [a.id, i + 1]),
  );
}
