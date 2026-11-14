// Propriétaire : Ahmed (B). Synchro de la to-do avec la montre via l'API locale — ROADMAP §7.
// Silencieux en cas d'échec (démo en mode avion sans serveur) : la War Room garde son état local.
import type { TodoItem } from '../types';

const TIMEOUT_MS = 2000;

async function call(url: string, init?: RequestInit): Promise<Response | null> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(url, { ...init, signal: ctl.signal, cache: 'no-store' });
    return r.ok ? r : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function pushTodo(items: TodoItem[]): Promise<void> {
  await call('/api/todo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(items) });
}

/** Ids cochés côté serveur (montre). Serveur absent → [] : on ne décoche jamais sur une absence d'info. */
export async function pullDone(): Promise<string[]> {
  const r = await call('/api/todo');
  if (!r) return [];
  try {
    const items = (await r.json()) as TodoItem[];
    return Array.isArray(items) ? items.filter((t) => t.done).map((t) => t.id) : [];
  } catch {
    return [];
  }
}

/** Ajout : cocher / décocher depuis l'écran, pour que la montre voie le même état. */
export async function setDone(id: string, done: boolean): Promise<boolean> {
  return !!(await call(`/api/todo/${encodeURIComponent(id)}/${done ? 'done' : 'undo'}`, { method: 'POST' }));
}
