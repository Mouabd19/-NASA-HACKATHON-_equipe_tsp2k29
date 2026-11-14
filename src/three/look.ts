// ─────────────────────────────────────────────────────────────────────────────
// LOOK — tous les réglages visuels du corps holographique, dans UN seul fichier.
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
    /** Lignes de balayage horizontales : nombre de lignes par mètre. */
    scanlineDensity: 150,
    /** Contraste des lignes de balayage (0 = aucune). */
    scanlineStrength: 0.22,
    /** Vitesse de dérive des lignes (rad/s). */
    scanlineSpeed: 0.9,
    /** Amplitude du scintillement (0 = stable). */
    flicker: 0.035,
    /** Surbrillance d'un organe en alerte (multiplie la couleur de statut → nourrit le bloom). */
    tintBoost: 0.3,
    /** Remplissage du volume d'un organe en alerte (lueur « à cœur »). */
    tintCore: 0.04,
    /** Gain d'opacité au survol / sélection. */
    highlightBoost: 0.8,
    /** Part d'opacité retirée aux pièces non survolées (0..1). */
    dimFactor: 0.72,
    /** Plafond d'alpha par fragment (évite le blanc brûlé en additif). */
    alphaMax: 0.85,
  },

  /** Rendu par calque. L'enveloppe (« shell ») est toujours visible. */
  layers: {
    shell: { opacity: 1, core: 0.012, rim: 0.34, fresnelPower: 2.6 },
    squelette: { opacity: 1, core: 0.07, rim: 0.62, fresnelPower: 1.7 },
    muscles: { opacity: 1, core: 0.035, rim: 0.36, fresnelPower: 2.0 },
    organes: { opacity: 1, core: 0.06, rim: 0.55, fresnelPower: 1.8 },
    cardio: { opacity: 1, core: 0.12, rim: 0.5, fresnelPower: 1.4 },
    nerveux: { opacity: 1, core: 0.24, rim: 0.6, fresnelPower: 1.4 },
    exposition: { opacity: 1, core: 0.045, rim: 0.22, fresnelPower: 2.4 },
  } satisfies Record<LayerId | 'shell', LayerLook>,

  /** Opacité relative des pièces de CONTEXTE d'un calque (non cliquables : deltoïdes, pectoraux…). */
  context: { squelette: 1, muscles: 0.6, organes: 1, cardio: 1, nerveux: 0.85, exposition: 1 } satisfies Record<LayerId, number>,

  /** Enveloppe du corps. */
  shell: {
    /** Opacité quand AUCUN calque interne n'est actif (silhouette seule). */
    opacityAlone: 1.6,
    /** Opacité quand des calques internes sont actifs (plus discrète). */
    opacityWithLayers: 0.75,
  },

  /** Teinte de statut (0 = hologramme neutre, 1 = couleur de statut pleine). */
  status: {
    /** Vert : l'organe reste neutre, avec un simple soupçon de vert. */
    green: 0.14,
    amber: 0.92,
    red: 1,
    /** Gris = inconnu / non modélisé (jamais vert par défaut). */
    grey: 0.95,
    /** Opacité relative des organes gris (plus éteints). */
    greyOpacity: 0.7,
    /** Vitesse de transition des teintes quand le jour change (1/s). */
    lerpSpeed: 7,
  },

  /** Corps projeté (jour > aujourd'hui) : rendu « fantôme ». */
  ghost: {
    /** Opacité relative du fantôme. */
    opacity: 0.55,
    /** Tirets horizontaux : nombre de tranches par mètre. */
    dashDensity: 72,
    /** Part de chaque tranche qui reste visible (0..1). */
    dashFill: 0.5,
    /** Vitesse de la transition mesuré ↔ projeté (1/s). */
    lerpSpeed: 5,
  },

  /** Balayage du scan (pieds → tête). */
  scan: {
    /** Durée du balayage, en secondes. */
    duration: 2.6,
    /** Épaisseur de la bande lumineuse sur le corps, en mètres. */
    bandWidth: 0.016,
    /** Intensité de la bande lumineuse. */
    bandBoost: 1.1,
    /** Hauteurs de départ et d'arrivée du plan, en mètres. */
    yStart: -0.05,
    yEnd: 1.84,
    /** Rayon de l'anneau qui matérialise le plan de scan. */
    ringRadius: 0.52,
    /** Opacité du disque et de l'anneau. */
    discOpacity: 0.05,
    ringOpacity: 0.7,
  },

  /** Flux sanguin : tirets lumineux qui courent le long des vaisseaux. */
  flow: {
    /** Tirets par mètre de vaisseau. */
    density: 9,
    /** Vitesse (mètres par seconde). */
    speed: 0.22,
    /** Surbrillance d'un tiret. */
    boost: 2.2,
  },

  /** Carte de chaleur du calque exposition. */
  heat: {
    /** Nombre de paliers (courbes de niveau). */
    levels: 6,
    /** Gain d'opacité des zones les plus exposées. */
    gain: 9,
    /** Opacité des lignes de niveau. */
    contour: 0.8,
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
    position: [0, 1.0, 4.0] as [number, number, number],
    target: [0, 0.92, 0] as [number, number, number],
    minDistance: 1.1,
    maxDistance: 6.5,
    /** Limites d'inclinaison (radians depuis le zénith). */
    minPolar: 0.9,
    maxPolar: 1.95,
    damping: 0.08,
    rotateSpeed: 0.7,
    zoomSpeed: 0.7,
    /** Distance caméra → organe quand un organe est sélectionné. */
    focusDistance: 2.3,
    /** Vitesse du recentrage (1/s). */
    focusSpeed: 3.2,
  },

  /** Léger balancement du corps au repos (donne vie sans perdre le gauche/droite). */
  sway: {
    enabled: true,
    /** Amplitude en radians (0,2 ≈ 11°). */
    amplitude: 0.2,
    /** Période complète en secondes. */
    period: 22,
    /** Secondes d'inactivité avant de reprendre le balancement. */
    idleDelay: 4,
  },

  /** Sol gradué + règle verticale. */
  floor: {
    radius: 0.62,
    /** Opacité des traits. */
    opacity: 0.3,
    /** Opacité des graduations fines. */
    minorOpacity: 0.14,
    ruler: true,
    rulerX: -0.66,
    rulerOpacity: 0.2,
  },

  /** Post-traitement. Le rendu doit rester correct avec enabled = false. */
  bloom: {
    enabled: true,
    /** Seuil de luminance : seules les zones vives (alertes, liserés) diffusent. */
    threshold: 0.62,
    smoothing: 0.25,
    intensity: 0.55,
    radius: 0.62,
    /** Anticrénelage du post-traitement (0, 2, 4 ou 8 échantillons ; 0 = le plus rapide). */
    multisampling: 4,
    /** Vignettage (0 = aucun). */
    vignette: 0.55,
    vignetteOffset: 0.3,
  },
};

export type Look = typeof look;
