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
import { getBloodTests, getCheckIn } from '../sim/load.ts';
import { getRealBaseline, getRealSeries } from '../ingest/realData.ts';
import { zScore } from '../ingest/baseline30d.ts';
import { DAY_TODAY } from '../sim/persona.ts';
import { moodSignals } from './ml/index.ts';

const SEVERITY: Level[] = ['VERT', 'DONNEES_INSUFFISANTES', 'AMBRE', 'ORANGE', 'ROUGE'];
const worst = (a: Level, b: Level): Level => (SEVERITY.indexOf(b) > SEVERITY.indexOf(a) ? b : a);

const PAIN_ZONE: Record<string, string> = {
  hanche: 'hip', rachis: 'back', femur: 'femur', cuisse: 'thigh', mollet: 'calf',
  paravertebraux: 'lower back', coeur: 'chest', cerveau: 'head', yeux: 'eyes', reins: 'flank / kidneys',
};

/** Ce que le check-in du matin impose (règles R13). */
export function checkInLevel(ci: CheckIn): { level: Level; reasons: string[] } {
  const reasons: string[] = [];
  let level: Level = 'VERT';
  const zone = ci.painZone ? ` (${PAIN_ZONE[ci.painZone] ?? ci.painZone})` : '';
  if (ci.pain >= 3) {
    level = 'ROUGE';
    reasons.push(`Severe pain 3/3${zone}: notify the CMO immediately [R13]`);
  } else if (ci.pain === 2) {
    level = 'ORANGE';
    reasons.push(`Moderate pain 2/3${zone}: notify the CMO today [R13]`);
  }
  if (ci.mood <= 2 && ci.fatigue >= 4) {
    level = worst(level, 'ORANGE');
    reasons.push(`Mood ${ci.mood}/5 with fatigue ${ci.fatigue}/5: notify the CMO [R13]`);
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
  if (has('hanche', 'rachis', 'femur')) out.push('Bone: reassess bisphosphonates with the ground flight surgeon');
  if (has('coeur')) out.push('Aerobic: get the interval protocol approved');
  if (has('yeux')) out.push('SANS risk: send the optic nerve sheath measurements');
  if (has('reins')) out.push('Kidneys: advice on kidney stone risk (urinary calcium)');
  if (has('sang')) out.push('Blood: have out-of-range values reviewed');
  if (has('dose')) out.push('Radiation: dose review with the radiation health officer');
  if (psy) out.push('Morale: psych session offered to the astronaut (they choose whether to share it)');
  return out;
}

/** Prélèvement hebdomadaire : au-delà de 7 jours, la donnée est expirée (§8, cas limites). */
export const BLOOD_MAX_AGE_DAYS = 7;
/** Au-delà de 14 jours sans prélèvement, aucun statut vert n'est possible. */
const BLOOD_STALE_DAYS = 14;

/** Jours depuis le dernier prélèvement ≤ day (Infinity s'il n'y en a aucun). */
export function bloodAgeDays(day: number): number {
  const last = getBloodTests('crp').filter(b => b.day <= day).at(-1)?.day;
  return last === undefined ? Infinity : day - last;
}

/**
 * Fusion des VRAIES données de la montre du présentateur (ingest d'Ahmed) dans le triage du jour.
 * On compare sa dernière fréquence cardiaque au repos à SA référence sur 30 jours (z-score) :
 * |z| ≥ 2 → au moins AMBRE, étiqueté RÉEL. Aucune donnée réelle → rien (la simulation reste la source).
 */
export function realWatchCheck(): { level: Level; reason: string } | null {
  const rhr = getRealSeries('RestingHeartRate');
  const last = rhr.at(-1);
  if (!last) return null;
  const z = zScore(last.value, getRealBaseline('RestingHeartRate'));
  if (z === null) return { level: 'VERT', reason: `REAL watch: resting HR ${Math.round(last.value)} bpm (insufficient personal baseline)` };
  const off = Math.abs(z) >= 2;
  return {
    level: off ? 'AMBRE' : 'VERT',
    reason: `REAL watch: resting HR ${Math.round(last.value)} bpm, ${z >= 0 ? '+' : '−'}${Math.abs(z).toFixed(1)} SD vs 30-day personal baseline${off ? ' → recheck' : ''}`,
  };
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
    const pain = ci.pain > 0 ? `pain ${ci.pain}/3` : 'no pain';
    reasons.push(`Check-in: mood ${ci.mood}/5, fatigue ${ci.fatigue}/5, ${pain}, perceived sleep ${ci.sleepFelt}/5`);
    reasons.push(...c.reasons);
  } else if (day >= 0 && day <= DAY_TODAY) {
    reasons.push('Morning check-in missing: complete it before any decision');
    if (level === 'VERT') level = 'DONNEES_INSUFFISANTES';
  } else if (day > DAY_TODAY) {
    reasons.push(`Projection D${day}: statuses from the models, no check-in`);
  }

  // cas limites : prélèvement expiré → jamais de vert
  if (day >= 0 && day <= DAY_TODAY) {
    const age = bloodAgeDays(day);
    if (age > BLOOD_MAX_AGE_DAYS) {
      reasons.push(Number.isFinite(age) ? `Blood draw expired (last one ${age} days ago): repeat it` : 'No blood draw available: schedule one');
      if (age > BLOOD_STALE_DAYS && level === 'VERT') level = 'DONNEES_INSUFFISANTES';
    }
  }

  // aujourd'hui : vraies données de la montre du présentateur
  if (day === DAY_TODAY) {
    const w = realWatchCheck();
    if (w) { reasons.push(w.reason); level = worst(level, w.level); }
  }

  // humeur basse 3 jours de suite (règle §8) ou signal du modèle C → point psy PROPOSÉ, niveau inchangé
  const low3 = day <= DAY_TODAY && [0, 1, 2].every(k => (getCheckIn(day - k)?.mood ?? 5) <= 2);
  const mlMood = moodAlertDays().has(day);
  if (low3) reasons.push('Mood ≤ 2 three days in a row: psych session offered, never imposed');
  if (mlMood) reasons.push('Mood signal (model C [H]): drift from personal baseline, psych session offered');

  const out: TriageResult = { level, reasons, groundRoutine: groundRoutineFor(alerts, low3 || mlMood) };
  if (cacheable) cache.set(key, out);
  return structuredClone(out);
}
