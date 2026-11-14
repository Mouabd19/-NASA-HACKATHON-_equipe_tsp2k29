// Propriétaire : Ahmed (B). Dernière mesure reçue en direct (Raccourci iOS → POST /ingest) — ROADMAP §7.
// Appel au serveur LOCAL uniquement (même origine). Échec ou délai > 2 s → null, jamais d'exception.
import type { Measurement } from '../types';

const TIMEOUT_MS = 2000;

export async function latestLive(type: Measurement['type']): Promise<Measurement | null> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(`/ingest/latest?type=${encodeURIComponent(type)}`, { signal: ctl.signal, cache: 'no-store' });
    if (!r.ok) return null;
    const m = (await r.json()) as Measurement;
    return m && m.type === type && Number.isFinite(m.value) ? m : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Ajout : saisie manuelle (mode secours) → même chemin que la montre, source 'manual'. */
export async function postManual(m: Omit<Measurement, 'source'>): Promise<boolean> {
  try {
    const r = await fetch('/ingest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...m, source: 'manual' }),
    });
    return r.ok;
  } catch {
    return false;
  }
}
