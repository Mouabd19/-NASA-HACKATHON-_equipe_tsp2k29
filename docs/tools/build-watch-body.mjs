// Convertit les modèles 3D de Steve (public/models : avatar + organes, .glb meshopt) en un format
// léger pour l'app Apple Watch : body.json (index des pièces) + body.bin (Float32 positions, Float32 normales,
// UInt32 indices, à la suite pour chaque pièce). Même repère que le web (mètres, y vers le haut, face vers +z).
// Les maillages sont simplifiés (meshoptimizer) pour tenir sur une Apple Watch SE.
//
//   node docs/tools/build-watch-body.mjs <dossier de sortie>
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BufferAttribute, BufferGeometry, Vector3 } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { MeshoptSimplifier } from 'meshoptimizer';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const MODELS = join(ROOT, 'public', 'models');
const OUT = process.argv[2] ?? join(ROOT, 'watch', 'Watch', 'Resources');

// pièce → fichier, maille retenue (organId ou nom du reste du calque), nombre de triangles visé.
// Les organes viennent des fichiers de calques : ils y sont déjà à leur place dans le corps.
const ORGAN = (id, file, tris) => ({ id, file, pick: (o) => o.userData.organId === id, tris });
const PARTS = [
  { id: 'avatar', file: 'avatar.glb', pick: () => true, tris: 9000 },
  { id: 'squelette', file: 'squelette.glb', pick: (o) => o.userData.name === 'squelette:reste', tris: 7000 },
  ORGAN('hanche', 'squelette.glb', 1500), ORGAN('femur', 'squelette.glb', 1500), ORGAN('rachis', 'squelette.glb', 1500),
  ORGAN('cuisse', 'muscles.glb', 2500), ORGAN('mollet', 'muscles.glb', 2000), ORGAN('paravertebraux', 'muscles.glb', 2000),
  ORGAN('coeur', 'organes.glb', 2500), ORGAN('poumons', 'organes.glb', 2500), ORGAN('foie', 'organes.glb', 1500),
  ORGAN('reins', 'organes.glb', 1500), ORGAN('cerveau', 'organes.glb', 2500), ORGAN('yeux', 'nerveux.glb', 1500),
];

const cache = new Map();
const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);
await MeshoptSimplifier.ready;

function load(file) {
  const buf = readFileSync(join(MODELS, file));
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  return new Promise((res, rej) => loader.parse(ab, '', res, rej));
}

/** Toutes les mailles du fichier, en coordonnées monde, fusionnées : positions Float32 + indices Uint32. */
function flatten(gltf, pick) {
  gltf.scene.updateMatrixWorld(true);
  const pos = [], idx = [];
  const v = new Vector3();
  gltf.scene.traverse((o) => {
    if (!o.isMesh || !pick(o)) return;
    const g = o.geometry, p = g.attributes.position, base = pos.length / 3;
    for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld); pos.push(v.x, v.y, v.z); }
    if (g.index) for (let i = 0; i < g.index.count; i++) idx.push(base + g.index.getX(i));
    else for (let i = 0; i < p.count; i++) idx.push(base + i);
  });
  return { pos: new Float32Array(pos), idx: new Uint32Array(idx) };
}

function simplify({ pos, idx }, tris) {
  const target = Math.min(idx.length, tris * 3);
  let [out] = MeshoptSimplifier.simplify(idx, pos, 3, target, 0.05, []);
  // maillages faits de nombreux petits morceaux (paravertébraux, nerfs) : on relâche l'erreur, puis mode « sloppy »
  if (out.length > target * 1.2) [out] = MeshoptSimplifier.simplify(idx, pos, 3, target, 1, []);
  if (out.length > target * 1.2) [out] = MeshoptSimplifier.simplifySloppy(idx, pos, 3, null, target, 1);
  // compacte : ne garde que les sommets utilisés
  const remap = new Map(), np = [];
  const ni = new Uint32Array(out.length);
  for (let i = 0; i < out.length; i++) {
    let k = remap.get(out[i]);
    if (k === undefined) { k = remap.size; remap.set(out[i], k); np.push(pos[out[i] * 3], pos[out[i] * 3 + 1], pos[out[i] * 3 + 2]); }
    ni[i] = k;
  }
  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(new Float32Array(np), 3));
  geo.setIndex(new BufferAttribute(ni, 1));
  geo.computeVertexNormals();
  return { pos: geo.attributes.position.array, nor: geo.attributes.normal.array, idx: ni };
}

mkdirSync(OUT, { recursive: true });
const chunks = [], index = [];
let offset = 0;
for (const part of PARTS) {
  if (!cache.has(part.file)) cache.set(part.file, await load(part.file));
  const flat = flatten(cache.get(part.file), part.pick);
  if (!flat.idx.length) throw new Error(`maille introuvable : ${part.id} dans ${part.file}`);
  const m = simplify(flat, part.tris);
  const vc = m.pos.length / 3;
  const entry = { id: part.id, vertexCount: vc, indexCount: m.idx.length, offset };
  for (const arr of [m.pos, m.nor, m.idx]) { chunks.push(Buffer.from(arr.buffer, arr.byteOffset, arr.byteLength)); offset += arr.byteLength; }
  index.push(entry);
  console.log(part.id.padEnd(15), `${vc} sommets`, `${m.idx.length / 3} triangles`);
}
writeFileSync(join(OUT, 'body.bin'), Buffer.concat(chunks));
writeFileSync(join(OUT, 'body.json'), JSON.stringify({ source: 'public/models (Z-Anatomy, modèles de Steve)', parts: index }, null, 1));
console.log('→', OUT, `${(offset / 1024).toFixed(0)} Ko`);
