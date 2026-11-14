import { beforeEach, describe, expect, it } from 'vitest';
import type { CheckIn } from '../../src/types';
import { clearCheckIn, getSavedCheckIn, MISSION_TODAY, onCheckInChange, saveCheckIn, todayCheckIn } from '../../src/ingest/checkin';

const c: CheckIn = { day: MISSION_TODAY, mood: 2, fatigue: 4, pain: 1, painZone: 'hanche', sleepFelt: 2, source: 'manual' };

describe('checkin', () => {
  beforeEach(() => clearCheckIn());

  it('aucun check-in saisi → null', () => {
    expect(todayCheckIn()).toBeNull();
  });

  it('enregistre et relit le check-in du jour', () => {
    saveCheckIn(c);
    expect(todayCheckIn()).toEqual(c);
    expect(getSavedCheckIn(MISSION_TODAY - 1)).toBeNull();
  });

  it('refuse un check-in hors bornes', () => {
    // Contrat src/types.ts : humeur, fatigue, sommeil 1–5 ; douleur 0–3.
    expect(() => saveCheckIn({ ...c, mood: 6 as never })).toThrow();
    expect(() => saveCheckIn({ ...c, mood: 0 as never })).toThrow();
    expect(() => saveCheckIn({ ...c, pain: 4 as never })).toThrow();
    expect(() => saveCheckIn({ ...c, sleepFelt: 0 as never })).toThrow();
    expect(() => saveCheckIn({ ...c, mood: 1, fatigue: 5, pain: 3, sleepFelt: 1 })).not.toThrow();
    expect(() => saveCheckIn({ ...c, mood: 5, fatigue: 1, pain: 0, sleepFelt: 5 })).not.toThrow();
  });

  it('prévient les abonnés', () => {
    let n = 0;
    const off = onCheckInChange(() => n++);
    saveCheckIn(c);
    clearCheckIn();
    off();
    saveCheckIn(c);
    expect(n).toBe(2);
  });
});

describe('check-in : plusieurs zones de douleur', () => {
  it('garde toutes les zones et accepte les anciens check-ins à zone unique', async () => {
    const { saveCheckIn, getSavedCheckIn, painZonesOf } = await import('../../src/ingest/checkin');
    saveCheckIn({ day: 200, mood: 3, fatigue: 2, pain: 3, painZone: 'hanche', painZones: ['hanche', 'rachis'], sleepFelt: 3, source: 'manual' });
    expect(painZonesOf(getSavedCheckIn(200)!)).toEqual(['hanche', 'rachis']);
    expect(painZonesOf({ painZone: 'mollet' })).toEqual(['mollet']);
    expect(painZonesOf({})).toEqual([]);
  });
});
