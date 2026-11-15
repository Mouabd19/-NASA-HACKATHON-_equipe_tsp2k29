// Propriétaire : Mouad (ROADMAP §7). Qui décide, et quand.
// MAINTENANT ne dépend QUE du triage (calculé à bord) : jamais de la position ni du délai radio.
// ENSUITE dépend du lien Terre :
//   VERT → l'astronaute ; ROUGE, conjonction ou délai inconnu → CMO de bord ;
//   AMBRE / ORANGE → médecin au sol, réponse ≈ aller-retour radio + temps de traitement ;
//   DONNEES_INSUFFISANTES → l'astronaute refait la mesure, rien n'est décidé sur une donnée absente.
import type { Level, LinkPos, RouterOutput, TriageResult } from '../types.ts';

const MAINTENANT: Record<Level, string> = {
  VERT: 'Follow today’s protocol. No immediate action.',
  AMBRE: 'Carry out today’s plan: reinforced countermeasures (ARED heavy loading, intervals). Not urgent.',
  ORANGE: 'Carry out today’s plan without delay and notify the CMO today.',
  ROUGE: 'Stop the current activity, notify the CMO, follow the contingency procedure card.',
  DONNEES_INSUFFISANTES: 'Insufficient data: repeat the measurement (check-in, blood draw) before any decision.',
};

/** Temps de traitement au sol (synthèse IA + relecture du médecin), en minutes [H]. */
export const GROUND_PROCESSING_MIN = 30;

const fr = (v: number, digits = 1) => v.toFixed(digits);

export function router(t: TriageResult, pos: LinkPos, delayMin: number): RouterOutput {
  const maintenant = MAINTENANT[t.level];
  if (t.level === 'VERT') {
    return { maintenant, ensuite: { decideur: 'moi', texte: 'Nothing urgent to transmit. Summary sent with today’s telemetry.' } };
  }
  if (t.level === 'DONNEES_INSUFFISANTES') {
    return { maintenant, ensuite: { decideur: 'moi', texte: 'Repeat the missing measurement: triage will be recomputed onboard, then sent with the telemetry.' } };
  }
  const noLink = pos === 'Conjonction' || !Number.isFinite(delayMin) || delayMin < 0;
  if (t.level === 'ROUGE' || noLink) {
    const why = pos === 'Conjonction' ? 'No Earth link (solar conjunction): ' : noLink ? 'Radio delay unknown: ' : '';
    return { maintenant, ensuite: { decideur: 'CMO', texte: `${why}${why ? 'the' : 'The'} CMO decides. Earth is informed as soon as the link allows.` } };
  }
  const reponseMin = Math.round(2 * delayMin + GROUND_PROCESSING_MIN);
  return {
    maintenant,
    ensuite: {
      decideur: 'sol',
      reponseMin,
      texte: `AI summary and ground flight surgeon’s advice expected in ≈ ${reponseMin} min (radio round trip 2 × ${fr(delayMin, 1)} min + processing).`,
    },
  };
}
