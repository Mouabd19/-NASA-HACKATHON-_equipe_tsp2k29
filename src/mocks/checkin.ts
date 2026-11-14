// MOCKS (Walid) — check-ins du matin SIMULÉS (J0..J94) + mémoire du check-in saisi en démo.
import type { CheckIn } from '../types';
import { DAY_TODAY } from './mission';
import { noise } from './util';

const manual = new Map<number, CheckIn>();
const KEY = 'sz-checkin';

function storage(): Storage | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

/** Enregistre le check-in saisi : il remplace le simulé du même jour. */
export function mockSaveCheckIn(c: CheckIn): void {
  manual.set(c.day, { ...c, source: 'manual' });
  try {
    storage()?.setItem(KEY, JSON.stringify({ ...c, source: 'manual' }));
  } catch {
    /* stockage indisponible : on garde la mémoire vive */
  }
}

/** Check-in saisi aujourd'hui (J94), ou null si rien n'a été saisi. */
export function mockTodayCheckIn(): CheckIn | null {
  const m = manual.get(DAY_TODAY);
  if (m) return m;
  try {
    const raw = storage()?.getItem(KEY);
    if (raw) {
      const c = JSON.parse(raw) as CheckIn;
      if (c && c.day === DAY_TODAY) return c;
    }
  } catch {
    /* ignore */
  }
  return null;
}

const pick = <T,>(arr: readonly T[], key: string, day: number): T =>
  arr[Math.min(arr.length - 1, Math.floor(((noise(key, day) + 1) / 2) * arr.length))];

/** Check-in d'un jour : saisi s'il existe, sinon simulé ; null au-delà d'aujourd'hui. */
export function mockCheckIn(day: number): CheckIn | null {
  if (!Number.isInteger(day) || day < 0 || day > DAY_TODAY) return null;
  const m = day === DAY_TODAY ? mockTodayCheckIn() : manual.get(day);
  if (m) return m;
  if (day === DAY_TODAY) {
    return { day, mood: 3, fatigue: 3, pain: 1, painZone: 'paravertebraux', sleepFelt: 3, source: 'simulated' };
  }
  const pain = pick([0, 0, 0, 1] as const, 'ci/pain', day);
  return {
    day,
    mood: pick([3, 4, 4, 4, 5] as const, 'ci/mood', day),
    fatigue: pick([2, 2, 3, 3] as const, 'ci/fatigue', day),
    pain,
    painZone: pain > 0 ? 'paravertebraux' : undefined,
    sleepFelt: pick([3, 3, 4, 4] as const, 'ci/sleep', day),
    source: 'simulated',
  };
}
