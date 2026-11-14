// Champs de distance signée (SDF) + marching cubes : sert à fabriquer des volumes
// organiques lisses (enveloppe du corps, crâne, bassin, organes) sans asset externe.
// Aucune dépendance à React. Tout en scalaires pour éviter les allocations.
import * as THREE from 'three';
import { edgeTable, triTable } from 'three/examples/jsm/objects/MarchingCubes.js';

export type Sdf = (x: number, y: number, z: number) => number;

/** Union lisse (rayon de raccord k, en mètres). */
export function smin(a: number, b: number, k: number): number {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
}

/** Intersection lisse ; smax(a, -b, k) = soustraction lisse de b dans a. */
export function smax(a: number, b: number, k: number): number {
  return -smin(-a, -b, k);
}

/** Ellipsoïde (approximation bornée, suffisante pour le maillage). */
export function ellipsoid(
  x: number, y: number, z: number,
  cx: number, cy: number, cz: number,
  rx: number, ry: number, rz: number,
): number {
  const px = x - cx, py = y - cy, pz = z - cz;
  const ax = px / rx, ay = py / ry, az = pz / rz;
  const k0 = Math.sqrt(ax * ax + ay * ay + az * az);
  if (k0 < 1e-6) return -Math.min(rx, ry, rz);
  const bx = px / (rx * rx), by = py / (ry * ry), bz = pz / (rz * rz);
  const k1 = Math.sqrt(bx * bx + by * by + bz * bz);
  return (k0 * (k0 - 1)) / k1;
}

export function sphere(x: number, y: number, z: number, cx: number, cy: number, cz: number, r: number): number {
  const px = x - cx, py = y - cy, pz = z - cz;
  return Math.sqrt(px * px + py * py + pz * pz) - r;
}

/** Cône arrondi entre a (rayon r1) et b (rayon r2) — formule exacte (I. Quilez). */
export function roundCone(
  x: number, y: number, z: number,
  ax: number, ay: number, az: number,
  bx: number, by: number, bz: number,
  r1: number, r2: number,
): number {
  const bax = bx - ax, bay = by - ay, baz = bz - az;
  const l2 = bax * bax + bay * bay + baz * baz;
  const rr = r1 - r2;
  const a2 = l2 - rr * rr;
  const il2 = 1 / l2;
  const pax = x - ax, pay = y - ay, paz = z - az;
  const yy = pax * bax + pay * bay + paz * baz;
  const zz = yy - l2;
  const qx = pax * l2 - bax * yy, qy = pay * l2 - bay * yy, qz = paz * l2 - baz * yy;
  const x2 = qx * qx + qy * qy + qz * qz;
  const y2 = yy * yy * l2;
  const z2 = zz * zz * l2;
  const k = Math.sign(rr) * rr * rr * x2;
  if (Math.sign(zz) * a2 * z2 > k) return Math.sqrt(x2 + z2) * il2 - r2;
  if (Math.sign(yy) * a2 * y2 < k) return Math.sqrt(x2 + y2) * il2 - r1;
  return (Math.sqrt(x2 * a2 * il2) + yy * rr) * il2 - r1;
}

const CORNER = [
  [0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0],
  [0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1],
];
// Pour chaque arête du cube : coin d'origine (le plus petit) et axe (0=x, 1=y, 2=z).
const EDGE_ORIGIN = [0, 1, 3, 0, 4, 5, 7, 4, 0, 1, 2, 3];
const EDGE_AXIS = [0, 1, 0, 1, 0, 1, 0, 1, 2, 2, 2, 2];

/**
 * Maille la surface sdf = 0 dans la boîte [min, max] avec des cellules de `cell` mètres.
 * Sommets indexés, normales lisses (gradient du champ), uv à zéro (pour pouvoir fusionner).
 */
export function polygonise(
  sdf: Sdf,
  min: [number, number, number],
  max: [number, number, number],
  cell: number,
): THREE.BufferGeometry {
  const nx = Math.ceil((max[0] - min[0]) / cell) + 1;
  const ny = Math.ceil((max[1] - min[1]) / cell) + 1;
  const nz = Math.ceil((max[2] - min[2]) / cell) + 1;
  const vals = new Float32Array(nx * ny * nz);
  let p = 0;
  for (let k = 0; k < nz; k++) {
    const z = min[2] + k * cell;
    for (let j = 0; j < ny; j++) {
      const y = min[1] + j * cell;
      for (let i = 0; i < nx; i++) vals[p++] = sdf(min[0] + i * cell, y, z);
    }
  }

  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];
  const edgeVertex = new Map<number, number>();
  const eps = cell * 0.5;
  const strideY = nx, strideZ = nx * ny;
  const cubeVerts = new Int32Array(12);

  const vertexOnEdge = (i: number, j: number, k: number, axis: number): number => {
    const gi = i + strideY * j + strideZ * k;
    const key = gi * 3 + axis;
    const found = edgeVertex.get(key);
    if (found !== undefined) return found;
    const v0 = vals[gi];
    const v1 = vals[gi + (axis === 0 ? 1 : axis === 1 ? strideY : strideZ)];
    const d = v0 - v1;
    const t = Math.abs(d) < 1e-9 ? 0.5 : v0 / d;
    const x = min[0] + (i + (axis === 0 ? t : 0)) * cell;
    const y = min[1] + (j + (axis === 1 ? t : 0)) * cell;
    const z = min[2] + (k + (axis === 2 ? t : 0)) * cell;
    let gx = sdf(x + eps, y, z) - sdf(x - eps, y, z);
    let gy = sdf(x, y + eps, z) - sdf(x, y - eps, z);
    let gz = sdf(x, y, z + eps) - sdf(x, y, z - eps);
    const gl = Math.hypot(gx, gy, gz) || 1;
    gx /= gl; gy /= gl; gz /= gl;
    const id = positions.length / 3;
    positions.push(x, y, z);
    normals.push(gx, gy, gz);
    edgeVertex.set(key, id);
    return id;
  };

  for (let k = 0; k < nz - 1; k++) {
    for (let j = 0; j < ny - 1; j++) {
      for (let i = 0; i < nx - 1; i++) {
        const g = i + strideY * j + strideZ * k;
        let ci = 0;
        if (vals[g] < 0) ci |= 1;
        if (vals[g + 1] < 0) ci |= 2;
        if (vals[g + 1 + strideY] < 0) ci |= 4;
        if (vals[g + strideY] < 0) ci |= 8;
        if (vals[g + strideZ] < 0) ci |= 16;
        if (vals[g + 1 + strideZ] < 0) ci |= 32;
        if (vals[g + 1 + strideY + strideZ] < 0) ci |= 64;
        if (vals[g + strideY + strideZ] < 0) ci |= 128;
        const bits = edgeTable[ci];
        if (bits === 0) continue;
        for (let e = 0; e < 12; e++) {
          if (bits & (1 << e)) {
            const c = CORNER[EDGE_ORIGIN[e]];
            cubeVerts[e] = vertexOnEdge(i + c[0], j + c[1], k + c[2], EDGE_AXIS[e]);
          }
        }
        const base = ci << 4;
        for (let t = 0; triTable[base + t] !== -1; t += 3) {
          indices.push(cubeVerts[triTable[base + t]], cubeVerts[triTable[base + t + 1]], cubeVerts[triTable[base + t + 2]]);
        }
      }
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array((positions.length / 3) * 2), 2));
  geo.setIndex(indices);
  return geo;
}
