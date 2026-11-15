// Propriétaire : Ahmed (B). Check-in du matin saisi en démo — ROADMAP §7 (v3.2, ajout).
// Le check-in saisi remplace le check-in simulé du jour (Mouad : `todayCheckIn() ?? getCheckIn(day)`).
import type { CheckIn, OrganId } from '../types';

/** Ajout local (en attente de Walid dans src/types.ts) : toutes les zones douloureuses, painZone = la première. */
export type CheckInZones = CheckIn & { painZones?: OrganId[] };
type Zones = { painZone?: OrganId; painZones?: OrganId[] };

/** Jour de mission affiché en démo (« aujourd'hui » = J94, fiche §7). */
export const MISSION_TODAY = 94;

const key = (day: number) => `checkin:J${day}`;
const listeners = new Set<() => void>();

function storage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

// Repli en mémoire si localStorage est indisponible (navigation privée, tests).
const memory = new Map<string, string>();

export function isValidCheckIn(c: unknown): c is CheckIn {
  if (!c || typeof c !== 'object') return false;
  const x = c as Record<string, unknown>;
  // Contrat actuel de src/types.ts : humeur, fatigue, sommeil de 1 à 5 ; douleur de 0 à 3.
  const inRange = (v: unknown, lo: number, hi: number) => Number.isInteger(v) && (v as number) >= lo && (v as number) <= hi;
  return (
    Number.isInteger(x.day) &&
    inRange(x.mood, 1, 5) && inRange(x.fatigue, 1, 5) && inRange(x.sleepFelt, 1, 5) && inRange(x.pain, 0, 3) &&
    (x.painZones === undefined || (Array.isArray(x.painZones) && x.painZones.every((z: unknown) => typeof z === 'string'))) &&
    (x.source === 'manual' || x.source === 'simulated')
  );
}

export function saveCheckIn(c: CheckInZones): void {
  if (!isValidCheckIn(c)) throw new Error('Invalid check-in');
  const raw = JSON.stringify(c);
  memory.set(key(c.day), raw);
  try { storage()?.setItem(key(c.day), raw); } catch { /* quota / mode privé : on garde la mémoire */ }
  listeners.forEach((f) => f());
}

/** Ajout : check-in saisi pour un jour donné (null si aucun). */
export function getSavedCheckIn(day: number): CheckInZones | null {
  let raw: string | null | undefined = memory.get(key(day));
  if (raw == null) { try { raw = storage()?.getItem(key(day)); } catch { raw = null; } }
  if (!raw) return null;
  try {
    const c = JSON.parse(raw);
    return isValidCheckIn(c) ? c : null;
  } catch {
    return null;
  }
}

export function todayCheckIn(): CheckInZones | null {
  return getSavedCheckIn(MISSION_TODAY);
}

/** Ajout : efface le check-in d'un jour (bouton « refaire » + reset entre deux filages). */
export function clearCheckIn(day = MISSION_TODAY): void {
  memory.delete(key(day));
  try { storage()?.removeItem(key(day)); } catch { /* rien */ }
  listeners.forEach((f) => f());
}

/** Ajout : notifie les composants quand le check-in change. Renvoie la fonction de désabonnement. */
export function onCheckInChange(f: () => void): () => void {
  listeners.add(f);
  return () => listeners.delete(f);
}

/** Ajout : zones douloureuses d'un check-in (liste, ou la zone unique des anciens check-ins). */
export function painZonesOf(c: Zones): OrganId[] {
  return c.painZones?.length ? c.painZones : c.painZone ? [c.painZone] : [];
}

const ZONE_LABEL: Record<string, string> = { hanche: 'hip', rachis: 'back', cuisse: 'thigh', mollet: 'calf', cerveau: 'head', yeux: 'eyes' };
/** Ajout : zones douloureuses en clair (« hanche, dos »), pour les textes de triage et de to-do. */
export const painZonesText = (c: Zones): string =>
  painZonesOf(c).map((z) => ZONE_LABEL[z] ?? z).join(', ');
