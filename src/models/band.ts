// Propriétaire : Mouad (ROADMAP §7).
// STUB — remplace l'implémentation sans changer la signature.
// Pour l'instant : simple délégation vers src/mocks/ (données factices). Supprime le corps et code le vrai module.
import type { Color } from '../types';

/**
 * Couleur d'une valeur et pire couleur sur sa bande d'incertitude.
 * Le sens est déduit des seuils : red < amber → « plus bas = pire » (ex. densité), sinon « plus haut = pire ».
 */
export function colorWithBand(
  value: number,
  band: [number, number],
  t: { amber: number; red: number },
): { color: Color; worst: Color } {
  const lowerIsWorse = t.red < t.amber;
  const one = (v: number): Color => {
    if (!Number.isFinite(v)) return 'grey'; // donnée manquante : jamais vert
    if (lowerIsWorse) return v < t.red ? 'red' : v < t.amber ? 'amber' : 'green';
    return v > t.red ? 'red' : v > t.amber ? 'amber' : 'green';
  };
  const rank: Color[] = ['grey', 'green', 'amber', 'red'];
  const colors = [one(value), one(band[0]), one(band[1])];
  const worst = colors.reduce((a, b) => (rank.indexOf(b) > rank.indexOf(a) ? b : a));
  return { color: colors[0], worst };
}
