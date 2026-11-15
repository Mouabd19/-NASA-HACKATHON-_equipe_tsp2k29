// Anatomie procédurale — « corps de secours » (SIMULÉ, stylisé, pas un atlas médical).
// AUCUNE dépendance à React. La scène ne connaît que la liste PartDef[] : un chargeur
// .glb (modèles de Steve) pourra produire exactement la même liste et remplacer buildAnatomy().
//
// Repère : mètres ; pieds sur y = 0, sommet du crâne y ≈ 1,75 ; centré sur x = 0, z = 0 ;
// le corps REGARDE +Z. La gauche de l'astronaute est donc en +X (à droite de l'écran, vu de face).
import * as THREE from 'three';
import type { LayerId, ModelManifest, OrganId } from '../types';
import { ellipsoid, polygonise, roundCone, smax, smin, sphere } from './core/sdf';
import { blob, fixWinding, fusiform, merge, taperTube, triangleCount } from './core/geo';
import type { V3 } from './core/geo';
import { look } from './look';

export interface PartDef {
  key: string;
  organId: OrganId | null;                 // null = contexte (non cliquable)
  layer: LayerId | 'shell';
  geometry: THREE.BufferGeometry;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  modeled: boolean;                        // false = gris « non modélisé »
  /** Ajout (optionnel) : autres calques qui affichent aussi cette pièce (cœur → cardio, cerveau → nerveux). */
  alsoLayers?: LayerId[];
  /** Ajout (optionnel) : 'flow' = vaisseau (tirets animés le long de uv.x), 'heat' = carte de dose. */
  fx?: 'flow' | 'heat';
  /** Ajout (optionnel) : poids de la teinte de statut (défaut 1). < 1 = pièce périphérique d'un organe étendu. */
  tintWeight?: number;
}

// ───────────────────────────── fabrique de pièces ─────────────────────────────

interface PartOpts { modeled?: boolean; alsoLayers?: LayerId[]; fx?: 'flow' | 'heat'; position?: V3; tintWeight?: number }

function part(key: string, organId: OrganId | null, layer: PartDef['layer'], geometry: THREE.BufferGeometry, o: PartOpts = {}): PartDef {
  return {
    key, organId, layer, geometry,
    position: o.position ?? [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1],
    modeled: o.modeled ?? true, alsoLayers: o.alsoLayers, fx: o.fx, tintWeight: o.tintWeight,
  };
}

/** Pièce paire : la géométrie est construite côté gauche (+X) et PARTAGÉE avec le côté droit (miroir). */
function pair(key: string, organId: OrganId | null, layer: PartDef['layer'], geometry: THREE.BufferGeometry, o: PartOpts & { rightOffset?: V3 } = {}): PartDef[] {
  const left = part(`${key}-g`, organId, layer, geometry, o);
  const right = part(`${key}-d`, organId, layer, geometry, o);
  right.scale = [-1, 1, 1];
  if (o.rightOffset) right.position = o.rightOffset;
  return [left, right];
}

const finish = (g: THREE.BufferGeometry | THREE.BufferGeometry[]): THREE.BufferGeometry => {
  const out = fixWinding(merge(Array.isArray(g) ? g : [g]));
  out.computeBoundingSphere();
  out.computeBoundingBox();
  return out;
};

// ───────────────────────────── repères du squelette ─────────────────────────────

// Courbure du rachis dans le plan sagittal : (y, z) du centre des corps vertébraux.
const SPINE_KNOTS: [number, number][] = [
  [1.60, -0.014], [1.53, -0.008], [1.47, -0.030], [1.40, -0.058], [1.30, -0.068],
  [1.20, -0.055], [1.12, -0.038], [1.05, -0.036], [1.00, -0.050], [0.95, -0.070], [0.89, -0.072],
];
const spineLut = (() => {
  const curve = new THREE.CatmullRomCurve3(SPINE_KNOTS.map(([y, z]) => new THREE.Vector3(0, y, z)));
  return curve.getSpacedPoints(160); // y décroissant
})();
/** z du rachis à la hauteur y. */
export function spineZ(y: number): number {
  const n = spineLut.length;
  if (y >= spineLut[0].y) return spineLut[0].z;
  for (let i = 1; i < n; i++) {
    if (spineLut[i].y <= y) {
      const a = spineLut[i - 1], b = spineLut[i];
      const t = (a.y - y) / Math.max(1e-6, a.y - b.y);
      return a.z + (b.z - a.z) * t;
    }
  }
  return spineLut[n - 1].z;
}

interface Vertebra { y: number; r: number; h: number; proc: number; wide: number }
const VERTEBRAE: Vertebra[] = (() => {
  const out: Vertebra[] = [];
  const seg = (count: number, y0: number, y1: number, r0: number, r1: number, proc: number, wide0: number, wide1: number) => {
    const step = (y0 - y1) / (count - 1);
    for (let i = 0; i < count; i++) {
      const t = i / (count - 1);
      out.push({ y: y0 - i * step, r: r0 + (r1 - r0) * t, h: step * 0.7, proc, wide: wide0 + (wide1 - wide0) * t });
    }
  };
  seg(7, 1.568, 1.488, 0.0105, 0.0125, 0.020, 0.020, 0.026);   // cervicales
  seg(12, 1.468, 1.200, 0.0135, 0.0195, 0.032, 0.030, 0.030);  // thoraciques
  seg(5, 1.172, 1.042, 0.0215, 0.0245, 0.030, 0.038, 0.042);   // lombaires
  return out;
})();
const THORACIC = VERTEBRAE.slice(7, 19);

// Côtes : demi-largeur de la cage à chaque niveau, hauteur d'arrivée devant.
const RIB_A = [0.058, 0.082, 0.100, 0.113, 0.121, 0.127, 0.131, 0.133, 0.131, 0.126, 0.117, 0.104];
const RIB_FRONT_Y = [1.405, 1.385, 1.360, 1.335, 1.310, 1.285, 1.262, 1.232, 1.203, 1.178, 1.180, 1.170];
const RIB_END: (V3 | null)[] = [
  null, null, null, null, null, null, null,
  [0.034, 1.236, 0.077], [0.058, 1.206, 0.076], [0.084, 1.180, 0.068], null, null,
];
const RIB_THETA_MAX = [2.55, 2.6, 2.62, 2.64, 2.64, 2.62, 2.58, 2.45, 2.3, 2.1, 1.65, 1.25];
const sternumZ = (y: number): number => 0.046 + (1.41 - y) * 0.2;

/** Trajet d'une côte gauche (+X), du rachis vers le sternum. `inset` rétrécit (nerfs intercostaux). */
function ribPath(i: number, inset = 0, thetaCap = Infinity): V3[] {
  const v = THORACIC[i];
  const z0 = spineZ(v.y);
  const zs = sternumZ(RIB_FRONT_Y[i]);
  const a = RIB_A[i] - inset;
  const b = Math.min(0.082, (zs - z0) / 1.8) - inset;
  const zc = z0 + b * 0.8;
  const thetaMax = Math.min(RIB_THETA_MAX[i], thetaCap);
  const drop = v.y - RIB_FRONT_Y[i];
  const pts: V3[] = [[0.014, v.y, z0 - 0.008]];
  const n = 9;
  for (let k = 0; k <= n; k++) {
    const th = 0.28 + (thetaMax - 0.28) * (k / n);
    const f = (1 - Math.cos(Math.min(Math.PI, th * 1.1))) / 2;
    pts.push([a * Math.sin(th), v.y - drop * f, zc - b * Math.cos(th)]);
  }
  if (thetaCap === Infinity) {
    const end = RIB_END[i];
    if (i < 7) pts.push([0.016, RIB_FRONT_Y[i], zs]);
    else if (end) pts.push(end);
  }
  return pts;
}

// ───────────────────────────── enveloppe (shell) ─────────────────────────────

function shellSdf(x: number, y: number, z: number): number {
  const ax = Math.abs(x);
  // tête + mâchoire + cou
  let d = ellipsoid(ax, y, z, 0, 1.635, -0.003, 0.078, 0.115, 0.100);
  d = smin(d, ellipsoid(ax, y, z, 0, 1.568, 0.030, 0.055, 0.052, 0.060), 0.03);
  d = smin(d, roundCone(ax, y, z, 0, 1.43, -0.014, 0, 1.56, -0.008, 0.058, 0.052), 0.03);
  // tronc
  let t = ellipsoid(ax, y, z, 0, 1.30, 0, 0.170, 0.185, 0.113);
  t = smin(t, roundCone(ax, y, z, 0.03, 1.455, -0.02, 0.165, 1.418, -0.016, 0.050, 0.052), 0.05); // trapèzes / épaules
  t = smin(t, ellipsoid(ax, y, z, 0.078, 1.335, 0.062, 0.070, 0.050, 0.040), 0.04);              // pectoraux
  t = smin(t, ellipsoid(ax, y, z, 0, 1.10, 0.002, 0.140, 0.150, 0.098), 0.06);                   // taille
  t = smin(t, ellipsoid(ax, y, z, 0, 0.955, -0.004, 0.170, 0.125, 0.108), 0.06);                 // bassin
  t = smin(t, ellipsoid(ax, y, z, 0.082, 0.925, -0.062, 0.080, 0.085, 0.062), 0.04);             // fessiers
  d = smin(d, t, 0.035);
  // bras (pose en A)
  let arm = roundCone(ax, y, z, 0.200, 1.405, -0.016, 0.262, 1.150, -0.014, 0.051, 0.040);
  arm = smin(arm, roundCone(ax, y, z, 0.262, 1.150, -0.014, 0.326, 0.890, 0.020, 0.041, 0.026), 0.02);
  arm = smin(arm, ellipsoid(ax, y, z, 0.342, 0.797, 0.027, 0.019, 0.088, 0.043), 0.025);
  d = smin(d, arm, 0.03);
  // jambes
  let leg = roundCone(ax, y, z, 0.096, 0.895, 0, 0.088, 0.520, 0.002, 0.086, 0.057);
  leg = smin(leg, roundCone(ax, y, z, 0.088, 0.505, 0, 0.082, 0.100, -0.008, 0.052, 0.034), 0.03);
  leg = smin(leg, ellipsoid(ax, y, z, 0.086, 0.365, -0.030, 0.050, 0.115, 0.048), 0.03);          // galbe du mollet
  leg = smin(leg, roundCone(ax, y, z, 0.082, 0.046, -0.040, 0.088, 0.030, 0.150, 0.042, 0.028), 0.025); // pied
  d = smin(d, leg, 0.035);
  return Math.max(d, -y + 0.001);
}

// ───────────────────────────── squelette ─────────────────────────────

function skullSdf(x: number, y: number, z: number): number {
  const ax = Math.abs(x);
  let d = ellipsoid(ax, y, z, 0, 1.662, -0.008, 0.071, 0.078, 0.088);            // voûte
  d = smin(d, ellipsoid(ax, y, z, 0, 1.602, 0.040, 0.050, 0.050, 0.048), 0.02);   // face
  d = smin(d, ellipsoid(ax, y, z, 0.046, 1.612, 0.052, 0.018, 0.012, 0.020), 0.012); // pommettes
  let jaw = ellipsoid(ax, y, z, 0, 1.553, 0.036, 0.045, 0.022, 0.050);
  jaw = smin(jaw, roundCone(ax, y, z, 0.049, 1.605, 0.000, 0.043, 1.552, 0.006, 0.009, 0.010), 0.012);
  jaw = smax(jaw, -ellipsoid(ax, y, z, 0, 1.560, 0.010, 0.030, 0.030, 0.045), 0.01); // creux de l'arc mandibulaire
  d = smin(d, jaw, 0.006);
  d = smax(d, -sphere(ax, y, z, 0.032, 1.632, 0.078, 0.021), 0.008);              // orbites
  d = smax(d, -ellipsoid(ax, y, z, 0, 1.600, 0.092, 0.011, 0.020, 0.020), 0.006); // cavité nasale
  d = smax(d, -Math.max(Math.abs(y - 1.5745) - 0.0022, 0.045 - z), 0.004);        // ligne des dents
  return d;
}

function pelvisSdf(x: number, y: number, z: number): number {
  const ax = Math.abs(x);
  // ailes iliaques : coque d'ellipsoïde, bornée
  let wing = Math.abs(ellipsoid(ax, y, z, 0, 0.985, -0.012, 0.150, 0.118, 0.086)) - 0.0062;
  const crest = 1.052 - 5.5 * (z + 0.018) * (z + 0.018);                         // crête iliaque, plus basse devant et derrière
  wing = smax(wing, (y - crest) * 0.9, 0.014);
  wing = smax(wing, 0.928 - y, 0.012);
  wing = smax(wing, 0.050 - ax, 0.012);
  wing = smax(wing, -sphere(ax, y, z, 0, 1.035, 0.095, 0.112), 0.02);            // ouverture antérieure
  wing = smax(wing, -sphere(ax, y, z, 0.03, 1.075, -0.075, 0.045), 0.015);       // échancrure postérieure
  // sacrum : coin triangulaire aplati, basculé vers l'arrière (large en haut, pointe = coccyx) — pas une boule
  const sy = (y - 0.985), sz = (z + 0.066) - sy * 0.22;                          // repère basculé de ~12°
  const halfW = 0.008 + 0.050 * Math.min(1, Math.max(0, (y - 0.905) / 0.125));   // demi-largeur selon la hauteur
  let d = Math.max(ax - halfW, Math.abs(sy + 0.012) - 0.062, Math.abs(sz) - 0.011) - 0.006;
  d = smax(d, -sphere(ax, y, z, 0.022, 1.005, -0.050, 0.0065), 0.004);           // trous sacrés (évocation)
  d = smax(d, -sphere(ax, y, z, 0.018, 0.975, -0.056, 0.0055), 0.004);
  d = smin(d, roundCone(ax, y, z, 0.040, 1.012, -0.062, 0.078, 1.006, -0.050, 0.013, 0.012), 0.012); // aileron sacré → articulation sacro-iliaque
  d = smin(d, wing, 0.016);
  // corps de l'ilion : relie l'aile au cotyle
  d = smin(d, roundCone(ax, y, z, 0.108, 0.985, -0.010, 0.096, 0.940, -0.002, 0.014, 0.022), 0.014);
  // cotyle (cupule), branches pubiennes, ischion, symphyse
  d = smin(d, sphere(ax, y, z, 0.094, 0.927, 0.000, 0.031), 0.012);
  d = smin(d, roundCone(ax, y, z, 0.082, 0.930, 0.024, 0.014, 0.898, 0.062, 0.0115, 0.0125), 0.012);  // branche supérieure du pubis
  d = smin(d, ellipsoid(ax, y, z, 0.010, 0.888, 0.062, 0.013, 0.021, 0.011), 0.008);                   // corps du pubis / symphyse
  d = smin(d, roundCone(ax, y, z, 0.088, 0.908, -0.016, 0.064, 0.850, -0.030, 0.015, 0.0125), 0.012); // corps de l'ischion
  d = smin(d, ellipsoid(ax, y, z, 0.062, 0.842, -0.034, 0.014, 0.019, 0.018), 0.010);                  // tubérosité ischiatique
  d = smin(d, roundCone(ax, y, z, 0.060, 0.846, -0.024, 0.016, 0.872, 0.056, 0.0085, 0.0095), 0.010); // branche ischio-pubienne (ferme le trou obturé)
  d = smax(d, -sphere(ax, y, z, 0.094, 0.925, 0.004, 0.0245), 0.004);            // creux du cotyle (la tête fémorale s'y loge)
  return d;
}

/** Fémur proximal gauche : tête, col, grand trochanter (zone surveillée « col du fémur »). */
function femurNeckSdf(x: number, y: number, z: number): number {
  let d = sphere(x, y, z, 0.094, 0.925, 0.000, 0.0225);
  d = smin(d, roundCone(x, y, z, 0.094, 0.925, 0.000, 0.140, 0.892, -0.004, 0.0125, 0.0165), 0.008);
  d = smin(d, ellipsoid(x, y, z, 0.152, 0.902, -0.008, 0.016, 0.027, 0.019), 0.012);
  d = smin(d, sphere(x, y, z, 0.122, 0.858, -0.012, 0.011), 0.012);              // petit trochanter
  d = smin(d, roundCone(x, y, z, 0.143, 0.886, -0.004, 0.129, 0.800, 0.000, 0.018, 0.0145), 0.012);
  return d;
}

function buildSkeleton(): PartDef[] {
  const out: PartDef[] = [];
  const L: LayerId = 'squelette';

  out.push(part('crane', null, L, finish(polygonise(skullSdf, [-0.084, 1.52, -0.105], [0.084, 1.75, 0.10], 0.0068))));

  // rachis : 24 vertèbres (corps + apophyse épineuse + apophyses transverses)
  const verts: THREE.BufferGeometry[] = [];
  const up = new THREE.Vector3(0, 1, 0), tan = new THREE.Vector3(), q = new THREE.Quaternion();
  for (const v of VERTEBRAE) {
    const z = spineZ(v.y);
    tan.set(0, 0.02, spineZ(v.y + 0.01) - spineZ(v.y - 0.01)).normalize();
    q.setFromUnitVectors(up, tan);
    const body = new THREE.CylinderGeometry(v.r, v.r * 1.04, v.h, 12, 1);
    body.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(0, v.y, z), q, new THREE.Vector3(1, 1, 0.9)));
    verts.push(body);
    verts.push(taperTube(
      [[0, v.y, z - v.r * 0.8], [0, v.y - v.h * 0.25, z - v.r - v.proc * 0.5], [0, v.y - v.h * 0.9, z - v.r - v.proc]],
      (t) => v.r * (0.42 - 0.26 * t), { segments: 4, radial: 6 },
    ));
    verts.push(taperTube(
      [[-v.wide, v.y, z - v.r * 0.95], [0, v.y, z - v.r * 0.75], [v.wide, v.y, z - v.r * 0.95]],
      (t) => v.r * (0.2 + 0.2 * Math.sin(Math.PI * t)), { segments: 6, radial: 6, ref: [0, 1, 0] },
    ));
  }
  out.push(part('rachis', 'rachis', L, finish(verts)));

  // cage thoracique : 12 paires de côtes + sternum
  const ribs: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 12; i++) {
    const r0 = i < 10 ? 0.0046 : 0.0036;
    ribs.push(taperTube(ribPath(i), (t) => r0 * (t > 0.8 && i < 10 ? 0.8 : 1), { segments: 26, radial: 6, ref: [0, 1, 0], flat: 0.7 }));
  }
  out.push(...pair('cotes', null, L, finish(ribs)));
  out.push(part('sternum', null, L, finish(taperTube(
    [[0, 1.432, sternumZ(1.432)], [0, 1.39, sternumZ(1.39)], [0, 1.262, sternumZ(1.262)], [0, 1.225, sternumZ(1.225) - 0.002]],
    (t) => (t < 0.2 ? 0.024 - 0.03 * t : t > 0.82 ? 0.016 * (1 - (t - 0.82) / 0.22) : 0.0165), { segments: 14, radial: 10, flat: 0.32 },
  ))));

  // ceinture scapulaire + bras (côté gauche, partagé en miroir)
  const A = (x: number, y: number, z: number): V3 => [x, y, z];
  const arm: THREE.BufferGeometry[] = [
    taperTube([A(0.016, 1.420, 0.050), A(0.075, 1.436, 0.052), A(0.125, 1.440, 0.022), A(0.172, 1.448, -0.012)], 0.0062, { segments: 14, radial: 7 }), // clavicule
    // scapula : plaque triangulaire plaquée sur la cage, épine, acromion
    taperTube([A(0.112, 1.438, -0.062), A(0.104, 1.36, -0.074), A(0.090, 1.268, -0.072)],
      (t) => 0.004 + 0.05 * Math.pow(1 - t, 1.3) * Math.min(1, t * 9 + 0.35), { segments: 10, radial: 10, ref: [1, 0, 0.35], flat: 0.07 }),
    taperTube([A(0.070, 1.392, -0.084), A(0.128, 1.420, -0.068), A(0.184, 1.452, -0.022)], (t) => 0.0035 + 0.003 * t, { segments: 6, radial: 5 }),
    // humérus : tête + diaphyse + palette
    blob([0.180, 1.425, -0.016], [0.0225, 0.0225, 0.0225], [0, 0, 0], 12),
    taperTube([A(0.186, 1.412, -0.016), A(0.222, 1.29, -0.016), A(0.262, 1.152, -0.014)],
      (t) => 0.0105 + 0.007 * Math.pow(1 - t, 6) + 0.009 * Math.pow(t, 5), { segments: 12, radial: 8 }),
    // radius + ulna
    taperTube([A(0.270, 1.145, -0.006), A(0.300, 1.02, 0.012), A(0.333, 0.888, 0.030)], (t) => 0.0062 + 0.003 * t * t, { segments: 8, radial: 6 }),
    taperTube([A(0.255, 1.158, -0.024), A(0.290, 1.02, -0.006), A(0.319, 0.888, 0.012)], (t) => 0.0085 - 0.004 * t, { segments: 8, radial: 6 }),
    // carpe
    blob([0.330, 0.866, 0.024], [0.011, 0.013, 0.021], [0, 0, 0], 8),
  ];
  for (let f = 0; f < 4; f++) { // doigts longs
    const z0 = 0.040 - f * 0.011, z1 = 0.050 - f * 0.016;
    const len = [0.165, 0.175, 0.165, 0.14][f];
    arm.push(taperTube([A(0.332, 0.858, z0), A(0.342, 0.858 - len * 0.5, z1), A(0.350, 0.858 - len, z1 + 0.002)], (t) => 0.0042 - 0.002 * t, { straight: true, segments: 4, radial: 5 }));
  }
  arm.push(taperTube([A(0.328, 0.860, 0.040), A(0.332, 0.815, 0.062), A(0.337, 0.770, 0.070)], (t) => 0.0045 - 0.002 * t, { straight: true, segments: 3, radial: 5 })); // pouce
  out.push(...pair('membre-sup', null, L, finish(arm)));

  // bassin (hanche)
  out.push(part('bassin', 'hanche', L, finish(polygonise(pelvisSdf, [-0.168, 0.82, -0.105], [0.168, 1.07, 0.085], 0.0066))));

  // fémur : col (surveillé) + diaphyse (contexte)
  out.push(...pair('femur-col', 'femur', L, finish(polygonise(femurNeckSdf, [0.066, 0.795, -0.034], [0.174, 0.952, 0.028], 0.0048))));
  const leg: THREE.BufferGeometry[] = [
    taperTube([A(0.130, 0.806, 0.000), A(0.110, 0.66, 0.009), A(0.092, 0.535, 0.004)], (t) => 0.0142 + 0.012 * Math.pow(t, 5), { segments: 12, radial: 8 }),
    blob([0.070, 0.512, -0.004], [0.021, 0.021, 0.024], [0, 0, 0], 10),  // condyles
    blob([0.110, 0.512, -0.004], [0.021, 0.021, 0.024], [0, 0, 0], 10),
    blob([0.089, 0.514, 0.034], [0.019, 0.021, 0.009], [0, 0, 0], 10),   // rotule
    // tibia + fibula
    taperTube([A(0.089, 0.490, 0.000), A(0.087, 0.40, 0.008), A(0.083, 0.20, 0.002), A(0.081, 0.078, -0.002)],
      (t) => 0.0125 + 0.017 * Math.pow(1 - t, 7) + 0.006 * Math.pow(t, 6), { segments: 14, radial: 8 }),
    taperTube([A(0.119, 0.470, -0.018), A(0.114, 0.30, -0.016), A(0.104, 0.070, -0.012)],
      (t) => 0.0052 + 0.003 * Math.pow(1 - t, 6) + 0.004 * Math.pow(t, 6), { segments: 10, radial: 6 }),
    // pied : talus, calcanéus
    blob([0.082, 0.058, 0.002], [0.020, 0.018, 0.024], [0, 0, 0], 10),
    blob([0.082, 0.034, -0.044], [0.019, 0.021, 0.034], [0, 0, 0], 10),
  ];
  for (let f = 0; f < 5; f++) { // métatarsiens + orteils (f = 0 : gros orteil, côté médial)
    const x0 = 0.062 + f * 0.010, x1 = 0.052 + f * 0.017;
    const zEnd = 0.150 - f * 0.011;
    const r = f === 0 ? 0.0068 : 0.0048;
    leg.push(taperTube([A(x0, 0.045, 0.024), A(x1, 0.022, zEnd - 0.045), A(x1 + 0.001, 0.012, zEnd)], (t) => r * (1 - 0.45 * t), { straight: true, segments: 4, radial: 5 }));
  }
  out.push(...pair('membre-inf', null, L, finish(leg)));
  return out;
}

// ───────────────────────────── muscles ─────────────────────────────

function buildMuscles(): PartDef[] {
  const out: PartDef[] = [];
  const L: LayerId = 'muscles';

  // cuisse : quadriceps (droit fémoral, vastes) + ischio-jambiers
  out.push(...pair('cuisse', 'cuisse', L, finish([
    fusiform([0.108, 0.915, 0.030], [0.089, 0.535, 0.030], 0.031, { mid: [0.100, 0.72, 0.052], peak: 0.42, flat: 0.8 }),
    fusiform([0.145, 0.880, 0.004], [0.112, 0.535, 0.016], 0.033, { mid: [0.138, 0.70, 0.022], peak: 0.45, ref: [0, 0, 1], flat: 0.85 }),
    fusiform([0.074, 0.800, 0.014], [0.064, 0.530, 0.018], 0.030, { mid: [0.060, 0.64, 0.030], peak: 0.62, ref: [0, 0, 1], flat: 0.85 }),
    fusiform([0.120, 0.870, -0.036], [0.112, 0.515, -0.028], 0.031, { mid: [0.118, 0.69, -0.046], peak: 0.45 }),
    fusiform([0.064, 0.870, -0.040], [0.066, 0.515, -0.028], 0.031, { mid: [0.064, 0.69, -0.048], peak: 0.45 }),
  ])));

  // mollet : gastrocnémiens (chefs médial et latéral) + soléaire / tendon d'Achille
  out.push(...pair('mollet', 'mollet', L, finish([
    fusiform([0.068, 0.500, -0.026], [0.076, 0.250, -0.034], 0.029, { mid: [0.066, 0.385, -0.050], peak: 0.38 }),
    fusiform([0.106, 0.500, -0.026], [0.090, 0.265, -0.034], 0.026, { mid: [0.105, 0.395, -0.048], peak: 0.38 }),
    taperTube([[0.084, 0.330, -0.028], [0.082, 0.20, -0.034], [0.082, 0.065, -0.046]], (t) => (0.022 * Math.pow(1 - t, 1.5) + 0.006) * Math.min(1, t * 5 + 0.05), { segments: 12, radial: 8, flat: 0.6 }),
  ])));

  // paravertébraux : deux colonnes le long du rachis (érecteurs du rachis)
  const para: V3[] = [];
  // deux fuseaux continus (profil monotone de part et d'autre du ventre lombaire — pas de renflements)
  for (let i = 0; i <= 24; i++) {
    const y = 0.985 + (0.49 * i) / 24;
    para.push([0.034, y, spineZ(y) - 0.036]);
  }
  out.push(...pair('paravertebraux', 'paravertebraux', L, finish(taperTube(
    para, (t) => 0.006 + 0.019 * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.7)), 0.8),
    { segments: 36, radial: 10, flat: 0.5 },
  ))));

  // muscles de contexte (non cliquables) : donnent la silhouette musculaire
  const abs: THREE.BufferGeometry[] = [];
  // grand droit : 3 tablettes + un panneau bas, en pavés arrondis (pas en disques : ils se lisaient comme des boutons)
  for (const [y, z, w, h] of [[1.236, 0.090, 0.031, 0.027], [1.172, 0.093, 0.031, 0.027], [1.108, 0.093, 0.030, 0.027], [1.018, 0.086, 0.027, 0.052]] as const) {
    abs.push(blob([0.034, y, z], [w, h, 0.010], [y < 1.05 ? 0.12 : 0, 0, 0], 16, 0.45));
  }
  out.push(...pair('contexte-muscles', null, L, finish([
    ...abs,
    fusiform([0.176, 1.452, -0.014], [0.226, 1.262, -0.014], 0.044, { mid: [0.228, 1.385, -0.014], peak: 0.36, ref: [0, 0, 1], flat: 0.62 }), // deltoïde
    // grand pectoral : masse arrondie sur le thorax + faisceau vers l'humérus (plus de plaque triangulaire « omoplate »)
    blob([0.082, 1.342, 0.074], [0.072, 0.056, 0.022], [0.1, 0.42, -0.12], 16, 0.8),
    fusiform([0.120, 1.352, 0.062], [0.205, 1.372, 0.006], 0.030, { peak: 0.3, ref: [0, 1, 0], flat: 0.35 }),
    fusiform([0.212, 1.360, 0.006], [0.258, 1.165, 0.002], 0.027, { peak: 0.42 }),                // biceps
    fusiform([0.208, 1.380, -0.036], [0.262, 1.165, -0.034], 0.026, { peak: 0.45 }),              // triceps
    fusiform([0.258, 1.165, 0.004], [0.318, 0.915, 0.034], 0.022, { peak: 0.26, flat: 0.8 }),     // fléchisseurs de l'avant-bras
    fusiform([0.266, 1.160, -0.022], [0.326, 0.915, 0.010], 0.021, { peak: 0.28, flat: 0.8 }),    // extenseurs
    fusiform([0.150, 1.240, 0.020], [0.110, 0.990, 0.060], 0.050, { mid: [0.142, 1.11, 0.045], peak: 0.5, ref: [0, 0, 1], flat: 0.22 }), // oblique externe
    fusiform([0.030, 1.010, -0.078], [0.152, 0.850, -0.022], 0.060, { mid: [0.105, 0.935, -0.082], peak: 0.45, ref: [0, 1, 0], flat: 0.55 }), // grand fessier
    fusiform([0.052, 0.880, 0.000], [0.064, 0.600, 0.004], 0.028, { peak: 0.35, ref: [0, 0, 1] }), // adducteurs
    fusiform([0.103, 0.475, 0.016], [0.092, 0.180, 0.012], 0.018, { peak: 0.35 }),                // tibial antérieur
    fusiform([0.118, 0.460, -0.012], [0.108, 0.140, -0.012], 0.014, { peak: 0.35 }),              // fibulaires
    fusiform([0.012, 1.530, -0.050], [0.176, 1.440, -0.030], 0.040, { mid: [0.070, 1.455, -0.058], peak: 0.55, ref: [0, 0, 1], flat: 0.4 }), // trapèze
    fusiform([0.160, 1.340, -0.060], [0.050, 1.040, -0.074], 0.062, { mid: [0.128, 1.20, -0.086], peak: 0.3, ref: [1, 0, 0], flat: 0.2 }), // grand dorsal
    fusiform([0.024, 1.540, 0.020], [0.030, 1.445, 0.048], 0.012, { peak: 0.5 }),                 // sterno-cléido-mastoïdien
  ])));
  return out;
}

// ───────────────────────────── organes ─────────────────────────────

function heartSdf(x: number, y: number, z: number): number {
  let d = roundCone(x, y, z, 0.000, 1.320, 0.018, 0.056, 1.240, 0.044, 0.042, 0.014);          // ventricules, apex à gauche
  d = smin(d, ellipsoid(x, y, z, -0.034, 1.338, 0.012, 0.022, 0.028, 0.022), 0.015);            // oreillette droite
  d = smin(d, ellipsoid(x, y, z, 0.030, 1.345, 0.000, 0.022, 0.020, 0.020), 0.015);             // oreillette gauche
  d = smin(d, roundCone(x, y, z, 0.000, 1.345, 0.014, 0.006, 1.392, 0.008, 0.0145, 0.012), 0.012); // racine de l'aorte
  d = smin(d, roundCone(x, y, z, 0.014, 1.345, 0.034, 0.034, 1.380, 0.014, 0.0125, 0.010), 0.010); // tronc pulmonaire
  d = smax(d, -roundCone(x, y, z, 0.010, 1.345, 0.050, 0.052, 1.245, 0.062, 0.006, 0.004), 0.008); // sillon interventriculaire
  return d;
}

function kidneySdf(x: number, y: number, z: number): number {
  let d = ellipsoid(x, y, z, 0.064, 1.118, -0.040, 0.025, 0.051, 0.021);
  d = smax(d, -sphere(x, y, z, 0.026, 1.118, -0.034, 0.024), 0.012);                            // hile
  d = smin(d, roundCone(x, y, z, 0.046, 1.114, -0.036, 0.022, 1.060, -0.030, 0.006, 0.003), 0.006); // départ de l'uretère
  return d;
}

function lungSdf(x: number, y: number, z: number): number {
  let d = ellipsoid(x, y, z, 0.070, 1.325, -0.006, 0.050, 0.122, 0.068);
  d = smax(d, -sphere(x, y, z, 0.012, 1.290, 0.030, 0.060), 0.02);                              // empreinte cardiaque
  d = smax(d, -sphere(x, y, z, 0.050, 1.095, 0.000, 0.125), 0.02);                              // coupole diaphragmatique
  d = smax(d, -Math.max(Math.abs((y - 1.335) + (z + 0.005) * 0.8) - 0.0035, 0.045 - Math.abs(x - 0.02)), 0.006);           // scissure oblique (évocation)
  return d;
}

function liverSdf(x: number, y: number, z: number): number {
  let d = ellipsoid(x, y, z, -0.048, 1.180, 0.012, 0.092, 0.052, 0.066);
  const cut = ((x + 0.140) * 0.42 - (y - 1.130)) / 1.085;                                       // bord inférieur oblique
  d = smax(d, cut, 0.018);
  d = smax(d, -sphere(x, y, z, 0.000, 1.150, -0.075, 0.055), 0.015);                            // empreinte du rachis
  return d;
}

function brainSdf(x: number, y: number, z: number): number {
  const ax = Math.abs(x);
  let d = ellipsoid(ax, y, z, 0, 1.668, -0.008, 0.060, 0.055, 0.076);
  d += 0.0024 * Math.sin(x * 105 + Math.sin(y * 70) * 1.6) * Math.sin(y * 95 + Math.sin(z * 60) * 1.4) * Math.sin(z * 88 + 1.3); // circonvolutions
  d = smax(d, -Math.max(ax - 0.0026, 1.648 - y), 0.004);                                        // scissure interhémisphérique
  d = smin(d, ellipsoid(ax, y, z, 0, 1.619, -0.050, 0.042, 0.021, 0.030), 0.006);               // cervelet
  d = smin(d, roundCone(ax, y, z, 0, 1.628, -0.020, 0, 1.585, -0.016, 0.012, 0.008), 0.008);    // tronc cérébral
  return d;
}

function buildOrgans(): PartDef[] {
  const out: PartDef[] = [];
  const L: LayerId = 'organes';
  out.push(part('coeur', 'coeur', L, finish(polygonise(heartSdf, [-0.066, 1.215, -0.03], [0.08, 1.412, 0.078], 0.005)), { alsoLayers: ['cardio'] }));
  out.push(...pair('rein', 'reins', L, finish(polygonise(kidneySdf, [0.012, 1.05, -0.07], [0.096, 1.176, -0.012], 0.0044)), { rightOffset: [0, -0.014, 0] }));
  out.push(...pair('poumon', 'poumons', L, finish(polygonise(lungSdf, [0.005, 1.19, -0.082], [0.128, 1.455, 0.07], 0.0075)), { modeled: false }));
  out.push(part('foie', 'foie', L, finish(polygonise(liverSdf, [-0.148, 1.12, -0.062], [0.05, 1.24, 0.084], 0.0066)), { modeled: false }));
  out.push(part('cerveau', 'cerveau', L, finish(polygonise(brainSdf, [-0.068, 1.57, -0.09], [0.068, 1.73, 0.074], 0.0054)), { modeled: false, alsoLayers: ['nerveux'] }));
  return out;
}

// ───────────────────────────── cardio / sang ─────────────────────────────

function buildCardio(): PartDef[] {
  // Seule la crosse de l'aorte (où est posée l'ancre « sang ») porte la teinte de statut pleine :
  // le reste du réseau reste neutre, sinon tout le corps vire à la couleur d'UN statut.
  const PERIPHERAL = look.status.peripheral;
  const out: PartDef[] = [];
  const L: LayerId = 'cardio';
  const o = { segments: 40, radial: 6 };
  const aZ = (y: number): number => spineZ(y) + 0.028;

  // artères — le trajet part du cœur (uv.x croissant = sens du flux)
  const aorta: V3[] = [[0.004, 1.372, 0.010], [0.012, 1.404, -0.004], [0.014, 1.392, -0.030], [0.011, 1.33, aZ(1.33)], [0.009, 1.20, aZ(1.20)], [0.006, 1.065, aZ(1.065)]];
  out.push(part('arteres-axe', 'sang', L, finish([
    taperTube(aorta, (t) => 0.0105 - 0.004 * t, { segments: 36, radial: 8 }),
  ]), { fx: 'flow' }));

  const iliacFemoral: V3[] = [[0.006, 1.065, aZ(1.065)], [0.046, 0.995, 0.006], [0.082, 0.935, 0.034], [0.086, 0.80, 0.036], [0.076, 0.63, 0.010], [0.086, 0.505, -0.032],
    [0.086, 0.40, -0.022], [0.081, 0.20, -0.012], [0.078, 0.085, -0.020], [0.080, 0.036, 0.040], [0.078, 0.024, 0.105]];
  const carotid: V3[] = [[0.014, 1.402, -0.002], [0.030, 1.47, 0.010], [0.035, 1.55, 0.004], [0.032, 1.61, -0.002], [0.036, 1.665, 0.008], [0.022, 1.705, 0.030]];
  const brachial: V3[] = [[0.014, 1.400, -0.004], [0.075, 1.436, 0.010], [0.168, 1.412, 0.000], [0.214, 1.33, 0.000], [0.254, 1.17, 0.002], [0.300, 1.00, 0.016], [0.328, 0.885, 0.030], [0.342, 0.79, 0.038]];
  const arteriesL = [
    taperTube(iliacFemoral, (t) => 0.0056 - 0.0032 * t, { segments: 60, radial: 6 }),
    taperTube(carotid, (t) => 0.0040 - 0.0020 * t, o),
    taperTube(brachial, (t) => 0.0040 - 0.0020 * t, { segments: 48, radial: 6 }),
    taperTube([[0.009, 1.122, aZ(1.122)], [0.028, 1.120, -0.020], [0.046, 1.117, -0.034]], 0.0028, { segments: 8, radial: 5 }),          // artère rénale
    taperTube([[0.035, 1.60, -0.002], [0.050, 1.64, -0.030], [0.040, 1.69, -0.050]], (t) => 0.0022 - 0.001 * t, { segments: 10, radial: 5 }), // branche cérébrale
    taperTube([[0.086, 0.82, 0.036], [0.112, 0.74, 0.020], [0.118, 0.62, 0.000]], (t) => 0.0026 - 0.001 * t, { segments: 10, radial: 5 }),   // fémorale profonde
    taperTube([[0.086, 0.47, -0.028], [0.100, 0.36, 0.006], [0.095, 0.16, 0.012]], (t) => 0.0022 - 0.0008 * t, { segments: 10, radial: 5 }),  // tibiale antérieure
  ];
  for (let i = 2; i < 11; i++) arteriesL.push(taperTube(ribPath(i, 0.005, 2.3).slice(1), 0.0013, { segments: 14, radial: 3 })); // artères intercostales
  arteriesL.push(
    taperTube([[0.009, 1.165, aZ(1.165)], [0.030, 1.185, 0.020], [0.062, 1.205, 0.030]], (t) => 0.0026 - 0.001 * t, { segments: 8, radial: 4 }),   // splénique / hépatique (évocation)
    taperTube([[0.008, 1.10, aZ(1.10)], [0.020, 1.06, 0.040], [0.045, 1.01, 0.055]], (t) => 0.0024 - 0.001 * t, { segments: 8, radial: 4 }),        // mésentérique
    taperTube([[0.328, 0.885, 0.030], [0.336, 0.84, 0.052], [0.344, 0.78, 0.050]], 0.0012, { segments: 6, radial: 3 }),                          // arcade palmaire
    taperTube([[0.214, 1.33, 0.000], [0.236, 1.27, -0.024], [0.262, 1.17, -0.026]], 0.0014, { segments: 8, radial: 3 }),                         // brachiale profonde
    taperTube([[0.032, 1.61, -0.002], [0.046, 1.60, 0.040], [0.034, 1.575, 0.070]], 0.0012, { segments: 8, radial: 3 }),                         // faciale
    taperTube([[0.036, 1.665, 0.008], [0.050, 1.70, 0.020], [0.030, 1.735, 0.000]], 0.0012, { segments: 8, radial: 3 }),                         // temporale
  );
  out.push(...pair('arteres', 'sang', L, finish(arteriesL), { fx: 'flow', tintWeight: PERIPHERAL }));

  // veines — trajets de la périphérie VERS le cœur, légèrement décalés des artères
  const shift = (pts: V3[], dx: number, dz: number): V3[] => pts.map(([x, y, z]) => [Math.max(0.004, x + dx), y, z + dz] as V3).reverse();
  out.push(part('veines-axe', 'sang', L, finish([
    taperTube([[-0.020, 1.07, aZ(1.07) + 0.004], [-0.022, 1.18, aZ(1.18) + 0.006], [-0.024, 1.27, 0.000], [-0.030, 1.325, 0.012]], 0.0088, { segments: 20, radial: 8 }), // veine cave inf.
    taperTube([[-0.022, 1.435, 0.012], [-0.026, 1.39, 0.012], [-0.032, 1.352, 0.012]], 0.0075, { segments: 8, radial: 8 }),                                              // veine cave sup.
  ]), { fx: 'flow', tintWeight: PERIPHERAL }));
  const veinsL = [
    taperTube(shift(iliacFemoral.slice(1), 0.011, -0.008), (t) => 0.0026 + 0.0034 * t, { segments: 56, radial: 6 }),
    taperTube(shift(carotid.slice(1), 0.012, -0.006), (t) => 0.0024 + 0.0024 * t, o),            // jugulaire
    taperTube(shift(brachial.slice(1), 0.004, -0.012), (t) => 0.0022 + 0.0022 * t, { segments: 44, radial: 6 }),
  ];
  veinsL.push(
    taperTube([[0.060, 0.030, 0.090], [0.064, 0.10, 0.012], [0.058, 0.36, 0.006], [0.054, 0.52, -0.016], [0.058, 0.72, 0.030], [0.080, 0.90, 0.046], [0.068, 0.975, 0.012]],
      (t) => 0.0016 + 0.0014 * t, { segments: 40, radial: 4 }),                                    // grande saphène
    taperTube([[0.350, 0.80, 0.050], [0.340, 0.90, 0.040], [0.300, 1.04, 0.030], [0.262, 1.20, 0.022], [0.226, 1.34, 0.016], [0.176, 1.412, 0.014], [0.090, 1.440, 0.012]],
      (t) => 0.0014 + 0.0012 * t, { segments: 36, radial: 4 }),                                    // veine céphalique
  );
  out.push(...pair('veines', 'sang', L, finish(veinsL), { fx: 'flow', tintWeight: PERIPHERAL }));
  // raccords veineux vers l'axe (tronc brachio-céphalique, iliaques) — non symétriques
  out.push(part('veines-raccords', 'sang', L, finish([
    taperTube([[0.042, 1.47, 0.004], [0.020, 1.445, 0.010], [-0.022, 1.435, 0.012]], 0.0048, { segments: 8, radial: 6 }),
    taperTube([[-0.042, 1.47, 0.004], [-0.030, 1.452, 0.008], [-0.022, 1.435, 0.012]], 0.0048, { segments: 8, radial: 6 }),
    taperTube([[0.057, 0.995, -0.002], [0.016, 1.045, aZ(1.05)], [-0.020, 1.07, aZ(1.07) + 0.004]], 0.0058, { segments: 8, radial: 6 }),
    taperTube([[-0.057, 0.995, -0.002], [-0.036, 1.04, aZ(1.05)], [-0.020, 1.07, aZ(1.07) + 0.004]], 0.0058, { segments: 8, radial: 6 }),
  ]), { fx: 'flow', tintWeight: PERIPHERAL }));
  return out;
}

// ───────────────────────────── nerveux + yeux ─────────────────────────────

function buildNervous(): PartDef[] {
  const out: PartDef[] = [];
  const L: LayerId = 'nerveux';

  const cord: V3[] = [];
  for (let y = 1.585; y >= 1.16; y -= 0.03) cord.push([0, y, spineZ(y) - 0.017]);
  out.push(part('moelle', null, L, finish([
    taperTube(cord, (t) => 0.0062 - 0.0016 * t, { segments: 36, radial: 7 }),
    // queue de cheval
    ...[-0.008, -0.003, 0.003, 0.008].map((dx) => taperTube(
      [[dx * 0.3, 1.165, spineZ(1.165) - 0.017], [dx, 1.08, spineZ(1.08) - 0.019], [dx * 1.6, 0.99, spineZ(0.99) - 0.016]],
      0.0013, { segments: 8, radial: 4 },
    )),
  ])));

  // rayons grossis : à DPR 1 un nerf de 1 mm disparaît (trait < 1 px)
  const NERVE_K = 1.6;
  const nervesL: THREE.BufferGeometry[] = [
    // plexus brachial → nerf médian
    taperTube([[0.012, 1.495, -0.030], [0.075, 1.445, -0.014], [0.178, 1.402, -0.012], [0.224, 1.30, -0.016], [0.262, 1.16, -0.010], [0.302, 1.00, 0.008], [0.330, 0.872, 0.022], [0.346, 0.775, 0.030]],
      (t) => NERVE_K * (0.0034 - 0.0018 * t), { segments: 44, radial: 5 }),
    taperTube([[0.012, 1.470, -0.036], [0.078, 1.436, -0.020], [0.176, 1.398, -0.020]], NERVE_K * 0.0022, { segments: 12, radial: 4 }),
    // nerf ulnaire
    taperTube([[0.224, 1.30, -0.016], [0.250, 1.17, -0.034], [0.290, 1.00, -0.008], [0.322, 0.875, 0.008], [0.344, 0.79, 0.006]], (t) => NERVE_K * (0.0020 - 0.0008 * t), { segments: 24, radial: 4 }),
    // nerf sciatique → tibial
    taperTube([[0.014, 1.000, -0.058], [0.068, 0.935, -0.052], [0.096, 0.80, -0.036], [0.090, 0.60, -0.030], [0.086, 0.50, -0.036], [0.084, 0.30, -0.030], [0.082, 0.09, -0.032], [0.084, 0.032, 0.050]],
      (t) => NERVE_K * (0.0046 - 0.0026 * t), { segments: 48, radial: 5 }),
    // nerf fémoral
    taperTube([[0.012, 1.085, -0.046], [0.068, 0.965, 0.018], [0.100, 0.80, 0.046], [0.094, 0.60, 0.040]], (t) => NERVE_K * (0.0030 - 0.0016 * t), { segments: 24, radial: 5 }),
    // nerf fibulaire
    taperTube([[0.088, 0.52, -0.034], [0.116, 0.46, -0.014], [0.104, 0.25, 0.010], [0.096, 0.09, 0.014]], (t) => NERVE_K * (0.0020 - 0.0008 * t), { segments: 16, radial: 4 }),
    // nerf facial / trijumeau (évocation)
    taperTube([[0.010, 1.618, -0.014], [0.042, 1.606, 0.020], [0.040, 1.585, 0.060]], NERVE_K * 0.0013, { segments: 10, radial: 4 }),
  ];
  for (let i = 0; i < 12; i++) nervesL.push(taperTube(ribPath(i, 0.006, 1.7), NERVE_K * 0.0012, { segments: 10, radial: 3 })); // nerfs intercostaux
  for (const y of [1.14, 1.105, 1.07, 1.035]) nervesL.push(taperTube([[0.004, y, spineZ(y) - 0.018], [0.040, y - 0.02, -0.040], [0.085, y - 0.05, -0.020]], NERVE_K * 0.0012, { segments: 8, radial: 4 })); // racines lombaires
  out.push(...pair('nerfs', null, L, finish(nervesL)));

  // yeux + nerfs optiques (gaine du nerf optique = mesure SANS)
  out.push(...pair('oeil', 'yeux', L, finish([
    blob([0.032, 1.632, 0.070], [0.0118, 0.0118, 0.0118], [0, 0, 0], 14),
    taperTube([[0.032, 1.632, 0.059], [0.016, 1.629, 0.030], [0.001, 1.627, 0.012]], (t) => 0.0034 - 0.001 * t, { segments: 10, radial: 6 }),
    taperTube([[0.001, 1.627, 0.012], [0.014, 1.632, -0.020], [0.024, 1.640, -0.060]], 0.0018, { segments: 8, radial: 4 }), // voies optiques
  ])));
  return out;
}

// ───────────────────────────── assemblage ─────────────────────────────

let cache: PartDef[] | null = null;
let source: 'procedural' | 'z-anatomy' = 'procedural';
let manifestAnchors: Record<string, V3> | null = null;

/** Ajout (Steve) : remplace le corps procédural par les pièces Z-Anatomy chargées (src/three/zanatomy.ts). À appeler AVANT le premier rendu. */
export function setLoadedAnatomy(parts: PartDef[], manifest: ModelManifest): void {
  cache = parts;
  source = 'z-anatomy';
  manifestAnchors = Object.fromEntries(manifest.organs.map((o) => [o.id, o.anchor as V3]));
}

/** Ajout (Steve) : 'z-anatomy' si les vrais modèles sont chargés, sinon 'procedural' (corps de secours). */
export function anatomySource(): 'procedural' | 'z-anatomy' {
  return source;
}

/** Construit (une seule fois) toutes les pièces du corps procédural. */
export function buildAnatomy(): PartDef[] {
  if (cache) return cache;
  const shell = finish(polygonise(shellSdf, [-0.40, -0.012, -0.135], [0.40, 1.765, 0.19], 0.0138));
  const parts: PartDef[] = [
    part('enveloppe', null, 'shell', shell),
    ...buildSkeleton(),
    ...buildMuscles(),
    ...buildOrgans(),
    ...buildCardio(),
    ...buildNervous(),
    // exposition : enveloppe basse résolution, rendue en carte de chaleur par la scène
    part('dose-carte', 'dose', 'exposition', finish(polygonise(shellSdf, [-0.40, -0.012, -0.135], [0.40, 1.765, 0.19], 0.021)), { fx: 'heat' }),
  ];
  cache = parts;
  return parts;
}

/** Pièces d'un organe (pour la visionneuse isolée). */
export function organParts(organId: OrganId): PartDef[] {
  return buildAnatomy().filter((p) => p.organId === organId);
}

/** Calques qui affichent une pièce. */
export function partLayers(p: PartDef): LayerId[] {
  if (p.layer === 'shell') return [];
  return p.alsoLayers ? [p.layer, ...p.alsoLayers] : [p.layer];
}

/** Nombre total de triangles réellement dessinés (les géométries partagées comptent à chaque usage). */
export function anatomyTriangles(): number {
  return buildAnatomy().reduce((n, p) => n + triangleCount(p.geometry), 0);
}

// Ancres des warnings : posées SUR la géométrie visible, réparties gauche/droite
// pour que les panneaux ne se chevauchent pas. (+X = gauche de l'astronaute = droite de l'écran.)
const ANCHORS: Record<string, V3> = {
  hanche: [-0.128, 1.012, 0.022],          // aile iliaque droite
  rachis: [0.000, 1.105, -0.020],          // vertèbres lombaires
  femur: [0.118, 0.908, 0.004],            // col du fémur gauche
  cuisse: [-0.100, 0.720, 0.070],          // quadriceps droit
  mollet: [0.072, 0.385, -0.058],          // gastrocnémien gauche
  paravertebraux: [-0.034, 1.240, -0.100], // colonne paravertébrale droite
  coeur: [0.030, 1.290, 0.052],
  reins: [0.070, 1.120, -0.022],           // rein gauche
  poumons: [-0.085, 1.370, 0.040],         // poumon droit
  foie: [-0.075, 1.185, 0.062],
  cerveau: [0.000, 1.705, 0.045],
  sang: [0.012, 1.404, -0.004],            // crosse de l'aorte
  yeux: [0.032, 1.632, 0.081],             // œil gauche
  dose: [-0.150, 1.440, 0.030],            // épaule droite (peau)
};

export const FALLBACK_MANIFEST: ModelManifest = {
  layers: [
    { id: 'squelette', file: '', organs: ['hanche', 'rachis', 'femur'] },
    { id: 'muscles', file: '', organs: ['cuisse', 'mollet', 'paravertebraux'] },
    { id: 'organes', file: '', organs: ['coeur', 'reins', 'poumons', 'foie', 'cerveau'] },
    { id: 'cardio', file: '', organs: ['sang', 'coeur'] },
    { id: 'nerveux', file: '', organs: ['yeux', 'cerveau'] },
    { id: 'exposition', file: '', organs: ['dose'] },
  ],
  organs: Object.entries(ANCHORS).map(([id, anchor]) => ({ id, anchor })),
  credits: 'Procedural fallback body — TriFlow team (stylized)',
};

/** Position monde de l'ancre du warning d'un organe. */
export function getAnchor(organId: OrganId): [number, number, number] | null {
  return manifestAnchors?.[organId] ?? ANCHORS[organId] ?? null;
}

/** Ajout (Steve) : ancres actives (manifeste Z-Anatomy si chargé, sinon corps procédural). */
export function activeAnchors(): { id: OrganId; anchor: [number, number, number] }[] {
  return FALLBACK_MANIFEST.organs.map((o) => ({ id: o.id, anchor: (manifestAnchors?.[o.id] ?? o.anchor) as [number, number, number] }));
}

/** Calques dans lesquels un organe est visible. */
export function organLayers(organId: OrganId): LayerId[] {
  return FALLBACK_MANIFEST.layers.filter((l) => l.organs.includes(organId)).map((l) => l.id);
}
