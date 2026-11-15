// Dérive la liste des warnings à afficher (pur) : alertes du jour × calques actifs × ancres 3D.
import { sentenceCase } from '../../ui/format';
import type { Alert, Color, LayerId, Level, OrganId } from '../../types';
import { levelColor, levelLabel } from '../../ui/tokens';
import { DAY_TODAY } from '../../mocks/mission';
import { alertsForDayPlan } from '../../models/alerts';
import { getDayBodyPlan } from '../../sim/load';
import * as anatomy from '../anatomy';
import { alarmNumbers, isOnBody } from '../../pages/body/alarmOrder';

export interface WarnItem {
  key: string;
  alert: Alert;
  organId: OrganId;
  color: Color;
  /** Position de l'ancre dans le repère du corps (mètres). */
  anchor: [number, number, number];
  /** +1 = étiquette à droite de l'écran, −1 = à gauche. */
  side: 1 | -1;
  projected: boolean;
  /** Nom court de la zone (« Hanche »). */
  label: string;
  levelLabel: string;
  /** Niveau de triage (priorité d'alarme : ROUGE haute, ORANGE moyenne, AMBRE basse). */
  level: Level;
  /** Numéro de repère, le même que dans la liste « Alertes ». */
  num: number;
  /** Règle appliquée (« NASA V1 4027 », « Tendance 7 j ») — affichée en infobulle et en mode Détails. */
  ruleLabel: string;
  leaving: boolean;
}

const LEVEL_LABEL: Record<Level, string> = levelLabel;

/** Étiquettes par colonne : toutes à droite tant que la colonne tient, la gauche ne sert qu'au débordement. */
const COLUMN_MAX = 9;

function ruleLabel(rule: string): string {
  if (/^V\d /.test(rule)) return `NASA ${rule}`;
  // « TENDANCE-7J » → « Tendance 7 j » (espace insécable, comme partout ailleurs dans l'interface)
  return sentenceCase(rule.replace(/-/g, ' ')).replace(/(\d)\s*j\b/gi, '$1\u00a0j');
}

export function warnItems(day: number, layers: Record<LayerId, boolean>, adherence = 0): WarnItem[] {
  const body = getDayBodyPlan(day, adherence);
  const out: WarnItem[] = [];
  let right = 0;
  const all = alertsForDayPlan(day, adherence);
  // numéros : seulement les repères visibles, de haut en bas (ils se lisent dans l'ordre dans la colonne)
  const nums = alarmNumbers(all, (a) => isOnBody(a, layers, body));
  for (const alert of all) {
    if (!isOnBody(alert, layers, body)) continue;
    const anchor = anatomy.getAnchor(alert.organId)!;
    // Une seule colonne régulière, à droite du corps (la carte de survol se pose à gauche).
    const side: 1 | -1 = right < COLUMN_MAX ? 1 : -1;
    if (side > 0) right++;
    out.push({
      key: alert.id,
      alert,
      organId: alert.organId,
      color: levelColor[alert.level] === 'green' ? 'grey' : levelColor[alert.level],
      anchor,
      side,
      projected: day > DAY_TODAY,
      label: sentenceCase(alert.title.split(' — ')[0] || String(alert.organId)),
      levelLabel: LEVEL_LABEL[alert.level],
      level: alert.level,
      num: nums.get(alert.id) ?? 0,
      ruleLabel: ruleLabel(alert.rule),
      leaving: false,
    });
  }
  return out;
}
