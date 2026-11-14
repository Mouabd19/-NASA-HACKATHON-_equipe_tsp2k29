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
    tintBoost: 0.15,
    /** Remplissage du volume d'un organe en alerte (lueur « à cœur »). */
    tintCore: 0.04,
    /** Gain d'opacité au survol / sélection. */
    highlightBoost: 0.8,
    /** Part d'opacité retirée aux pièces non survolées (0..1). */
    dimFactor: 0.68,
    /** Plafond d'alpha par fragment (évite le blanc brûlé en additif). */
    alphaMax: 0.85,
  },

  /** Rendu par calque. L'enveloppe (« shell ») est toujours visible. */
  layers: {
    shell: { opacity: 1, core: 0.012, rim: 0.4, fresnelPower: 3.0 },
    squelette: { opacity: 1, core: 0.07, rim: 0.62, fresnelPower: 1.7 },
    muscles: { opacity: 1, core: 0.045, rim: 0.7, fresnelPower: 1.6 },
    organes: { opacity: 1, core: 0.06, rim: 0.68, fresnelPower: 1.8 },
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
    /** Vert : l'organe reste neutre, avec un simple soupçon de vert. */
    green: 0.14,
    amber: 0.8,
    /** Poids de la teinte sur les pièces « périphériques » d'un organe étendu (réseau vasculaire hors crosse de l'aorte). */
    peripheral: 0.15,
    red: 1,
    /** Gris = inconnu / non modélisé (jamais vert par défaut). */
    grey: 0.95,
    /** Opacité relative des organes gris (plus éteints). */
    greyOpacity: 1,
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
    duration: 3.2,
    /** Épaisseur de la bande lumineuse sur le corps, en mètres. */
    bandWidth: 0.05,
    /** Intensité de la bande lumineuse. */
    bandBoost: 0.55,
    /** Traîne lumineuse sous le plan (0 = aucune) et sa longueur en mètres. */
    trail: 0.6,
    trailLength: 0.45,
    /** Hauteurs de départ et d'arrivée du plan, en mètres. */
    yStart: -0.05,
    yEnd: 1.84,
    /** Rayon de l'anneau qui matérialise le plan de scan. */
    ringRadius: 0.34,
    /** Opacité du disque et de l'anneau. */
    discOpacity: 0.05,
    ringOpacity: 0.8,
    /** Opacité résiduelle AU-DESSUS du plan pendant le balayage : calques internes (le scanner « reconstruit » le corps) et enveloppe. */
    hideInner: 0.06,
    hideShell: 0.55,
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
    /** Distance caméra → organe quand un organe est sélectionné. */
    /** Cadrage selon la hauteur du canevas : marge réservée (px) et hauteur de référence (px) où la distance par défaut est juste. */
    fitPadPx: 40,
    fitRefPx: 660,
    focusDistance: 3.05,
    /** Part du chemin (en hauteur) entre le centre du corps et l'organe épinglé (0 = cadrage inchangé, 1 = organe centré). */
    focusPull: 0.55,
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
    /** Côté DROIT du corps : le haut-gauche de la scène porte les étiquettes de provenance (la règle ne les traverse plus). */
    rulerX: 0.7,
    rulerOpacity: 0.2,
  },

  /** Post-traitement. Le rendu doit rester correct avec enabled = false. */
  bloom: {
    enabled: true,
    /** Seuil de luminance : seules les zones vives (alertes, liserés) diffusent. */
    threshold: 0.7,
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
