// ─────────────────────────────────────────────────────────────────────────────
// LOOK — tous les réglages visuels du corps 3D, dans UN seul fichier.
// Pour itérer sur le rendu : modifier une valeur ici, sauvegarder, regarder /body.
// Aucune couleur ici : les couleurs viennent de src/ui/tokens.ts (règle 8).
// ─────────────────────────────────────────────────────────────────────────────
import type { LayerId } from '../types';

/** Réglages d'un calque (ou de l'enveloppe). */
export interface LayerLook {
  /** Opacité globale du calque (0..1). */
  opacity: number;
  /** Luminosité des surfaces vues de face (le « cœur » du volume). 0 = seulement les bords. */
  core: number;
  /** Intensité du liseré fresnel (bords lumineux). */
  rim: number;
  /** Exposant fresnel : plus grand = liseré plus fin. */
  fresnelPower: number;
}

export const look = {
  /** Densité de pixels maximale (plafonnée pour tenir > 30 FPS sur portable). */
  maxDpr: 1.75,

  /** Matériau hologramme (HologramMaterial.ts). */
  holo: {
    /** Atténuation des faces arrière (0 = invisibles, 1 = comme l'avant). */
    backFace: 0.4,
    /** Remplissage du volume d'un organe teinté par son statut (aplat mat, sans lueur). */
    tintCore: 0.1,
    /** Gain d'opacité au survol / sélection (léger renfort, pas de flash). */
    highlightBoost: 0.35,
    /** Aplat ajouté à la pièce survolée / sélectionnée : elle se détache du corps, même en statut nominal. */
    highlightFill: 0.3,
    /** Part d'opacité retirée aux pièces non survolées (0..1) : le corps doit rester lisible autour de la sélection. */
    dimFactor: 0.3,
    /** Plafond d'alpha par fragment (évite le blanc brûlé en additif). */
    alphaMax: 0.5,
  },

  /** Rendu par calque. L'enveloppe (« shell ») est toujours visible. */
  layers: {
    shell: { opacity: 1, core: 0.012, rim: 0.4, fresnelPower: 3.0 },
    squelette: { opacity: 1, core: 0.07, rim: 0.62, fresnelPower: 1.7 },
    muscles: { opacity: 1, core: 0.03, rim: 0.62, fresnelPower: 1.7 },
    organes: { opacity: 1, core: 0.03, rim: 0.55, fresnelPower: 2.0 },
    cardio: { opacity: 1, core: 0.12, rim: 0.5, fresnelPower: 1.4 },
    nerveux: { opacity: 1, core: 0.4, rim: 0.9, fresnelPower: 1.2 },
    exposition: { opacity: 1, core: 0.035, rim: 0.4, fresnelPower: 2.0 },
  } satisfies Record<LayerId | 'shell', LayerLook>,

  /**
   * Repère de profondeur par calque : opacité résiduelle de la moitié du corps OPPOSÉE à la caméra (0 = désactivé).
   * Le rendu est additif, sans tri : sans ce repère, dos et face se superposent (calque muscles lu « de dos »).
   */
  depthCue: { shell: 0, squelette: 0.55, muscles: 0.1, organes: 0, cardio: 0.5, nerveux: 0.6, exposition: 0 } as Record<LayerId | 'shell', number>,

  /** Plancher du repère de profondeur pour les pièces SUIVIES (statut) : jamais effacées, même vues de l'autre côté. */
  depthCueTracked: 0.7,

  /** Opacité relative des pièces de CONTEXTE d'un calque (non cliquables : deltoïdes, pectoraux…). */
  context: { squelette: 1, muscles: 1, organes: 1, cardio: 1, nerveux: 0.85, exposition: 1 } satisfies Record<LayerId, number>,

  /**
   * Atténuation des pièces SANS alerte selon le nombre de calques actifs (indice = nombre de calques) : au-delà de
   * trois calques le corps ne doit pas devenir une masse laiteuse. Les pièces en alerte gardent une opacité constante.
   */
  crowd: [1, 1, 1, 1, 0.75, 0.6, 0.5],

  /** Enveloppe du corps. */
  shell: {
    /** Opacité quand AUCUN calque interne n'est actif (silhouette seule). */
    opacityAlone: 1.6,
    /** Opacité avec UN seul calque interne actif (la silhouette doit rester lisible). */
    opacityOneLayer: 0.95,
    /** Opacité à partir de TROIS calques internes actifs (plus discrète) ; interpolée entre les deux. */
    opacityWithLayers: 0.5,
  },

  /** Teinte de statut (0 = hologramme neutre, 1 = couleur de statut pleine). */
  status: {
    /** Vert : l'organe reste neutre, avec une très légère teinte verte. */
    green: 0.14,
    amber: 0.8,
    /** Poids de la teinte sur les pièces « périphériques » d'un organe étendu (réseau vasculaire hors crosse de l'aorte). */
    peripheral: 0.15,
    red: 1,
    /** Gris = inconnu / non modélisé (jamais vert par défaut). */
    grey: 0.95,
    /** Opacité relative d'une pièce ROUGE, par calque : un grand aplat (muscles) ne doit pas écraser ce qu'il recouvre. */
    redOpacity: { muscles: 0.7 } as Partial<Record<LayerId, number>>,
    /** Opacité relative des organes gris (plus éteints). */
    greyOpacity: 0.6,
    /** Vitesse de transition des teintes quand le jour change (1/s). */
    lerpSpeed: 7,
  },

  /** Corps projeté (jour > aujourd'hui) : même rendu, plus léger, réduit au contour. */
  ghost: {
    /** Opacité relative du corps projeté. */
    opacity: 0.6,
    /** Part du remplissage conservée (0 = contour seul). */
    fill: 0.3,
    /** Vitesse de la transition mesuré ↔ projeté (1/s). */
    lerpSpeed: 5,
  },

  /** Flux sanguin le long des vaisseaux. Désactivé (boost = 0) : la scène reste immobile. */
  flow: {
    /** Tirets par mètre de vaisseau. */
    density: 9,
    /** Vitesse (mètres par seconde). */
    speed: 0.22,
    /** Surbrillance d'un tiret. */
    boost: 0,
  },

  /** Carte de chaleur du calque exposition. */
  heat: {
    /** Nombre de paliers (courbes de niveau) — doit suivre la légende de Body.tsx. */
    levels: 5,
    /** Luminosité ajoutée par palier, du moins au plus exposé (0..1 sur toute l'échelle). */
    gain: 0.4,
    /** Opacité des lignes de niveau. */
    contour: 0.9,
  },

  /** Survol / sélection. */
  hover: {
    /** Vitesse de transition surbrillance / atténuation (1/s). */
    lerpSpeed: 10,
    /** Délai avant d'effacer le survol quand le pointeur quitte le corps (ms). */
    clearDelayMs: 90,
  },

  /** Fondu des calques (1/s). */
  layerFadeSpeed: 6,

  /** Caméra et contrôles. */
  camera: {
    fov: 30,
    /** Position par défaut (de face, +Z) et point visé. */
    position: [0, 0.98, 3.72] as [number, number, number],
    target: [0, 0.895, 0] as [number, number, number],
    minDistance: 1.1,
    maxDistance: 6.5,
    /** Limites d'inclinaison (radians depuis le zénith). */
    minPolar: 0.9,
    maxPolar: 1.95,
    damping: 0.08,
    rotateSpeed: 0.7,
    zoomSpeed: 0.7,
    /** Cadrage selon la hauteur du canevas : marge réservée (px) et hauteur de référence (px) où la distance par défaut est juste. */
    fitPadPx: 40,
    fitRefPx: 660,
  },

  /** Balancement du corps au repos. Désactivé : le corps reste de face tant qu'on ne le tourne pas. */
  sway: {
    enabled: false,
    /** Amplitude en radians (0,2 ≈ 11°). */
    amplitude: 0.2,
    /** Période complète en secondes. */
    period: 22,
    /** Secondes d'inactivité avant de reprendre le balancement. */
    idleDelay: 4,
  },
};
