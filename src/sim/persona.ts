// Persona Haddad [Persona] et calendrier de mission. Mêmes valeurs que src/mocks/mission.ts (Walid).

export const SIM_SEED = 2029;
export const SIM_VERSION = '1.0.0';
export const DAY_TODAY = 94;              // dernier jour mesuré (J94 = 2026-11-14)
/** PROVISOIRE : jour de Sol 0 (arrivée), à confirmer par la fiche sol-zero-fiche-v3. */
export const DAY_SOL0 = 210;
export const DAY_END = 860;
export const MISSION_START_DATE = '2026-08-12';
export const CHRONO_AGE_J0 = 42;
export const PERSONA = { name: 'Scott Kelly', sex: 'M', ageJ0: CHRONO_AGE_J0, tag: 'Persona' } as const;

const DAY_MS = 86_400_000;

/** 'YYYY-MM-DD' du jour de mission `day`. */
export function dayToDate(day: number): string {
  return new Date(Date.parse(`${MISSION_START_DATE}T00:00:00Z`) + day * DAY_MS).toISOString().slice(0, 10);
}

export function chronoAge(day: number): number {
  return CHRONO_AGE_J0 + day / 365.25;
}
