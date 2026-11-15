// Propriétaire : Ahmed (B). API locale pour la montre — ROADMAP §7.
// Plugin Vite : le même middleware tourne en `npm run dev` ET en `npm run preview` (build de démo).
// État en mémoire, persisté dans server/.data/state.json (ignoré par git).
import type { IncomingMessage, ServerResponse } from 'node:http';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type { Plugin } from 'vite';
import { emptyState, handle, type ApiState } from './handlers.ts';

const ROUTES = /^\/(api\/|ingest(\/|$))/;
const MAX_BODY = 256 * 1024;

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

export function createApiMiddleware(file: string) {
  const state = load(file);
  return async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const url = new URL(req.url ?? '/', 'http://local');
    if (!ROUTES.test(url.pathname)) return next();
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
    const out = handle(state, { method: req.method ?? 'GET', path: url.pathname.replace(/\/$/, '') || '/', query: url.searchParams, body });
    if (out.changed) save(file, state);
    res.statusCode = out.status;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(out.json));
  };
}

/** À enregistrer dans vite.config.ts (Walid) : plugins: [react(), solZeroApi()] + server.host / preview.host = true. */
export function solZeroApi(opts: { stateFile?: string } = {}): Plugin {
  let mw: ReturnType<typeof createApiMiddleware>;
  return {
    name: 'sol-zero-api',
    configResolved(cfg) {
      mw = createApiMiddleware(opts.stateFile ?? resolve(cfg.root, 'server/.data/state.json'));
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => void mw(req, res, next));
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => void mw(req, res, next));
    },
  };
}

/** Nom attendu par vite.config.ts sur develop (Walid). */
export const apiPlugin = solZeroApi;
