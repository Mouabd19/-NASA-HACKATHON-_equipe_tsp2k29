// Vitesse de vieillissement terrestre par organe, en % de perte par an [Publié].
// Sert à l'écart d'âge par organe : bioAge = âgeRéel + perte% / vitesse%/an (roadmap §8).
// Valeurs sourcées par Steve (docs/sources/references-v3.2.md, décision équipe sam. 14/11) :
//   os    0,5 %/an : MINOS (hommes 50–85 ans), hanche totale ; MrOS ≈ 0,3 %/an au col
//   muscle 0,4 %/an : méta-analyse 25 → 75 ans (≈ 1 %/an seulement après 70 ans)
//   cœur  1 %/an   : Fleg 2005, VO₂max 3–6 %/décennie à 20–39 ans puis accélération (simplification courante)
// Mesurées sur des adultes plus âgés : à 42 ans la perte terrestre est plus lente → écarts plutôt sous-estimés.
import type { OrganId } from '../types.ts';

export const EARTH_AGING_PCT_PER_YEAR: Partial<Record<OrganId, number>> = {
  hanche: 0.5, femur: 0.5, rachis: 0.5,            // densité osseuse
  cuisse: 0.4, mollet: 0.4, paravertebraux: 0.4,   // masse musculaire
  coeur: 1,                                        // VO₂max
};

export function lossToYears(organId: OrganId, lossPct: number): number | null {
  const rate = EARTH_AGING_PCT_PER_YEAR[organId];
  return rate ? lossPct / rate : null;
}
