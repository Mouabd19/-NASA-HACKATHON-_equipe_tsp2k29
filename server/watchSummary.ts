// Propriétaire : Ahmed (B). Résumé du jour pour l'Apple Watch (GET /api/watch/summary), en lecture seule,
// et réception du check-in du navigateur (POST /api/checkin).
// Tout est recalculé avec les modèles de l'app (triage, router, planDay, corps du jour), comme la War Room.
// Ce module importe les données simulées via import.meta.glob : il doit être chargé par Vite (ssrLoadModule), voir api.ts.
// Le check-in reçu est enregistré dans CE graphe de modules (src/ingest/checkin.ts, repli en mémoire côté Node) :
// getCheckIn() le lit donc exactement comme dans le navigateur, et le triage de la montre suit celui de l'écran.
// Contrat : Watch/MissionStore.swift (WatchSummary) de l'app montre. Les valeurs d'énumération restent stables.
import type { CheckIn, Color, Level, Measurement, Tag, TodoItem } from '../src/types.ts';
import { triage } from '../src/models/triage.ts';
import { router } from '../src/models/router.ts';
import { planDay } from '../src/models/planDay.ts';
import { alertsForDay } from '../src/models/alerts.ts';
import { getCheckIn, getDayBody } from '../src/sim/load.ts';
import { DAY_END, DAY_SOL0, DAY_TODAY, dayToDate } from '../src/sim/persona.ts';
import { isConjunction, lightTimeMin, lightTimeSource } from '../src/content/horizons.ts';
import { clearCheckIn, isValidCheckIn, painZonesOf, saveCheckIn } from '../src/ingest/checkin.ts';
import { levelLabel } from '../src/ui/tokens.ts';
import { sentenceCase } from '../src/ui/format.ts';
import type { ApiState } from './handlers.ts';

export const WATCH_SUMMARY_VERSION = 1;

const LEVEL_COLOR: Record<Level, Color> = {
  VERT: 'green', AMBRE: 'amber', ORANGE: 'amber', ROUGE: 'red', DONNEES_INSUFFISANTES: 'grey',
};
const DECIDEUR: Record<string, string> = { moi: 'You', CMO: 'Crew medical officer', sol: 'Ground flight surgeon', equipage: 'Crew' };

/** Zone du corps où placer l'alerte sur la silhouette de la montre. */
const ZONE: Record<string, string> = {
  yeux: 'tete', cerveau: 'tete', coeur: 'thorax', poumons: 'thorax', sang: 'thorax', foie: 'abdomen', reins: 'abdomen',
  rachis: 'dos', paravertebraux: 'dos', hanche: 'bassin', femur: 'cuisse', cuisse: 'cuisse', mollet: 'mollet', dose: 'corps',
};
const PAIN_NAME: Record<string, string> = { hanche: 'Hip', rachis: 'Back', cuisse: 'Thigh', mollet: 'Calf', cerveau: 'Head', yeux: 'Eyes' };

export interface WatchMetric {
  key: string; label: string; value: number | null; unit: string;
  color: Color; tag: Tag; provenance: 'SIMULÉ' | 'RÉEL'; date?: string;
}

export interface WatchSummary {
  version: number;
  generatedAt: string;
  persona: { name: string; tag: 'Persona' };
  provenance: 'SIMULÉ';
  mission: {
    day: number; totalDays: number; sol0Day: number; daysToSol0: number; date: string; phase: string;
    delayMin: number | null; delayTag: Tag; conjunction: boolean;
  };
  checkin: { source: 'simulated' | 'manual' | 'none' };
  triage: { level: Level; label: string; color: Color; reasons: string[] };
  now: { text: string };
  next: { decideur: string; who: string; text: string; reponseMin: number | null };
  alerts: { organId: string; name: string; level: Level; color: Color; title: string; finding: string; rule: string; zone: string }[];
  todo: { total: number; done: number; source: 'serveur' | 'plan' };
  metrics: WatchMetric[];
  live: { heartRate: { value: number; date: string; provenance: 'RÉEL' } | null };
}

function phaseLabel(day: number): string {
  if (day <= 0) return 'Launch';
  if (day < DAY_SOL0) return 'Outbound cruise';
  if (day === DAY_SOL0) return 'Mars arrival';
  if (day < DAY_END) return 'Surface';
  return 'End of mission';
}

const round1 = (v: number) => Math.round(v * 10) / 10;

/** Dernière mesure réelle reçue d'un type (la plus récente par date d'échantillon). */
function latestLive(live: Measurement[], type: Measurement['type']): Measurement | null {
  return live.filter((m) => m.type === type && m.source !== 'simulated')
    .reduce<Measurement | null>((a, m) => (!a || Date.parse(m.date) >= Date.parse(a.date) ? m : a), null);
}

/** POST /api/checkin : le check-in du navigateur ({…} pour l'enregistrer, {clear: true} pour l'effacer). */
export function receiveCheckIn(body: unknown): { ok: true } | string {
  if (body && typeof body === 'object' && (body as { clear?: unknown }).clear) { clearCheckIn(); return { ok: true }; }
  if (!isValidCheckIn(body)) return 'Invalid check-in';
  saveCheckIn(body as CheckIn);
  return { ok: true };
}

/** Plan du jour de la persona (J94), pour remplir la to-do du serveur avant l'ouverture de la War Room. */
export function planToday(): TodoItem[] {
  return planDay(DAY_TODAY).map((t) => ({ ...t, done: false }));
}

/** Le résumé du jour `day` (J94 par défaut), avec l'état du serveur (coches de la to-do, mesures reçues). */
export function watchSummary(state: ApiState, day: number = DAY_TODAY, now: Date = new Date()): WatchSummary {
  const d = Math.max(0, Math.min(DAY_END, Math.round(day)));
  const date = dayToDate(d);
  const t = triage(d);
  const delay = lightTimeMin(date);
  const conjunction = isConjunction(date);
  const out = router(t, conjunction ? 'Conjonction' : 'MarsScenario', delay);
  const body = getDayBody(d);
  const organName = (id: string) => body.organs.find((o) => o.id === id)?.name ?? id;
  const ci = getCheckIn(d);

  const SEVERITY: Level[] = ['ROUGE', 'ORANGE', 'AMBRE', 'DONNEES_INSUFFISANTES', 'VERT'];
  const modelAlerts = alertsForDay(d)
    .filter((a) => a.level !== 'VERT')
    .sort((a, b) => SEVERITY.indexOf(a.level) - SEVERITY.indexOf(b.level))
    .map((a) => ({
      organId: String(a.organId), name: organName(String(a.organId)), level: a.level, color: LEVEL_COLOR[a.level],
      title: sentenceCase(a.title),
      // « HIP — ESTIMATED BONE LOSS » → « estimated bone loss » (une ligne sur la montre)
      finding: (() => { const f = sentenceCase(a.title).split(' — ')[1] ?? ''; return /^\p{Lu}\p{Ll}/u.test(f) ? f.charAt(0).toLocaleLowerCase('en') + f.slice(1) : f; })(),
      rule: a.rule, zone: ZONE[String(a.organId)] ?? 'corps',
    }));

  // Une douleur déclarée au check-in s'allume sur le corps de la montre, au niveau du triage.
  const pain = ci && ci.source === 'manual' && ci.pain > 0 ? painZonesOf(ci).filter((z) => PAIN_NAME[z]) : [];
  const painAlerts = pain.map((z) => ({
    organId: String(z), name: PAIN_NAME[z], level: t.level, color: LEVEL_COLOR[t.level],
    title: `${PAIN_NAME[z]} — pain ${ci!.pain}/3 at check-in`, finding: `pain ${ci!.pain}/3 at check-in`,
    rule: 'CHECK-IN', zone: ZONE[String(z)] ?? 'corps',
  }));
  const alerts = [...painAlerts, ...modelAlerts.filter((a) => !pain.includes(a.organId as never))];

  // To-do : l'état du serveur fait foi (coches de la montre et de la War Room) ; sinon le plan du jour.
  const plan: TodoItem[] = state.todo.length ? state.todo : planDay(d);

  const metric = (organ: string, key: string): WatchMetric | null => {
    const m = body.organs.find((o) => o.id === organ)?.metrics.find((x) => x.key === key);
    if (!m) return null;
    return {
      key, label: m.label, value: Number.isFinite(m.value) ? round1(m.value) : null, unit: m.unit,
      color: Number.isFinite(m.value) ? m.color : 'grey', tag: m.tag, provenance: 'SIMULÉ',
    };
  };
  const metrics = [metric('sang', 'fc_repos'), metric('sang', 'spo2'), metric('coeur', 'vo2_pct')]
    .filter((m): m is WatchMetric => m !== null);

  const hr = latestLive(state.live, 'HeartRate');

  return {
    version: WATCH_SUMMARY_VERSION,
    generatedAt: now.toISOString(),
    persona: { name: 'Haddad', tag: 'Persona' },
    provenance: 'SIMULÉ',
    mission: {
      day: d, totalDays: DAY_END, sol0Day: DAY_SOL0, daysToSol0: Math.max(0, DAY_SOL0 - d), date, phase: phaseLabel(d),
      delayMin: Number.isFinite(delay) ? round1(delay) : null,
      delayTag: lightTimeSource(date) === 'table' ? 'Publié' : 'H',
      conjunction,
    },
    checkin: { source: ci ? ci.source : 'none' },
    triage: { level: t.level, label: levelLabel[t.level], color: LEVEL_COLOR[t.level], reasons: t.reasons.slice(0, 4) },
    now: { text: out.maintenant },
    next: {
      decideur: out.ensuite.decideur, who: DECIDEUR[out.ensuite.decideur] ?? out.ensuite.decideur,
      text: out.ensuite.texte, reponseMin: out.ensuite.reponseMin ?? null,
    },
    alerts,
    todo: { total: plan.length, done: plan.filter((i) => i.done).length, source: state.todo.length ? 'serveur' : 'plan' },
    metrics,
    live: { heartRate: hr ? { value: hr.value, date: hr.date, provenance: 'RÉEL' } : null },
  };
}
