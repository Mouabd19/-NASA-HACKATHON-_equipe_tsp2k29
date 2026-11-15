// Propriétaire : Ahmed (B). Logique de l'API locale, en fonctions pures (testées sans serveur).
import type { Measurement, TodoItem } from '../src/types.ts';

export interface ApiState {
  todo: TodoItem[];
  live: Measurement[]; // mesures reçues en direct (Raccourci iOS), plus récente en dernier
}

export interface ApiRequest {
  method: string;
  path: string; // sans la query string
  query: URLSearchParams;
  body?: unknown;
}

export interface ApiResponse {
  status: number;
  json: unknown;
  changed?: boolean; // l'état a changé → à persister
}

export const emptyState = (): ApiState => ({ todo: [], live: [] });

/**
 * Ajout (montre) : fonctions calculées par les modèles de l'app, injectées par api.ts, car les données simulées
 * passent par import.meta.glob et doivent être chargées par Vite (voir server/watchSummary.ts).
 */
export interface ApiDeps {
  watchSummary?: (state: ApiState, day?: number) => unknown;
  /** Plan du jour (J94) : remplit la to-do quand la War Room ne l'a pas encore poussée. */
  planToday?: () => TodoItem[];
  /** Check-in du navigateur, enregistré là où le triage le lit. */
  receiveCheckIn?: (body: unknown) => { ok: true } | string;
}

const LIVE_TYPES: Measurement['type'][] = [
  'RestingHeartRate', 'HeartRateVariabilitySDNN', 'VO2Max', 'OxygenSaturation',
  'AppleSleepingWristTemperature', 'SleepAnalysis', 'HeartRate',
];
const DEFAULT_UNIT: Partial<Record<Measurement['type'], string>> = {
  HeartRate: 'bpm', RestingHeartRate: 'bpm', OxygenSaturation: '%', HeartRateVariabilitySDNN: 'ms',
};
const LIVE_MAX = 500;

/** Le Raccourci iOS envoie parfois des nombres en texte (« 98 », « 0,98 ») ou un type HealthKit complet. */
export function parseIngest(body: unknown): Measurement | string {
  if (!body || typeof body !== 'object') return 'Expected JSON body: {type, value, unit, date}';
  const b = body as Record<string, unknown>;
  const rawType = String(b.type ?? '').replace(/^HK(Quantity|Category)TypeIdentifier/, '');
  const type = rawType as Measurement['type'];
  if (!LIVE_TYPES.includes(type)) return `unknown type: ${String(b.type)}`;
  let value = typeof b.value === 'number' ? b.value : Number(String(b.value ?? '').replace(',', '.').replace(/[^\d.+-]/g, ''));
  if (!Number.isFinite(value)) return 'value must be a number';
  if (type === 'OxygenSaturation' && value > 0 && value <= 1) value *= 100;
  if (type === 'OxygenSaturation' && (value < 50 || value > 100)) return 'SpO₂ out of range (50–100%)';
  if ((type === 'HeartRate' || type === 'RestingHeartRate') && (value < 20 || value > 250)) return 'HR out of range (20–250 bpm)';
  const unit = typeof b.unit === 'string' && b.unit.trim() ? normUnit(b.unit.trim()) : DEFAULT_UNIT[type] ?? '';
  const d = typeof b.date === 'string' && b.date.trim() ? new Date(b.date) : new Date();
  const date = Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  const source = b.source === 'manual' ? 'manual' : 'apple-watch-live';
  return { type, value: Math.round(value * 10) / 10, unit, date, source };
}

const normUnit = (u: string) => (u === 'count/min' || u === 'BPM' ? 'bpm' : u);

function isTodo(x: unknown): x is TodoItem {
  const t = x as TodoItem;
  return !!t && typeof t.id === 'string' && typeof t.title === 'string' && typeof t.done === 'boolean';
}

/** Libellé affiché par « Choisir dans la liste » sur la montre. */
export const menuLabel = (t: TodoItem) => `${t.time ? t.time + ' · ' : ''}${t.title}`;

export function handle(state: ApiState, req: ApiRequest, deps: ApiDeps = {}): ApiResponse {
  const { method, path } = req;

  // Ajout pour l'app Apple Watch : résumé du jour en lecture seule (triage, consignes, alertes, métriques).
  // ?day=N pour un autre jour (0..860). Sans modèles chargés → 503, la montre affiche alors son instantané embarqué.
  if (path === '/api/watch/summary' && method === 'GET') {
    if (!deps.watchSummary) return { status: 503, json: { error: 'summary unavailable: models not loaded' } };
    const raw = req.query.get('day');
    const day = raw === null || raw === '' ? undefined : Number(raw);
    if (day !== undefined && !Number.isFinite(day)) return { status: 400, json: { error: 'day must be a number (0 to 860)' } };
    return { status: 200, json: deps.watchSummary(state, day) };
  }

  // Ajout : le check-in saisi dans la War Room, pour que la montre affiche le même triage.
  if (path === '/api/checkin' && method === 'POST') {
    if (!deps.receiveCheckIn) return { status: 503, json: { error: 'check-in unavailable: models not loaded' } };
    const r = deps.receiveCheckIn(req.body);
    return typeof r === 'string' ? { status: 400, json: { error: r } } : { status: 200, json: r };
  }

  // To-do vide (War Room pas encore ouverte) : on la remplit avec le plan du jour, pour que la montre puisse cocher.
  // La War Room la remplacera en la poussant ; les coches déjà faites sont gardées (même id).
  if (path === '/api/todo' && method === 'GET') {
    if (!state.todo.length && deps.planToday) {
      const plan = deps.planToday();
      if (plan.length) {
        state.todo = plan.map((t) => ({ ...t, done: false }));
        return { status: 200, json: state.todo, changed: true };
      }
    }
    return { status: 200, json: state.todo };
  }

  // Ajout : la War Room pousse la to-do du jour (pushTodo). Les cases déjà cochées sont conservées.
  if (path === '/api/todo' && (method === 'POST' || method === 'PUT')) {
    const items = Array.isArray(req.body) ? req.body : null;
    if (!items || !items.every(isTodo)) return { status: 400, json: { error: 'Expected an array of TodoItem' } };
    const done = new Set(state.todo.filter((t) => t.done).map((t) => t.id));
    state.todo = items.map((t) => ({ ...t, done: t.done || done.has(t.id) }));
    return { status: 200, json: { ok: true, count: state.todo.length }, changed: true };
  }

  // Ajout : menu pour le Raccourci montre → dictionnaire « libellé → id » des items non cochés.
  if (path === '/api/todo/menu' && method === 'GET') {
    const menu: Record<string, string> = {};
    for (const t of [...state.todo].sort((a, b) => a.priority - b.priority)) if (!t.done) menu[menuLabel(t)] = t.id;
    return { status: 200, json: menu };
  }

  // Ajout pour le Raccourci montre : {item} = id OU libellé du menu (« Choisir dans la liste » peut renvoyer l'un ou l'autre).
  if (path === '/api/todo/done' && method === 'POST') {
    const b = (req.body ?? {}) as Record<string, unknown>;
    const key = String(b.item ?? b.id ?? b.label ?? '').trim();
    const item = state.todo.find((t) => t.id === key || menuLabel(t) === key || t.title === key);
    if (!item) return { status: 404, json: { ok: false, error: `unknown item: ${key}` } };
    item.done = true;
    return { status: 200, json: { ok: true, id: item.id, title: item.title, done: true }, changed: true };
  }

  const done = /^\/api\/todo\/([^/]+)\/(done|undo)$/.exec(path);
  if (done && method === 'POST') {
    const id = decodeURIComponent(done[1]);
    const item = state.todo.find((t) => t.id === id);
    if (!item) return { status: 404, json: { ok: false, error: `unknown item: ${id}` } };
    item.done = done[2] === 'done';
    return { status: 200, json: { ok: true, id, title: item.title, done: item.done }, changed: true };
  }

  if (path === '/ingest' && method === 'POST') {
    const m = parseIngest(req.body);
    if (typeof m === 'string') return { status: 400, json: { ok: false, error: m } };
    state.live.push(m);
    if (state.live.length > LIVE_MAX) state.live.splice(0, state.live.length - LIVE_MAX);
    return { status: 200, json: { ok: true, measurement: m }, changed: true };
  }

  if (path === '/ingest/latest' && method === 'GET') {
    const type = req.query.get('type');
    const pool = type ? state.live.filter((m) => m.type === type) : state.live;
    const last = pool.reduce<Measurement | null>((a, m) => (!a || Date.parse(m.date) >= Date.parse(a.date) ? m : a), null);
    return last ? { status: 200, json: last } : { status: 404, json: { error: 'no live reading' } };
  }

  if (path === '/api/health' && method === 'GET') return { status: 200, json: { ok: true, todo: state.todo.length, live: state.live.length } };

  return { status: 404, json: { error: `${method} ${path} not found` } };
}
