// Propriétaire : Mouad (ROADMAP §7). Qui décide, et quand.
// MAINTENANT ne dépend QUE du triage (calculé à bord) : jamais de la position ni du délai radio.
// ENSUITE dépend du lien Terre :
//   VERT → l'astronaute ; ROUGE, conjonction ou délai inconnu → CMO de bord ;
//   AMBRE / ORANGE → médecin au sol, réponse ≈ aller-retour radio + temps de traitement ;
//   DONNEES_INSUFFISANTES → l'astronaute refait la mesure, rien n'est décidé sur une donnée absente.
import type { Level, LinkPos, RouterOutput, TriageResult } from '../types.ts';

const MAINTENANT: Record<Level, string> = {
  VERT: 'Suivre le protocole du jour. Aucune action immédiate.',
  AMBRE: 'Appliquer la to-do du jour : contre-mesures renforcées (ARED charge lourde, intervalles). Pas d’urgence.',
  ORANGE: 'Appliquer la to-do du jour sans report et prévenir le CMO de bord dans la journée.',
  ROUGE: 'Arrêter l’activité en cours, prévenir le CMO de bord, appliquer la fiche de conduite à tenir.',
  DONNEES_INSUFFISANTES: 'Données insuffisantes : refaire la mesure (check-in, prélèvement) avant toute décision.',
};

/** Temps de traitement au sol (synthèse IA + relecture du médecin), en minutes [H]. */
export const GROUND_PROCESSING_MIN = 30;

const fr = (v: number, digits = 1) => v.toFixed(digits).replace('.', ',');

export function router(t: TriageResult, pos: LinkPos, delayMin: number): RouterOutput {
  const maintenant = MAINTENANT[t.level];
  if (t.level === 'VERT') {
    return { maintenant, ensuite: { decideur: 'moi', texte: 'Rien à transmettre en priorité. Bilan envoyé avec la télémétrie du jour.' } };
  }
  if (t.level === 'DONNEES_INSUFFISANTES') {
    return { maintenant, ensuite: { decideur: 'moi', texte: 'Refaire la mesure manquante : le triage sera recalculé à bord, puis transmis avec la télémétrie.' } };
  }
  const noLink = pos === 'Conjonction' || !Number.isFinite(delayMin) || delayMin < 0;
  if (t.level === 'ROUGE' || noLink) {
    const why = pos === 'Conjonction' ? 'Pas de lien Terre (conjonction) : ' : noLink ? 'Délai radio inconnu : ' : '';
    return { maintenant, ensuite: { decideur: 'CMO', texte: `${why}le CMO de bord décide. La Terre est informée dès que le lien le permet.` } };
  }
  const reponseMin = Math.round(2 * delayMin + GROUND_PROCESSING_MIN);
  return {
    maintenant,
    ensuite: {
      decideur: 'sol',
      reponseMin,
      texte: `Synthèse IA et avis du médecin au sol attendus dans ≈ ${reponseMin} min (aller-retour radio 2 × ${fr(delayMin, 1)} min + traitement).`,
    },
  };
}
