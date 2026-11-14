// Propriétaire : Steve (ROADMAP §7).
// STUB — remplace l'implémentation sans changer la signature.
// Pour l'instant : simple délégation vers src/mocks/ (données factices). Supprime le corps et code le vrai module.
import { mockLightTimeMin, mockLightTimeSource } from '../mocks';

/** Temps lumière aller simple Terre–Mars en minutes (test : 11,01 le 2026-11-14). */
export function lightTimeMin(date: string): number {
  return mockLightTimeMin(date);
}

/**
 * (ajout hors contrat §7) D'où vient la valeur : 'table' = valeur tabulée (JPL Horizons / valeur de test ROADMAP),
 * 'approx' = approximation d'orbite circulaire de l'équipe [H]. Passe à 'table' partout quand horizons.json est branché.
 */
export function lightTimeSource(date: string): 'table' | 'approx' {
  return mockLightTimeSource(date);
}
