// Constantes de mission [Persona] partagées par les mocks et la page Body.
export const DAY_START = 0;
export const DAY_TODAY = 94;          // dernier corps mesuré
/** PROVISOIRE : jour d'arrivée (Sol 0). À confirmer avec la fiche sol-zero-fiche-v3. */
export const DAY_SOL0 = 210;
export const DAY_END = 860;           // fin de mission
export const MISSION_START_DATE = '2026-08-12'; // J0, de sorte que J94 = 2026-11-14
export const CHRONO_AGE_J0 = 42;      // Haddad, 42 ans [Persona]
export const ASTRONAUT = { name: 'HADDAD', role: 'CDR', id: 'SZ-01' } as const;
/** Adhérence au plan : 0 = rythme actuel, 1 = plan suivi. */
export type Adherence = 0 | 1;
