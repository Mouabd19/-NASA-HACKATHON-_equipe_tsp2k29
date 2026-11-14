// MOCKS (Walid) — ingestion factice : export Santé, référence 30 j, mesure en direct, synchro to-do.
// Aucun appel réseau : tout reste en mémoire.
import type { Baseline, Measurement, TodoItem } from '../types';
import { mockWatchSeries, WATCH_TYPES } from './watch';

/** Fait comme si le fichier avait été lu : renvoie les séries simulées de Haddad. */
export function mockParseHealthExport(file: File, onProgress?: (pct: number) => void): Promise<Measurement[]> {
  void file;
  onProgress?.(0);
  const out = WATCH_TYPES.flatMap((t) => mockWatchSeries(t));
  onProgress?.(100);
  return Promise.resolve(out);
}

/** Moyenne et écart-type des 30 dernières valeurs du type demandé. */
export function mockBaseline30d(ms: Measurement[], type: Measurement['type']): Baseline {
  const vals = ms.filter((m) => m.type === type).sort((a, b) => a.date.localeCompare(b.date)).slice(-30).map((m) => m.value);
  const n = vals.length;
  if (!n) return { type, mean: NaN, sd: NaN, n: 0 };
  const mean = vals.reduce((a, b) => a + b, 0) / n;
  const sd = n > 1 ? Math.sqrt(vals.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1)) : 0;
  return { type, mean, sd, n };
}

/** « Dernière mesure enregistrée » : la dernière valeur simulée (jamais une mesure en direct inventée). */
export function mockLatestLive(type: Measurement['type']): Promise<Measurement | null> {
  const s = mockWatchSeries(type);
  return Promise.resolve(s.length ? s[s.length - 1] : null);
}

let pushed: TodoItem[] = [];
const done = new Set<string>();

export function mockPushTodo(items: TodoItem[]): Promise<void> {
  pushed = items.map((i) => ({ ...i }));
  for (const i of pushed) if (i.done) done.add(i.id); else done.delete(i.id);
  return Promise.resolve();
}
export function mockPullDone(): Promise<string[]> {
  return Promise.resolve([...done]);
}
export function mockPushedTodo(): TodoItem[] { return pushed; }
