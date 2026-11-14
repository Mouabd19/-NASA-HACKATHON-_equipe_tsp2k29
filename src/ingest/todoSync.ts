// Propriétaire : Ahmed (ROADMAP §7).
// STUB — remplace l'implémentation sans changer la signature.
// Pour l'instant : simple délégation vers src/mocks/ (données factices). Supprime le corps et code le vrai module.
import type { TodoItem } from '../types';
import { mockPullDone, mockPushTodo } from '../mocks';

/** Stub en mémoire (aucun appel réseau). La vraie version parlera à server/api.ts (/api/todo). */
export function pushTodo(items: TodoItem[]): Promise<void> {
  return mockPushTodo(items);
}
export function pullDone(): Promise<string[]> {
  return mockPullDone();
}
