// Chargeur des modèles Z-Anatomy (Steve, D) → la même liste PartDef[] que le corps procédural de Walid.
// Fichiers : public/models/manifest.json + <calque>.glb + avatar.glb (meshopt, aucun décodeur réseau).
// Repère identique au corps procédural : mètres, pieds y ≈ 0, regard +Z, gauche de l'astronaute en +X.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import type { LayerId, ModelManifest, OrganId } from '../types';
import type { PartDef } from './anatomy';

export interface ZAnatomyManifest extends ModelManifest { avatar?: string }

// Organes présents dans plusieurs fichiers : on ne garde qu'une pièce, visible dans plusieurs calques.
const SKIP: Record<string, OrganId[]> = { cardio: ['coeur'], nerveux: ['cerveau'] };
const ALSO: Partial<Record<OrganId, LayerId[]>> = { coeur: ['cardio'], cerveau: ['nerveux'] };
// Nœuds hors contrat → organe du contrat (le réseau vasculaire porte le statut « sang »).
const ALIAS: Record<string, OrganId> = { arteres: 'sang', veines: 'sang', aorte: 'sang' };
// Comme le corps procédural : organes sans modèle de perte → gris « non modélisé ».
const NOT_MODELED = new Set<OrganId>(['poumons', 'foie', 'cerveau']);

// Les .glb sont quantifiés (meshopt : positions en entiers normalisés). On repasse en flottants AVANT
// d'appliquer la transformation, sinon toute coordonnée hors de [-1, 1] serait écrêtée (corps « étiré »).
function toFloat(a: THREE.BufferAttribute | THREE.InterleavedBufferAttribute): THREE.BufferAttribute {
  const out = new Float32Array(a.count * a.itemSize);
  for (let i = 0; i < a.count; i++) for (let k = 0; k < a.itemSize; k++) out[i * a.itemSize + k] = a.getComponent(i, k);
  return new THREE.BufferAttribute(out, a.itemSize);
}

function prepare(mesh: THREE.Mesh): THREE.BufferGeometry {
  mesh.updateWorldMatrix(true, false);
  const src = mesh.geometry as THREE.BufferGeometry;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', toFloat(src.getAttribute('position')));
  const n = src.getAttribute('normal');
  if (n) g.setAttribute('normal', toFloat(n));
  if (src.index) g.setIndex(src.index.clone());
  g.applyMatrix4(mesh.matrixWorld);
  if (!n) g.computeVertexNormals();
  else {
    const na = g.getAttribute('normal') as THREE.BufferAttribute;
    for (let i = 0; i < na.count; i++) { const v = new THREE.Vector3().fromBufferAttribute(na, i).normalize(); na.setXYZ(i, v.x, v.y, v.z); }
  }
  g.computeBoundingSphere();
  g.computeBoundingBox();
  return g;
}

function part(key: string, organId: OrganId | null, layer: PartDef['layer'], geometry: THREE.BufferGeometry, extra: Partial<PartDef> = {}): PartDef {
  return { key, organId, layer, geometry, position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1], modeled: !(organId && NOT_MODELED.has(organId)), ...extra };
}

/** Charge le manifeste et tous les calques. Rejette si un fichier manque (l'appelant garde alors le corps procédural). */
export async function loadZAnatomy(base = `${import.meta.env.BASE_URL}models/`): Promise<{ parts: PartDef[]; manifest: ZAnatomyManifest }> {
  const res = await fetch(`${base}manifest.json`);
  if (!res.ok) throw new Error(`manifest.json introuvable (${res.status})`);
  const manifest = (await res.json()) as ZAnatomyManifest;
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const load = (file: string) => loader.loadAsync(`${base}${file}`);

  const parts: PartDef[] = [];
  const avatarFile = manifest.avatar ?? manifest.layers.find((l) => l.id === 'exposition')?.file;
  const layerFiles = manifest.layers.filter((l) => l.file && l.file !== avatarFile);
  const [avatar, ...layers] = await Promise.all([avatarFile ? load(avatarFile) : Promise.resolve(null), ...layerFiles.map((l) => load(l.file))]);

  layers.forEach((gltf, i) => {
    const layer = layerFiles[i].id;
    let n = 0;
    gltf.scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const raw = (mesh.userData?.organId as string | undefined) ?? null;
      const organId: OrganId | null = raw ? (ALIAS[raw] ?? raw) : null;
      if (organId && SKIP[layer]?.includes(organId)) return;
      parts.push(part(`${layer}-${raw ?? 'reste'}-${n++}`, organId, layer, prepare(mesh), organId && ALSO[organId] ? { alsoLayers: ALSO[organId] } : {}));
    });
  });

  if (avatar) {
    let shell: THREE.BufferGeometry | null = null;
    avatar.scene.traverse((o) => { if (!shell && (o as THREE.Mesh).isMesh) shell = prepare(o as THREE.Mesh); });
    if (shell) {
      parts.unshift(part('enveloppe', null, 'shell', shell));
      parts.push(part('dose-carte', 'dose', 'exposition', shell, { fx: 'heat' }));
    }
  }
  if (!parts.some((p) => p.layer === 'shell')) throw new Error('avatar manquant');
  return { parts, manifest };
}
