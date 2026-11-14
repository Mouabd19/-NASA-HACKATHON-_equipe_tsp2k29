// Réglages des warnings 3D — TOUT ce qui se règle à l'œil est ici (itération rapide).
export const warnKnobs = {
  /** Plaque hexagonale (px). */
  plateW: 156,
  plateH: 44,
  /** Écart vertical minimal entre deux plaques d'une même colonne (px). */
  plateGap: 12,
  /** Distance axe du corps → bord intérieur des plaques, en mètres (suit le zoom). */
  columnOffsetM: 0.46,
  /** Marge minimale entre une plaque et le bord de la scène (px). */
  edgeMargin: 10,
  /** Marge haute / basse réservée (px) — laisse la place à l'en-tête et à la timeline. */
  topMargin: 34,
  bottomMargin: 34,
  /** Écart minimal marqueur → bord de plaque (px). */
  minReach: 34,
  /** Marqueur posé sur l'organe : demi-diagonale du losange (px écran, taille constante). */
  markerPx: 7,
  /** Surbrillance du marqueur (> 1 nourrit le bloom). */
  markerBoost: 1.5,
  /** Opacité du marqueur sur un jour projeté. */
  markerProjectedOpacity: 0.55,
  /** Période du pouls (s) : ambre lent, rouge rapide, gris très lent. */
  pulse: { amber: 2.4, red: 1.0, grey: 4.0, green: 4.0 },
  /** Expansion maximale de l'onde du pouls (× taille du marqueur). */
  pulseSpread: 2.4,
  /** Vitesse d'apparition / disparition (1/s) et délai avant démontage (ms). */
  fadeSpeed: 9,
  exitMs: 500,
  /** Vitesse de suivi des plaques (1/s) — lisse le dé-chevauchement. */
  followSpeed: 14,
  /** Longueur rognée au départ du trait, pour ne pas traverser le losange (px). */
  lineTrim: 10,
  /** Opacité du trait coudé. */
  lineOpacity: 0.75,
};
