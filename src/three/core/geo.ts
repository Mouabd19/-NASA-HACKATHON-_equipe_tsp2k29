// Petits outils de géométrie procédurale (sans React) : tubes à rayon variable,
// fusion, symétrie, orientation cohérente des faces.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export type V3 = [number, number, number];

export interface TubeOpts {
  /** Nombre de segments le long du trajet. */
  segments?: number;
  /** Nombre de côtés de la section. */
  radial?: number;
  /** Vecteur de référence : la section est aplatie/élargie selon cet axe (rayon `a`). */
  ref?: V3;
  /** Rapport d'aplatissement : rayon selon l'axe perpendiculaire à `ref` = r × flat. */
  flat?: number;
  /** Trajet rectiligne entre les points (sinon spline de Catmull-Rom). */
  straight?: boolean;
}

/**
 * Tube le long d'un trajet, de rayon r(t) (t de 0 à 1). Les extrémités sont fermées.
 * uv.x = abscisse curviligne en MÈTRES (sert à animer le flux sanguin), uv.y = tour.
 */
export function taperTube(points: V3[], radius: number | ((t: number) => number), opts: TubeOpts = {}): THREE.BufferGeometry {
  const pts = points.map((p) => new THREE.Vector3(p[0], p[1], p[2]));
  const curve: THREE.Curve<THREE.Vector3> = opts.straight || pts.length < 3
    ? polyline(pts)
    : new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  const segs = opts.segments ?? Math.max(8, pts.length * 6);
  const radial = opts.radial ?? 8;
  const flat = opts.flat ?? 1;
  const ref = new THREE.Vector3(...(opts.ref ?? [1, 0, 0]));
  const rAt = typeof radius === 'number' ? () => radius : radius;

  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const P = new THREE.Vector3(), T = new THREE.Vector3(), N = new THREE.Vector3(), B = new THREE.Vector3();
  const prev = new THREE.Vector3();
  let arc = 0;

  // anneau 0 et anneau segs+2 = bouchons (rayon nul)
  const rings = segs + 3;
  for (let s = 0; s < rings; s++) {
    const cap = s === 0 ? -1 : s === rings - 1 ? 1 : 0;
    const t = Math.min(1, Math.max(0, (s - 1) / segs));
    curve.getPoint(t, P);
    curve.getTangent(t, T).normalize();
    if (s > 0) arc += P.distanceTo(prev);
    prev.copy(P);
    N.copy(ref).addScaledVector(T, -ref.dot(T));
    if (N.lengthSq() < 1e-6) N.set(0, 0, 1).addScaledVector(T, -T.z);
    N.normalize();
    B.crossVectors(T, N).normalize();
    const r = cap !== 0 ? 0 : Math.max(0, rAt(t));
    for (let i = 0; i <= radial; i++) {
      const a = (i / radial) * Math.PI * 2;
      const ca = Math.cos(a), sa = Math.sin(a);
      positions.push(P.x + (N.x * ca + B.x * sa * flat) * r, P.y + (N.y * ca + B.y * sa * flat) * r, P.z + (N.z * ca + B.z * sa * flat) * r);
      if (cap !== 0) normals.push(T.x * cap, T.y * cap, T.z * cap);
      else {
        // normale d'une section elliptique
        const nx = N.x * ca * flat + B.x * sa, ny = N.y * ca * flat + B.y * sa, nz = N.z * ca * flat + B.z * sa;
        const l = Math.hypot(nx, ny, nz) || 1;
        normals.push(nx / l, ny / l, nz / l);
      }
      uvs.push(arc, i / radial);
    }
  }
  const row = radial + 1;
  for (let s = 0; s < rings - 1; s++) {
    for (let i = 0; i < radial; i++) {
      const a = s * row + i, b = a + 1, c = a + row, d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  return geo;
}

function polyline(pts: THREE.Vector3[]): THREE.Curve<THREE.Vector3> {
  const path = new THREE.CurvePath<THREE.Vector3>();
  for (let i = 0; i < pts.length - 1; i++) path.add(new THREE.LineCurve3(pts[i], pts[i + 1]));
  return path;
}

/** Volume fusiforme (muscle) entre a et b, rayon maximal rmax vers `peak` (0..1). */
export function fusiform(a: V3, b: V3, rmax: number, opts: TubeOpts & { peak?: number; mid?: V3 } = {}): THREE.BufferGeometry {
  const peak = opts.peak ?? 0.45;
  const k = Math.log(0.5) / Math.log(peak);
  const pts: V3[] = opts.mid ? [a, opts.mid, b] : [a, b];
  return taperTube(pts, (t) => rmax * Math.pow(Math.sin(Math.PI * Math.pow(t, k)), 0.7), { segments: 14, radial: 10, ...opts });
}

/** Ellipsoïde orienté (sphère mise à l'échelle), en espace monde. */
export function blob(c: V3, r: V3, rot: V3 = [0, 0, 0], detail = 14, square = 1): THREE.BufferGeometry {
  const g = new THREE.SphereGeometry(1, detail, Math.max(6, Math.round(detail * 0.7)));
  // square < 1 : super-ellipsoïde (pavé aux coins arrondis) — évite l'effet « bouton rond » des petits muscles plats
  if (square !== 1) {
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      pos.setXYZ(i, Math.sign(x) * Math.pow(Math.abs(x), square), Math.sign(y) * Math.pow(Math.abs(y), square), z);
    }
    g.computeVertexNormals();
  }
  const m = new THREE.Matrix4().compose(
    new THREE.Vector3(...c),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)),
    new THREE.Vector3(...r),
  );
  g.applyMatrix4(m);
  return g;
}

/** Fusionne des géométries (position/normal/uv indexées) en une seule. */
export function merge(geos: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const clean = geos.map((g) => {
    const o = g.index ? g : toIndexed(g);
    for (const name of Object.keys(o.attributes)) {
      if (name !== 'position' && name !== 'normal' && name !== 'uv') o.deleteAttribute(name);
    }
    return o;
  });
  const out = clean.length === 1 ? clean[0] : mergeGeometries(clean, false);
  if (!out) throw new Error('fusion de géométries impossible');
  return out;
}

function toIndexed(g: THREE.BufferGeometry): THREE.BufferGeometry {
  const n = g.attributes.position.count;
  const idx = new Array<number>(n);
  for (let i = 0; i < n; i++) idx[i] = i;
  g.setIndex(idx);
  return g;
}

/** Oriente chaque triangle pour que sa face avant suive la normale des sommets. */
export function fixWinding(geo: THREE.BufferGeometry): THREE.BufferGeometry {
  const pos = geo.attributes.position, nor = geo.attributes.normal, index = geo.index;
  if (!index || !nor) return geo;
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), n = new THREE.Vector3();
  const arr = index.array as Uint16Array | Uint32Array;
  for (let i = 0; i < arr.length; i += 3) {
    const ia = arr[i], ib = arr[i + 1], ic = arr[i + 2];
    a.fromBufferAttribute(pos, ia); b.fromBufferAttribute(pos, ib); c.fromBufferAttribute(pos, ic);
    b.sub(a); c.sub(a); n.crossVectors(b, c);
    const d = n.x * (nor.getX(ia) + nor.getX(ib) + nor.getX(ic))
      + n.y * (nor.getY(ia) + nor.getY(ib) + nor.getY(ic))
      + n.z * (nor.getZ(ia) + nor.getZ(ib) + nor.getZ(ic));
    if (d < 0) { arr[i + 1] = ic; arr[i + 2] = ib; }
  }
  index.needsUpdate = true;
  return geo;
}

export function triangleCount(geo: THREE.BufferGeometry): number {
  return (geo.index ? geo.index.count : geo.attributes.position.count) / 3;
}
