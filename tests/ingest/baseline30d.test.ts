import { describe, expect, it } from 'vitest';
import type { Measurement } from '../../src/types';
import { baseline30d, zScore } from '../../src/ingest/baseline30d';

const m = (date: string, value: number, type: Measurement['type'] = 'RestingHeartRate'): Measurement =>
  ({ type, value, unit: 'bpm', date, source: 'apple-watch-export' });

describe('baseline30d', () => {
  it('jeu vide → n = 0 et NaN (jamais une valeur par défaut)', () => {
    const b = baseline30d([], 'OxygenSaturation');
    expect(b.n).toBe(0);
    expect(Number.isNaN(b.mean)).toBe(true);
    expect(Number.isNaN(b.sd)).toBe(true);
  });

  it('ne garde que les 30 jours avant la dernière mesure du type', () => {
    const ms = [
      m('2026-08-01T08:00:00Z', 100), // hors fenêtre
      m('2026-09-20T08:00:00Z', 60),
      m('2026-10-01T08:00:00Z', 62),
      m('2026-10-15T08:00:00Z', 64),
      m('2026-11-10T08:00:00Z', 50, 'HeartRateVariabilitySDNN'), // autre type, ignoré
    ];
    const b = baseline30d(ms, 'RestingHeartRate');
    expect(b).toEqual({ type: 'RestingHeartRate', mean: 62, sd: 2, n: 3 });
  });

  it('une seule mesure → sd = 0', () => {
    expect(baseline30d([m('2026-10-15T08:00:00Z', 58)], 'RestingHeartRate')).toMatchObject({ mean: 58, sd: 0, n: 1 });
  });
});

describe('zScore', () => {
  it('écart en σ, null si la référence est trop pauvre', () => {
    expect(zScore(66, { type: 'RestingHeartRate', mean: 62, sd: 2, n: 3 })).toBe(2);
    expect(zScore(66, { type: 'RestingHeartRate', mean: 62, sd: 0, n: 1 })).toBeNull();
    expect(zScore(66, { type: 'RestingHeartRate', mean: NaN, sd: NaN, n: 0 })).toBeNull();
  });
});
