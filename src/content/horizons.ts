// Propriétaire : Steve (D). Délai radio Terre–Mars — ROADMAP §7.
// Données : public/data/nasa/horizons.json, produit par scripts/fetch-horizons.ts (JPL Horizons, [NASA]).
// Tant que `provisional` est vrai, le fichier vient d'un calcul local (étiquette [H]). Aucun appel réseau.
import data from '../../public/data/nasa/horizons.json';

const DAY_MS = 86_400_000;
const CONJ_DEG = 3; // en dessous, le Soleil coupe le lien (missions martiennes : commandes suspendues)
const t0 = Date.parse(data.days[0].date + 'T00:00:00Z');
const at = (date: string) => {
  const i = Math.round((Date.parse(date.slice(0, 10) + 'T00:00:00Z') - t0) / DAY_MS);
  return data.days[Math.min(Math.max(i, 0), data.days.length - 1)];
};

/** Délai radio aller Terre → Mars, en minutes, à la date ISO donnée (bornée à la mission J0 → J860). */
export function lightTimeMin(date: string): number {
  return at(date).lightTimeMin;
}

/** Utilisé par les pages de Walid : 'table' si la date est dans horizons.json (J0 → J860), sinon 'approx' (valeur bornée). */
export function lightTimeSource(date: string): 'table' | 'approx' {
  const i = Math.round((Date.parse(date.slice(0, 10) + 'T00:00:00Z') - t0) / DAY_MS);
  return i >= 0 && i < data.days.length ? 'table' : 'approx';
}

/** Ajout non cassant : vrai pendant la conjonction solaire (aucun lien avec la Terre). */
export function isConjunction(date: string): boolean {
  return at(date).elongationDeg < CONJ_DEG;
}

/** Ajout non cassant : provenance à afficher (« NASA » si JPL Horizons, « H » si calcul local provisoire). */
export const horizonsTag: 'NASA' | 'H' = data.provisional ? 'H' : 'NASA';
