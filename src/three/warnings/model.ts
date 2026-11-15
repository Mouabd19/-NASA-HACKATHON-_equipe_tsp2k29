// Dérive la liste des warnings à afficher (pur) : alertes du jour × calques actifs × ancres 3D.
import { sentenceCase } from '../../ui/format';
import type { Alert, Color, LayerId, Level, OrganId } from '../../types';
import { levelColor, levelLabel } from '../../ui/tokens';
import { DAY_TODAY } from '../../mocks/mission';
import { alertsForDayPlan } from '../../models/alerts';
import { getDayBodyPlan } from '../../sim/load';
import * as anatomy from '../anatomy';

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
  for (const alert of alertsForDayPlan(day, adherence)) {
    if (alert.level === 'VERT') continue; // un warning ne s'affiche jamais en vert
    const anchor = anatomy.getAnchor(alert.organId);
    if (!anchor) continue;
    const organ = body.organs.find((o) => o.id === alert.organId);
    const ls = new Set<LayerId>(anatomy.organLayers?.(alert.organId) ?? []);
    if (organ) ls.add(organ.layer);
    let active = false;
    for (const l of ls) if (layers[l]) active = true;
    if (!active) continue;
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
      ruleLabel: ruleLabel(alert.rule),
      leaving: false,
    });
  }
  return out;
}
