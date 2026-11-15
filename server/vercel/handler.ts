// Owner: Ahmed (B). The local watch API (server/api.ts, Vite middleware) as ONE Vercel Node function.
// Same routes, JSON, status codes, CORS and body parsing; the logic stays in server/handlers.ts (handle), unchanged.
// Differences forced by serverless: state in Redis (store.ts), models pre-bundled by Vite (models.ts → dist/models.js),
// check-in persisted in Redis and restored into the models before use, /api/events streams ~25 s then ends
// (EventSource and the watch reconnect on their own).
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Measurement, TodoItem } from '../../src/types.ts';
import { handle, type ApiDeps, type ApiState } from '../handlers.js';
import { APPEND_SCRIPT, CAS_SCRIPT, EVENT_SCRIPT, EVENTS_KEPT, KEYS, LIVE_MAX, MemoryRedis, redisFromEnv, type RedisLike } from './store.js';

const ROUTES = /^\/(api\/|ingest(\/|$))/;
const MAX_BODY = 256 * 1024;
const MAX_TRIES = 8;
/** Query parameter carrying the original path, set by the vercel.json rewrites (stripped before handle). */
export const PATH_PARAM = '__p';

/** What server/vercel/dist/models.js exports (see models.ts). */
export interface Models {
  watchSummary: (state: ApiState, day?: number) => unknown;
  planToday: () => TodoItem[];
  receiveCheckIn: (body: unknown) => { ok: true } | string;
  saveCheckIn: (c: never) => void;
  clearCheckIn: (day?: number) => void;
  getSavedCheckIn: (day: number) => unknown;
  MISSION_TODAY?: number;
}

export interface VercelApiOptions {
  /** Redis client; default: from env (Upstash), else in-memory (not shared between instances). */
  redis?: RedisLike;
  /** Loads the models; default: dynamic import of the Vite bundle. Failure → summary/check-in answer 503. */
  loadModels?: () => Promise<Models>;
  /** /api/events: stream duration, Redis poll interval, ping interval (ms). */
  streamMs?: number;
  pollMs?: number;
  pingMs?: number;
}

// Literal path: traced by Vercel's bundler (also listed in vercel.json includeFiles). `as string`: may not exist before build.
const defaultLoadModels = async () => (await import('./dist/models.js' as string)) as Models;

function kindOf(path: string): string | null {
  if (path.startsWith('/api/todo')) return 'todo';
  if (path === '/api/checkin') return 'checkin';
  if (path === '/ingest') return 'live';
  return null;
}

/** Which parts of the state a route reads ('r') or may write. Parts not listed are never written. */
interface Needs { todo?: 'r' | 'rw'; live?: 'r' | 'append'; checkin?: 'r' | 'rw'; models?: boolean }
function needsOf(method: string, path: string): Needs {
  if (path.startsWith('/api/todo')) return { todo: 'rw' };
  if (path === '/ingest' && method === 'POST') return { live: 'append' }; // handle only pushes: start from [] and append
  if (path === '/ingest/latest' && method === 'GET') return { live: 'r' };
  if (path === '/api/checkin' && method === 'POST') return { checkin: 'rw', models: true };
  if (path === '/api/watch/summary' && method === 'GET') return { todo: 'r', live: 'r', checkin: 'r', models: true };
  if (path === '/api/health' && method === 'GET') return { todo: 'r', live: 'r' };
  return {};
}

const parseJson = <T>(raw: string | null, fallback: T): T => {
  if (!raw) return fallback;
  try { return JSON.parse(raw) as T; } catch { return fallback; }
};

function parseRaw(raw: string): unknown {
  const s = raw.trim();
  if (!s) return undefined;
  try { return JSON.parse(s); } catch { return Object.fromEntries(new URLSearchParams(s)); }
}

/**
 * Same parsing as server/api.ts (JSON, else form-urlencoded, 256 KB max). Robust to Vercel's helpers: reads the raw
 * stream when it is still there, otherwise uses a req.body that Vercel already read or parsed.
 */
export function readBody(req: IncomingMessage): Promise<unknown> {
  const fromHelper = (): unknown => {
    let b: unknown;
    try { b = (req as { body?: unknown }).body; } catch { return undefined; }
    if (b === undefined || b === null) return undefined;
    if (Buffer.isBuffer(b)) {
      if (b.length > MAX_BODY) throw new Error('body too large');
      return parseRaw(b.toString('utf8'));
    }
    if (typeof b === 'string') {
      if (Buffer.byteLength(b) > MAX_BODY) throw new Error('body too large');
      return parseRaw(b);
    }
    return b;
  };
  return new Promise((ok, ko) => {
    if (Number(req.headers['content-length']) > MAX_BODY) return ko(new Error('body too large'));
    if (req.readableEnded) { try { return ok(fromHelper()); } catch (e) { return ko(e); } }
    let size = 0;
    let failed = false;
    const parts: Buffer[] = [];
    req.on('data', (c: Buffer) => {
      if (failed) return;
      size += c.length;
      if (size > MAX_BODY) { failed = true; ko(new Error('body too large')); return; } // keep draining, answer 413
      parts.push(c);
    });
    req.on('end', () => {
      if (failed) return;
      const raw = Buffer.concat(parts).toString('utf8');
      if (raw.trim()) return ok(parseRaw(raw));
      try { ok(fromHelper()); } catch (e) { ko(e); }
    });
    req.on('error', ko);
  });
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function createVercelApi(opts: VercelApiOptions = {}) {
  let redis: RedisLike | undefined = opts.redis;
  let storeKind = opts.redis ? 'custom' : '';
  const getRedis = (): RedisLike => {
    if (redis) return redis;
    const r = redisFromEnv();
    if (r) { storeKind = 'redis'; return (redis = r); }
    storeKind = 'memory';
    console.warn('[sol-zero-api] No Upstash Redis env vars (KV_REST_API_URL/KV_REST_API_TOKEN or '
      + 'UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN): in-memory state, NOT shared between function instances.');
    return (redis = new MemoryRedis());
  };

  const loadModels = opts.loadModels ?? defaultLoadModels;
  let models: Promise<Models> | undefined;
  const getModels = async (): Promise<Models | null> => {
    models ??= loadModels();
    try {
      return await models;
    } catch (e) {
      models = undefined; // retry on the next request
      console.warn('[sol-zero-api] models unavailable for the watch:', e);
      return null;
    }
  };

  // Check-ins restored into each models module, to clear the days that disappeared from Redis.
  const restored = new WeakMap<Models, Set<number>>();
  const today = (m: Models) => m.MISSION_TODAY ?? 94;
  function restoreCheckIns(m: Models, map: Record<string, unknown>): void {
    const days = new Set<number>([...(restored.get(m) ?? []), ...Object.keys(map).map(Number), today(m)]);
    for (const d of days) {
      const c = map[String(d)];
      if (c) { try { m.saveCheckIn(c as never); } catch { m.clearCheckIn(d); } } else m.clearCheckIn(d);
    }
    restored.set(m, new Set(Object.keys(map).map(Number)));
  }
  function snapshotCheckIns(m: Models, map: Record<string, unknown>, body: unknown): Record<string, unknown> {
    const day = (body as { day?: unknown } | null)?.day;
    const days = new Set<number>([...Object.keys(map).map(Number), today(m), ...(Number.isInteger(day) ? [day as number] : [])]);
    const out: Record<string, unknown> = {};
    for (const d of [...days].sort((a, b) => a - b)) { const c = m.getSavedCheckIn(d); if (c) out[String(d)] = c; }
    restored.set(m, new Set(Object.keys(out).map(Number)));
    return out;
  }

  /** Read → handle → compare-and-set; on a conflict (another request wrote in between) start again. */
  async function run(method: string, path: string, query: URLSearchParams, body: unknown) {
    const r = getRedis();
    const needs = needsOf(method, path);
    for (let attempt = 0; attempt < MAX_TRIES; attempt++) {
      const [todoPair, liveRaw, checkinPair] = await Promise.all([
        needs.todo ? r.mget([KEYS.todo, KEYS.todoV]) : null,
        needs.live === 'r' ? r.lrange(KEYS.live, 0, -1) : null,
        needs.checkin ? r.mget([KEYS.checkin, KEYS.checkinV]) : null,
      ]);
      const todoRaw = todoPair?.[0] ?? null;
      const state: ApiState = {
        todo: parseJson<TodoItem[]>(todoRaw, []),
        live: (liveRaw ?? []).map((s) => parseJson<Measurement | null>(s, null)).filter((m): m is Measurement => !!m),
      };
      if (!Array.isArray(state.todo)) state.todo = [];
      const checkins = parseJson<Record<string, unknown>>(checkinPair?.[0] ?? null, {});

      // Same rule as server/api.ts: the models only for the summary, the check-in, or an empty to-do to fill.
      const wantModels = needs.models || (path === '/api/todo' && method === 'GET' && !state.todo.length);
      const m = wantModels ? await getModels() : null;
      if (m && needs.checkin) restoreCheckIns(m, checkins);
      const deps: ApiDeps = m ? { watchSummary: m.watchSummary, planToday: m.planToday, receiveCheckIn: m.receiveCheckIn } : {};
      const before = JSON.stringify(state.todo);
      const out = handle(state, { method, path, query, body }, deps);

      let conflict = false;
      if (needs.todo === 'rw' && out.changed && JSON.stringify(state.todo) !== before) {
        conflict = (await r.eval(CAS_SCRIPT, [KEYS.todo, KEYS.todoV], [todoPair?.[1] ?? '0', JSON.stringify(state.todo)])) !== 1;
      }
      if (needs.live === 'append' && state.live.length) {
        await r.eval(APPEND_SCRIPT, [KEYS.live], [String(LIVE_MAX), ...state.live.map((x) => JSON.stringify(x))]);
      }
      if (needs.checkin === 'rw' && m && out.status < 300) {
        const next = snapshotCheckIns(m, checkins, body);
        if (JSON.stringify(next) !== JSON.stringify(checkins)) {
          conflict = (await r.eval(CAS_SCRIPT, [KEYS.checkin, KEYS.checkinV], [checkinPair?.[1] ?? '0', JSON.stringify(next)])) !== 1;
        }
      }
      if (conflict) { await sleep(5 + Math.random() * 20 * (attempt + 1)); continue; }

      if (method !== 'GET' && out.status < 300) {
        const k = kindOf(path);
        if (k) await r.eval(EVENT_SCRIPT, [KEYS.evV, KEYS.ev], [k, String(EVENTS_KEPT)]);
      }
      return out;
    }
    return { status: 503, json: { error: 'busy: too many concurrent writes, retry' } };
  }

  /** SSE: retry + hello, then the changes recorded in Redis for ~streamMs, pings, then end (client reconnects). */
  async function openEvents(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const r = getRedis();
    const streamMs = opts.streamMs ?? 25_000;
    const pollMs = opts.pollMs ?? 1_500;
    const pingMs = opts.pingMs ?? 15_000;
    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-store', Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*', 'X-Accel-Buffering': 'no',
    });
    res.flushHeaders();
    let closed = false;
    req.on('close', () => { closed = true; });
    res.on('close', () => { closed = true; });
    const write = (s: string) => { if (!closed) { try { res.write(s); } catch { closed = true; } } };

    let last = Number((await r.get(KEYS.evV).catch(() => null)) ?? 0) || 0;
    write(`retry: 2000\ndata: ${JSON.stringify({ kind: 'hello', v: last })}\n\n`);
    const end = Date.now() + streamMs;
    let lastPing = Date.now();
    while (!closed && Date.now() < end) {
      await sleep(Math.min(pollMs, Math.max(0, end - Date.now())));
      if (closed) break;
      try {
        const v = Number(await r.get(KEYS.evV)) || 0;
        if (v > last) {
          const entries = (await r.lrange(KEYS.ev, 0, EVENTS_KEPT - 1))
            .map((e) => { const i = e.indexOf(':'); return { v: Number(e.slice(0, i)), kind: e.slice(i + 1) }; })
            .filter((e) => e.v > last && e.v <= v)
            .sort((a, b) => a.v - b.v);
          for (const e of entries) write(`data: ${JSON.stringify({ kind: e.kind, v: e.v })}\n\n`);
          last = v;
        } else if (v < last) last = v; // store reset
      } catch { /* Redis hiccup: try again at the next poll */ }
      if (Date.now() - lastPing >= pingMs) { write(': ping\n\n'); lastPing = Date.now(); }
    }
    if (!closed) res.end();
  }

  return async function vercelApi(req: IncomingMessage, res: ServerResponse): Promise<void> {
    try {
      const url = new URL(req.url ?? '/', 'http://local');
      const original = url.searchParams.get(PATH_PARAM);
      url.searchParams.delete(PATH_PARAM);
      const pathname = original ? (original.startsWith('/') ? original : `/${original}`) : url.pathname;
      const method = req.method ?? 'GET';
      if (!ROUTES.test(pathname)) {
        res.statusCode = 404;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        return void res.end(JSON.stringify({ error: `${method} ${pathname} not found` }));
      }
      if (pathname === '/api/events' && method === 'GET') return await openEvents(req, res);
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      res.setHeader('Cache-Control', 'no-store');
      if (method === 'OPTIONS') { res.statusCode = 204; return void res.end(); }
      let body: unknown;
      try {
        body = method === 'GET' ? undefined : await readBody(req);
      } catch (e) {
        res.statusCode = 413;
        return void res.end(JSON.stringify({ error: String(e) }));
      }
      const path = pathname.replace(/\/$/, '') || '/';
      const out = await run(method, path, url.searchParams, body);
      res.statusCode = out.status;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('X-SolZero-Store', storeKind);
      res.end(JSON.stringify(out.json));
    } catch (e) {
      console.error('[sol-zero-api]', e);
      if (res.headersSent) { try { res.end(); } catch { /* closed */ } return; }
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ error: 'storage unavailable' }));
    }
  };
}
