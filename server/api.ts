// Propriétaire : Ahmed (B). API locale pour la montre — ROADMAP §7.
// Plugin Vite : le même middleware tourne en `npm run dev` ET en `npm run preview` (build de démo).
// État en mémoire, persisté dans server/.data/state.json (ignoré par git).
import type { IncomingMessage, ServerResponse } from 'node:http';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type { Plugin, ViteDevServer } from 'vite';
import { emptyState, handle, type ApiDeps, type ApiState } from './handlers.ts';

const ROUTES = /^\/(api\/|ingest(\/|$))/;
const MAX_BODY = 256 * 1024;

// Temps réel (Server-Sent Events) : GET /api/events garde la connexion ouverte et reçoit
// « data: {"kind":"todo"|"checkin"|"live","v":n} » à chaque changement. Navigateur : EventSource ; montre : URLSession.bytes.
// (Pas de WebSocket : watchOS les interdit hors apps audio.)
const clients = new Set<ServerResponse>();
let version = 0;
function broadcast(kind: string): void {
  version += 1;
  const msg = `data: ${JSON.stringify({ kind, v: version })}\n\n`;
  for (const c of clients) { try { c.write(msg); } catch { clients.delete(c); } }
}
function kindOf(path: string): string | null {
  if (path.startsWith('/api/todo')) return 'todo';
  if (path === '/api/checkin') return 'checkin';
  if (path === '/ingest') return 'live';
  return null;
}
function openEvents(req: IncomingMessage, res: ServerResponse): void {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-store', Connection: 'keep-alive',
    'Access-Control-Allow-Origin': '*', 'X-Accel-Buffering': 'no',
  });
  res.write(`retry: 2000\ndata: ${JSON.stringify({ kind: 'hello', v: version })}\n\n`);
  clients.add(res);
  const ping = setInterval(() => { try { res.write(': ping\n\n'); } catch { /* fermé */ } }, 15_000);
  req.on('close', () => { clearInterval(ping); clients.delete(res); });
}

type ModelDeps = Required<ApiDeps>;
const SUMMARY_MODULE = '/server/watchSummary.ts';

function load(file: string): ApiState {
  try {
    const s = JSON.parse(readFileSync(file, 'utf8')) as ApiState;
    return { todo: Array.isArray(s.todo) ? s.todo : [], live: Array.isArray(s.live) ? s.live : [] };
  } catch {
    return emptyState();
  }
}

function save(file: string, s: ApiState): void {
  try {
    if (!existsSync(dirname(file))) mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, JSON.stringify(s));
  } catch { /* disque plein / lecture seule : l'état reste en mémoire */ }
}

function readBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((ok, ko) => {
    let size = 0;
    const parts: Buffer[] = [];
    req.on('data', (c: Buffer) => {
      size += c.length;
      if (size > MAX_BODY) { ko(new Error('body too large')); req.destroy(); return; }
      parts.push(c);
    });
    req.on('end', () => {
      const raw = Buffer.concat(parts).toString('utf8').trim();
      if (!raw) return ok(undefined);
      try { ok(JSON.parse(raw)); } catch { ok(Object.fromEntries(new URLSearchParams(raw))); }
    });
    req.on('error', ko);
  });
}

/**
 * `loadModels` charge server/watchSummary.ts par Vite (import.meta.glob). En cas d'échec, le résumé et le check-in
 * répondent 503 et la to-do reste vide jusqu'à ce que la War Room la pousse : le reste de l'API ne change pas.
 */
export function createApiMiddleware(file: string, loadModels?: () => Promise<ModelDeps>) {
  const state = load(file);
  const deps = async (path: string, method: string): Promise<ApiDeps> => {
    const wanted = path === '/api/watch/summary' || (path === '/api/checkin' && method === 'POST')
      || (path === '/api/todo' && method === 'GET' && !state.todo.length);
    if (!wanted || !loadModels) return {};
    try {
      return await loadModels();
    } catch (e) {
      console.warn('[sol-zero-api] models unavailable for the watch:', e);
      return {};
    }
  };
  return async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const url = new URL(req.url ?? '/', 'http://local');
    if (!ROUTES.test(url.pathname)) return next();
    if (url.pathname === '/api/events' && req.method === 'GET') return openEvents(req, res);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Cache-Control', 'no-store');
    if (req.method === 'OPTIONS') { res.statusCode = 204; return res.end(); }
    let body: unknown;
    try {
      body = req.method === 'GET' ? undefined : await readBody(req);
    } catch (e) {
      res.statusCode = 413;
      return res.end(JSON.stringify({ error: String(e) }));
    }
    const path = url.pathname.replace(/\/$/, '') || '/';
    const method = req.method ?? 'GET';
    const out = handle(state, { method, path, query: url.searchParams, body }, await deps(path, method));
    if (out.changed) save(file, state);
    if (method !== 'GET' && out.status < 300) { const k = kindOf(path); if (k) broadcast(k); }
    res.statusCode = out.status;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(out.json));
  };
}

/** À enregistrer dans vite.config.ts (Walid) : plugins: [react(), solZeroApi()] + server.host / preview.host = true. */
export function solZeroApi(opts: { stateFile?: string } = {}): Plugin {
  let mw: ReturnType<typeof createApiMiddleware>;
  let root = process.cwd();
  // dev : le serveur Vite charge le module (et le recharge après une modif) ;
  // preview : un petit serveur Vite sans plugin, créé au premier appel, sert uniquement à ce chargement.
  let loadModels: () => Promise<ModelDeps> = async () => { throw new Error('server not started'); };
  let previewLoader: Promise<ViteDevServer> | undefined;
  return {
    name: 'sol-zero-api',
    configResolved(cfg) {
      root = cfg.root;
      mw = createApiMiddleware(opts.stateFile ?? resolve(cfg.root, 'server/.data/state.json'), () => loadModels());
    },
    configureServer(server) {
      loadModels = async () => (await server.ssrLoadModule(SUMMARY_MODULE)) as unknown as ModelDeps;
      server.middlewares.use((req, res, next) => void mw(req, res, next));
    },
    configurePreviewServer(server) {
      loadModels = async () => {
        previewLoader ??= import('vite').then(({ createServer }) => createServer({
          root, configFile: false, logLevel: 'silent', appType: 'custom',
          server: { middlewareMode: true, hmr: false, ws: false },
          optimizeDeps: { noDiscovery: true, include: [] },
        }));
        previewLoader.catch(() => { previewLoader = undefined; });
        return (await (await previewLoader).ssrLoadModule(SUMMARY_MODULE)) as unknown as ModelDeps;
      };
      server.httpServer?.once('close', () => { void previewLoader?.then((s) => s.close()); });
      server.middlewares.use((req, res, next) => void mw(req, res, next));
    },
  };
}

/** Nom attendu par vite.config.ts sur develop (Walid). */
export const apiPlugin = solZeroApi;
