// Propriétaire : Mouad (ROADMAP §7). Triage du jour, calculé À BORD (ne dépend jamais du lien Terre).
// Niveau = le plus grave entre :
//   1. les alertes par organe (seuils NASA, tendance 7 j — alerts.ts) ;
//   2. le check-in du matin (règles R13, seuils convenus avec Ahmed) :
//        douleur 3 → ROUGE ; douleur 2 → ORANGE (prévenir le CMO) ; humeur ≤ 2 ET fatigue ≥ 4 → ORANGE.
// Le signal d'humeur (modèle C) et « humeur ≤ 2 trois jours de suite » PROPOSENT un point psy :
// ils s'affichent dans les raisons et la Sol-routine, ils NE CHANGENT PAS le niveau (§8, §11 : jamais imposé).
// Jamais vert par défaut : sans check-in un jour mesuré et sans alerte → DONNEES_INSUFFISANTES.
import type { Alert, CheckIn, Level, TriageResult } from '../types.ts';
import { alertsForDay } from './alerts.ts';
import { getCheckIn } from '../sim/load.ts';
import { DAY_TODAY } from '../sim/persona.ts';
import { moodSignals } from './ml/index.ts';

const SEVERITY: Level[] = ['VERT', 'DONNEES_INSUFFISANTES', 'AMBRE', 'ORANGE', 'ROUGE'];
const worst = (a: Level, b: Level): Level => (SEVERITY.indexOf(b) > SEVERITY.indexOf(a) ? b : a);

const PAIN_ZONE: Record<string, string> = {
  hanche: 'hanche', rachis: 'dos', femur: 'fémur', cuisse: 'cuisse', mollet: 'mollet',
  paravertebraux: 'bas du dos', coeur: 'poitrine', cerveau: 'tête', yeux: 'yeux', reins: 'flanc / reins',
};

/** Ce que le check-in du matin impose (règles R13). */
export function checkInLevel(ci: CheckIn): { level: Level; reasons: string[] } {
  const reasons: string[] = [];
  let level: Level = 'VERT';
  const zone = ci.painZone ? ` (${PAIN_ZONE[ci.painZone] ?? ci.painZone})` : '';
  if (ci.pain >= 3) {
    level = 'ROUGE';
    reasons.push(`Douleur forte 3/3${zone} : prévenir le CMO de bord immédiatement [R13]`);
  } else if (ci.pain === 2) {
    level = 'ORANGE';
    reasons.push(`Douleur modérée 2/3${zone} : prévenir le CMO de bord dans la journée [R13]`);
  }
  if (ci.mood <= 2 && ci.fatigue >= 4) {
    level = worst(level, 'ORANGE');
    reasons.push(`Humeur ${ci.mood}/5 avec fatigue ${ci.fatigue}/5 : prévenir le CMO de bord [R13]`);
  }
  return { level, reasons };
}

const moodAlertDays = (() => {
  let days: Set<number> | null = null;
  return () => (days ??= new Set(moodSignals().filter(s => s.alert).map(s => s.day)));
})();

function groundRoutineFor(alerts: Alert[], psy: boolean): string[] {
  const has = (...ids: string[]) => alerts.some(a => ids.includes(a.organId as string));
  const out: string[] = [];
  if (has('hanche', 'rachis', 'femur')) out.push('Os : réévaluer les bisphosphonates avec le médecin au sol');
  if (has('coeur')) out.push('Aérobie : faire valider le protocole par intervalles');
  if (has('yeux')) out.push('Risque SANS : transmettre les mesures de la gaine du nerf optique');
  if (has('reins')) out.push('Reins : avis sur le risque de calculs (calcium urinaire)');
  if (has('sang')) out.push('Sang : faire relire les valeurs hors référence');
  if (has('dose')) out.push('Exposition : bilan de dose avec le radioprotectionniste');
  if (psy) out.push('Moral : point psy proposé à l\'astronaute (il choisit de le partager ou non)');
  return out;
}

const cache = new Map<number, TriageResult>();

export function triage(day: number): TriageResult {
  const ci = day >= 0 && day <= DAY_TODAY ? getCheckIn(day) : null;
  const key = day;
  // le check-in du jour peut être saisi en direct : on ne met en cache que les jours sans saisie possible
  const cacheable = day !== DAY_TODAY;
  const hit = cacheable ? cache.get(key) : undefined;
  if (hit) return structuredClone(hit);

  const alerts = alertsForDay(day);
  let level: Level = alerts.reduce<Level>((l, a) => worst(l, a.level), 'VERT');
  const reasons = alerts.map(a => `${a.title} [${a.rule}]`);

  if (ci) {
    const c = checkInLevel(ci);
    level = worst(level, c.level);
    const pain = ci.pain > 0 ? `douleur ${ci.pain}/3` : 'aucune douleur';
    reasons.push(`Check-in : humeur ${ci.mood}/5, fatigue ${ci.fatigue}/5, ${pain}, sommeil ressenti ${ci.sleepFelt}/5`);
    reasons.push(...c.reasons);
  } else if (day >= 0 && day <= DAY_TODAY) {
    reasons.push('Check-in du matin manquant : à faire avant toute décision');
    if (level === 'VERT') level = 'DONNEES_INSUFFISANTES';
  } else if (day > DAY_TODAY) {
    reasons.push(`Projection J${day} : statuts issus des modèles, pas de check-in`);
  }

  // humeur basse 3 jours de suite (règle §8) ou signal du modèle C → point psy PROPOSÉ, niveau inchangé
  const low3 = day <= DAY_TODAY && [0, 1, 2].every(k => (getCheckIn(day - k)?.mood ?? 5) <= 2);
  const mlMood = moodAlertDays().has(day);
  if (low3) reasons.push('Humeur ≤ 2 trois jours de suite : point psy proposé, jamais imposé');
  if (mlMood) reasons.push('Signal d\'humeur (modèle C [H]) : glissement par rapport à la référence personnelle, point psy proposé');

  const out: TriageResult = { level, reasons, groundRoutine: groundRoutineFor(alerts, low3 || mlMood) };
  if (cacheable) cache.set(key, out);
  return structuredClone(out);
}
