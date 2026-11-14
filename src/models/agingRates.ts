// Vitesse de vieillissement terrestre par organe, en % de perte par an [H, à sourcer par Steve].
// Sert à l'écart d'âge par organe : bioAge = âgeRéel + perte% / vitesse%/an (roadmap §8).
import type { OrganId } from '../types.ts';

export const EARTH_AGING_PCT_PER_YEAR: Partial<Record<OrganId, number>> = {
  hanche: 1, femur: 1, rachis: 1,            // densité osseuse ≈ 1 %/an
  cuisse: 1, mollet: 1, paravertebraux: 1,   // masse musculaire ≈ 1 %/an
  coeur: 1,                                  // VO₂max ≈ 10 %/décennie
};

export function lossToYears(organId: OrganId, lossPct: number): number | null {
  const rate = EARTH_AGING_PCT_PER_YEAR[organId];
  return rate ? lossPct / rate : null;
}
