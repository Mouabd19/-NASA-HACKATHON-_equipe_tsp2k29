// Dérive la liste des warnings à afficher (pur) : alertes du jour × calques actifs × ancres 3D.
import { sentenceCase } from '../../ui/format';
import type { Alert, Color, LayerId, Level, OrganId } from '../../types';
import { levelColor } from '../../ui/tokens';
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
  /** +1 = plaque à droite de l'écran, −1 = à gauche. */
  side: 1 | -1;
  projected: boolean;
  /** Nom court de la zone, en capitales (« HANCHE »). */
  label: string;
  levelLabel: string;
  /** Règle appliquée, avec son étiquette d'honnêteté (« NASA V1 4027 »). */
  ruleLabel: string;
  leaving: boolean;
}

const LEVEL_LABEL: Record<Level, string> = {
  VERT: 'NOMINAL',
  AMBRE: 'AMBRE',
  ORANGE: 'ORANGE',
  ROUGE: 'ROUGE',
  DONNEES_INSUFFISANTES: 'DONNÉES INSUFF.',
};

function ruleLabel(rule: string): string {
  return /^V\d /.test(rule) ? `NASA ${rule}` : rule;
}

export function warnItems(day: number, layers: Record<LayerId, boolean>, adherence = 0): WarnItem[] {
  const body = getDayBodyPlan(day, adherence);
  const out: WarnItem[] = [];
  let left = 0, right = 0;
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
    // +X du corps = droite de l'écran (corps de face). Ancre centrale : on équilibre les colonnes.
    const side: 1 | -1 = Math.abs(anchor[0]) < 0.01 ? (right <= left ? 1 : -1) : anchor[0] > 0 ? 1 : -1;
    if (side > 0) right++; else left++;
    out.push({
      key: alert.id,
      alert,
      organId: alert.organId,
      color: levelColor[alert.level] === 'green' ? 'grey' : levelColor[alert.level],
      anchor,
      side,
      projected: day > DAY_TODAY,
      label: sentenceCase(alert.title.split(' — ')[0] || String(alert.organId)),
      levelLabel: sentenceCase(LEVEL_LABEL[alert.level]),
      ruleLabel: ruleLabel(alert.rule),
      leaving: false,
    });
  }
  return out;
}
