// Propriétaire : Ahmed (ROADMAP §7).
// STUB — remplace l'implémentation sans changer la signature.
// Plugin Vite (serveur de dev) : API locale en mémoire pour le Raccourci iOS / Apple Watch.
//   GET  /api/todo            → TodoItem[] du jour (planDay(DAY_TODAY)) avec l'état « fait »
//   POST /api/todo            → (ajout) remplace la liste (corps : TodoItem[])
//   POST /api/todo/:id/done   → coche un item ({ ok, id })
//   POST /ingest              → objet plat { type, value, unit, date } (mesure en direct)
//   GET  /ingest/latest       → dernière mesure reçue (?type=OxygenSaturation pour filtrer), ou null
// Branché dans vite.config.ts (serveur de dev uniquement ; `vite preview` ne sert pas ces routes).
// Aucune dépendance : l'état vit en mémoire et se perd au redémarrage du serveur.
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin, ViteDevServer } from 'vite';

interface Todo { id: string; done: boolean; [k: string]: unknown }
interface Sample { type: string; value: number; unit: string; date: string; source: string }

const MAX_BODY = 64 * 1024;

function send(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

function readJson(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.setEncoding('utf8');
    req.on('data', (chunk: string) => {
      raw += chunk;
      if (raw.length > MAX_BODY) { reject(new Error('corps trop volumineux')); req.destroy(); }
    });
    req.on('end', () => {
      try { resolve(raw ? JSON.parse(raw) : {}); } catch { reject(new Error('JSON invalide')); }
    });
    req.on('error', reject);
  });
}

export function apiPlugin(): Plugin {
  let todo: Todo[] | null = null;
  const done = new Set<string>();
  const latest = new Map<string, Sample>();
  let last: Sample | null = null;

  // La to-do vient du planificateur (stub ou vrai module), chargé par Vite à la première requête.
  async function loadTodo(server: ViteDevServer): Promise<Todo[]> {
    if (!todo) {
      const plan = await server.ssrLoadModule('/src/models/planDay.ts');
      const mission = await server.ssrLoadModule('/src/mocks/mission.ts');
      todo = (plan.planDay as (day: number) => Todo[])(mission.DAY_TODAY as number);
    }
    return todo.map((t) => ({ ...t, done: t.done || done.has(t.id) }));
  }

  return {
    name: 'sol-zero-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = new URL(req.url ?? '/', 'http://localhost');
        const path = url.pathname.replace(/\/+$/, '') || '/';
        const method = req.method ?? 'GET';
        const handle = async (): Promise<boolean> => {
          if (path === '/api/todo' && method === 'GET') {
            send(res, 200, await loadTodo(server));
            return true;
          }
          if (path === '/api/todo' && method === 'POST') {
            const body = await readJson(req);
            if (!Array.isArray(body)) { send(res, 400, { error: 'tableau de TodoItem attendu' }); return true; }
            todo = body as Todo[];
            done.clear();
            for (const t of todo) if (t.done) done.add(t.id);
            send(res, 200, { ok: true, count: todo.length });
            return true;
          }
          const m = /^\/api\/todo\/([^/]+)\/done$/.exec(path);
          if (m && method === 'POST') {
            const id = decodeURIComponent(m[1]);
            const items = await loadTodo(server);
            if (!items.some((t) => t.id === id)) { send(res, 404, { error: 'item inconnu', id }); return true; }
            done.add(id);
            send(res, 200, { ok: true, id });
            return true;
          }
          if (path === '/ingest' && method === 'POST') {
            const b = (await readJson(req)) as Partial<Sample>;
            const value = Number(b.value);
            if (typeof b.type !== 'string' || !Number.isFinite(value)) {
              send(res, 400, { error: 'objet plat { type, value, unit, date } attendu' });
              return true;
            }
            const sample: Sample = {
              type: b.type,
              value,
              unit: typeof b.unit === 'string' ? b.unit : '',
              date: typeof b.date === 'string' ? b.date : new Date().toISOString(),
              source: 'apple-watch-live',
            };
            latest.set(sample.type, sample);
            last = sample;
            send(res, 200, { ok: true });
            return true;
          }
          if (path === '/ingest/latest' && method === 'GET') {
            const type = url.searchParams.get('type');
            send(res, 200, type ? latest.get(type) ?? null : last);
            return true;
          }
          return false;
        };
        handle().then((handled) => { if (!handled) next(); }).catch((e: unknown) => {
          send(res, 400, { error: e instanceof Error ? e.message : 'erreur' });
        });
      });
    },
  };
}
