// Propriétaire : Ahmed (B). Temps réel avec le serveur local (GET /api/events, Server-Sent Events).
// Une seule connexion pour toute la page ; EventSource se reconnecte tout seul. Sans serveur : rien ne se passe,
// les synchros périodiques existantes prennent le relais.
export type ServerChange = 'todo' | 'checkin' | 'live';

const subs = new Map<ServerChange, Set<() => void>>();
let source: EventSource | null = null;

function connect(): void {
  if (source || typeof EventSource === 'undefined') return;
  source = new EventSource('/api/events');
  source.onmessage = (e) => {
    try {
      const { kind } = JSON.parse(e.data) as { kind: ServerChange | 'hello' };
      // à la (re)connexion, on resynchronise tout : un changement a pu être manqué pendant la coupure
      const kinds: ServerChange[] = kind === 'hello' ? ['todo', 'checkin', 'live'] : [kind];
      for (const k of kinds) subs.get(k)?.forEach((f) => f());
    } catch { /* message illisible : ignoré */ }
  };
}

/** Appelle `f` dès que le serveur signale un changement de l'un des `kinds`. Renvoie la fonction de désabonnement. */
export function onServerChange(kinds: ServerChange[], f: () => void): () => void {
  connect();
  for (const k of kinds) { if (!subs.has(k)) subs.set(k, new Set()); subs.get(k)!.add(f); }
  return () => { for (const k of kinds) subs.get(k)?.delete(f); };
}
