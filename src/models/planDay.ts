// Propriétaire : Mouad (ROADMAP §7, §8). To-do du jour, fixée le matin (« le protocole décide, pas le moi du soir »).
// Tirée du triage (alertes d'organe + check-in + signal d'humeur), avec les contenus de Steve (src/content/library.ts) :
// l'id d'un item = l'id de la bibliothèque (« ared-squat », « menu-calcium-vitd »…), la montre coche par id (Ahmed).
// Règles (§8) :
//   ROUGE ou check-in qui l'exige → « Prévenir le CMO » EN TÊTE ;
//   os AMBRE → ARED squat + soulevé de terre, menu calcium / vitamine D, analyse d'urine, Sol-routine ;
//   VO₂ AMBRE → intervalles (vélo / tapis en alternance) ; muscle → ARED ciblé ; nerf optique → test de vision + Sol-routine ;
//   calcium urinaire → menu anti-calculs + échographie des reins ; donnée manquante ou expirée → test à faire ;
//   humeur (modèle C ou 3 jours ≤ 2) → point psy PROPOSÉ ; aucune alerte → entretien.
// Un seul menu par jour (le plus prioritaire). Toujours renvoyer une copie : cocher n'altère pas le plan.
import type { Alert, CheckIn, TodoItem } from '../types.ts';
import { getExercise, getMeal, getTest } from '../content/library.ts';
import { getCheckIn } from '../sim/load.ts';
import { DAY_END, DAY_TODAY } from '../sim/persona.ts';
import { alertsForDay } from './alerts.ts';
import { BLOOD_MAX_AGE_DAYS, bloodAgeDays, checkInLevel, triage } from './triage.ts';
import { reasoningId } from './explain.ts';

type Draft = Omit<TodoItem, 'done' | 'reasoningId'> & { topic: string };

const ex = (id: string, time: string, topic: string, priority: 1 | 2 | 3): Draft => {
  const e = getExercise(id);
  return {
    id, kind: 'exercice', time, topic, priority,
    title: e?.title ?? id,
    detail: e ? [e.sets, e.intensity, `${e.durationMin} min`, e.device !== 'sans appareil' ? e.device : null].filter(Boolean).join(' · ') : '',
  };
};
const meal = (id: string, time: string, topic: string, priority: 1 | 2 | 3): Draft => {
  const m = getMeal(id);
  return {
    id, kind: 'repas', time, topic, priority,
    title: m?.title ?? id,
    detail: m ? `${m.items.join(' · ')} — ${m.kcal} kcal · ${m.proteinsG} g protéines · ${m.calciumMg} mg calcium` : '',
  };
};
const test = (id: string, time: string, topic: string, priority: 1 | 2 | 3, extra = ''): Draft => {
  const t = getTest(id);
  return { id, kind: 'test', time, topic, priority, title: t?.title ?? id, detail: `${t?.detail ?? ''}${extra}`.trim() };
};
const medical = (id: string, time: string, topic: string, priority: 1 | 2 | 3, title: string, detail: string): Draft =>
  ({ id, kind: 'medical', time, topic, priority, title, detail });

function drafts(day: number, alerts: Alert[], ci: CheckIn | null, psy: boolean): Draft[] {
  const has = (...ids: string[]) => alerts.some(a => ids.includes(a.organId as string));
  const measured = day <= DAY_TODAY;
  const out: Draft[] = [];

  // --- médical en tête ---
  const ciLevel = ci ? checkInLevel(ci).level : 'VERT';
  if (alerts.some(a => a.level === 'ROUGE') || ciLevel === 'ROUGE' || ciLevel === 'ORANGE') {
    const why = ci && ciLevel !== 'VERT' ? checkInLevel(ci).reasons[0] : 'Seuil rouge franchi';
    out.push(medical('prevenir-cmo', '06:45', 'r-cmo', 1, 'Prévenir le CMO de bord', `${why.replace(/ :.*$/, '')} : point avec le CMO avant toute séance.`));
  }

  // --- tests ---
  if (measured) {
    out.push(test('test-checkin', '07:00', 'r-checkin', ci ? 2 : 1, ci ? '' : ' Pas encore fait aujourd\'hui : sans lui, aucun statut vert.'));
    const age = bloodAgeDays(day);
    if (day % 7 === 0 || age > BLOOD_MAX_AGE_DAYS) {
      out.push(test('test-prelevement', '07:10', 'r-prelevement', age > BLOOD_MAX_AGE_DAYS ? 1 : 2,
        age > BLOOD_MAX_AGE_DAYS && Number.isFinite(age) ? ` Dernier prélèvement il y a ${age} jours : donnée expirée.` : ''));
    }
  }
  const bone = has('hanche', 'rachis', 'femur');
  if (bone || has('reins')) out.push(test('test-urine', '07:05', 'r-urine', 2));
  if (has('yeux')) out.push(test('test-vision', '10:30', 'r-nerf-optique', 2));
  if (has('reins')) out.push(test('test-echo-reins', '10:45', 'r-calcium-urinaire', 2));

  // --- exercices ---
  if (bone || has('cuisse')) out.push(ex('ared-squat', '07:30', bone ? 'r-hanche-ared' : 'r-cuisse-tendance', 1));
  if (bone || has('paravertebraux')) out.push(ex('ared-souleve-de-terre', '08:00', bone ? 'r-hanche-ared' : 'r-cuisse-tendance', bone ? 1 : 2));
  if (has('mollet')) out.push(ex('ared-mollets', '08:20', 'r-mollet', 2));
  if (has('coeur')) out.push(ex(day % 2 === 0 ? 'velo-intervalles' : 'tapis-intervalles', '16:00', 'r-vo2-intervalles', 1));
  if (ci && ci.pain >= 1 && (ci.painZone === 'paravertebraux' || ci.painZone === 'rachis')) out.push(ex('mobilite-dos', '18:00', 'r-dos', 2));
  if (ci && (ci.fatigue >= 4 || ci.sleepFelt <= 2)) out.push(ex('respiration', '21:00', 'r-fatigue', 3));
  if (!alerts.length) {
    out.push(ex('ared-squat', '07:30', 'r-entretien', 3));
    out.push(ex(day % 2 === 0 ? 'velo-continu' : 'tapis-continu', '16:00', 'r-entretien', 3));
  }

  // --- un seul menu : reins > os > muscle > standard ; dîner léger si le sommeil se dégrade ---
  if (has('reins')) out.push(meal('menu-anti-calculs', '12:30', 'r-calcium-urinaire', 2));
  else if (bone) out.push(meal('menu-calcium-vitd', '12:30', 'r-hanche-nutrition', 2));
  else if (has('cuisse', 'mollet', 'paravertebraux')) out.push(meal('menu-proteines', '12:30', 'r-cuisse-proteines', 2));
  else out.push(meal('menu-standard', '12:30', 'r-entretien', 3));
  if (ci && ci.sleepFelt <= 2) out.push(meal('menu-diner-leger', '19:00', 'r-fatigue', 3));

  // --- médical ---
  if (bone || has('yeux', 'coeur')) {
    out.push(medical('sol-routine', '14:00', 'r-sol-routine', 2, 'Point « Sol-routine » avec le médecin au sol',
      'Message différé : bisphosphonates, risque SANS, protocole aérobie. Réponse attendue dans ENSUITE.'));
  }
  if (has('dose')) {
    out.push(medical('revue-dose', '15:00', 'r-dose', 2, 'Revue de la dose cumulée avec le CMO',
      'Dose cumulée au-dessus du repère : revoir le temps passé hors de la zone la mieux protégée.'));
  }
  if (psy) {
    out.push(medical('point-psy', '17:30', 'r-psy', 3, 'Point psy (proposé, jamais imposé)',
      'Le signal d\'humeur s\'écarte de votre référence : un échange est proposé, vous décidez.'));
  }
  return out;
}

const cache = new Map<number, TodoItem[]>();

/** To-do du jour, fixée le matin. Copie défensive : `done` modifiable sans effet de bord. */
export function planDay(day: number): TodoItem[] {
  const d = Math.max(0, Math.min(DAY_END, Math.round(day)));
  const cacheable = d !== DAY_TODAY;     // le check-in du jour peut être saisi en direct
  let items = cacheable ? cache.get(d) : undefined;
  if (!items) {
    const t = triage(d);
    const ci = d <= DAY_TODAY ? getCheckIn(d) : null;
    const psy = t.groundRoutine.some(g => /point psy/.test(g));
    const seen = new Set<string>();
    items = drafts(d, alertsForDay(d), ci, psy)
      .filter(x => (seen.has(x.id) ? false : (seen.add(x.id), true)))
      .sort((a, b) => (a.kind === 'medical' && a.priority === 1 ? -1 : 0) - (b.kind === 'medical' && b.priority === 1 ? -1 : 0)
        || (a.time ?? '99').localeCompare(b.time ?? '99'))
      .map(({ topic, ...rest }) => ({ ...rest, done: false, reasoningId: reasoningId(topic, d) }));
    if (cacheable) cache.set(d, items);
  }
  return items.map(i => ({ ...i }));
}
