// MOCKS (Walid) — séries « montre » SIMULÉES de Haddad, une valeur par jour J0..J94.
// (Les vraies données du présentateur viendront de src/ingest — Ahmed.)
import type { Measurement } from '../types';
import { DAY_TODAY } from './mission';
import { hrvSdnn, restingHr, vo2max } from './curves';
import { clamp, dateOfDay, noise, round } from './util';

type MType = Measurement['type'];

const DEF: Record<MType, { unit: string; value: (d: number) => number }> = {
  RestingHeartRate: { unit: 'bpm', value: (d) => round(restingHr(d) + 1.5 * noise('w/rhr', d), 0) },
  HeartRateVariabilitySDNN: { unit: 'ms', value: (d) => round(hrvSdnn(d) + 4 * noise('w/hrv', d), 0) },
  VO2Max: { unit: 'ml/kg/min', value: (d) => round(vo2max(d) + 0.4 * noise('w/vo2', d), 1) },
  OxygenSaturation: { unit: '%', value: (d) => spo2Measured(d) },
  AppleSleepingWristTemperature: { unit: '°C', value: (d) => round(36.1 + 0.2 * noise('w/temp', d), 2) },
  SleepAnalysis: { unit: 'h', value: (d) => round(6.9 - 0.3 * (d / DAY_TODAY) + 0.5 * noise('w/sleep', d), 1) },
  HeartRate: { unit: 'bpm', value: (d) => round(restingHr(d) + 14 + 3 * noise('w/hr', d), 0) },
};

/** SpO₂ du jour, toujours dans 97–99 %. */
export function spo2Measured(day: number): number {
  return round(clamp(98 + 0.9 * noise('w/spo2', day), 97, 99), 1);
}

const cache = new Map<MType, Measurement[]>();

export function mockWatchSeries(type: MType): Measurement[] {
  const hit = cache.get(type);
  if (hit) return hit;
  const def = DEF[type];
  if (!def) return [];
  const out: Measurement[] = [];
  for (let d = 0; d <= DAY_TODAY; d++) {
    out.push({ type, value: def.value(d), unit: def.unit, date: `${dateOfDay(d)}T07:00:00Z`, source: 'simulated' });
  }
  cache.set(type, out);
  return out;
}

export const WATCH_TYPES = Object.keys(DEF) as MType[];
