// Réglages des annotations d'alerte — tout ce qui se règle à l'œil est ici.
export const warnKnobs = {
  /** Étiquette (px) : hauteur fixe, largeur selon le texte (plateW = largeur de repli tant qu'elle n'est pas mesurée). */
  plateW: 96,
  plateH: 28,
  /** Écart vertical minimal entre deux étiquettes d'une même colonne (px). */
  plateGap: 8,
  /** Distance axe du corps → bord intérieur des étiquettes, en mètres (suit le zoom). */
  columnOffsetM: 0.43,
  /** Marge minimale entre une étiquette et le bord de la scène (px). */
  edgeMargin: 16,
  /** Marge haute / basse réservée (px) — laisse la place aux contrôles de la scène. */
  topMargin: 40,
  bottomMargin: 40,
  /** Écart minimal point d'ancrage → bord de l'étiquette (px). */
  minReach: 32,
  /** Point d'ancrage posé sur l'organe : rayon (px écran). */
  dotR: 3,
  /** Vitesse du fondu d'apparition / disparition (1/s) et délai avant démontage (ms). */
  fadeSpeed: 18,
  exitMs: 300,
  /** Vitesse de suivi des étiquettes (1/s) — lisse le dé-chevauchement. */
  followSpeed: 14,
  /** Longueur rognée au départ du trait, pour ne pas toucher le point d'ancrage (px). */
  lineTrim: 6,
};
