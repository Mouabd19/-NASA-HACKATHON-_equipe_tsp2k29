// SOL ZÉRO — Avatar : décimation (~60 k triangles) + compression meshopt de l'enveloppe produite par build-avatar.py.
//   node build-avatar.mjs /tmp/avatar/avatar-raw.glb ../../public/models/avatar.glb
import fs from 'node:fs';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { weld, simplify, prune, meshopt } from '@gltf-transform/functions';
import { MeshoptSimplifier, MeshoptEncoder } from 'meshoptimizer';
await Promise.all([MeshoptSimplifier.ready, MeshoptEncoder.ready]);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
const [src, out] = process.argv.slice(2);
const doc = await io.read(src);
const root = doc.getRoot();
const count = () => root.listMeshes().reduce((t, m) => t + m.listPrimitives().reduce((a, p) => a + p.getIndices().getCount() / 3, 0), 0);
const t0 = count();
await doc.transform(weld(), simplify({ simplifier: MeshoptSimplifier, ratio: 60000 / t0, error: 0.001 }), prune());
const mat = root.listMaterials()[0] ?? doc.createMaterial();
mat.setName('sol-zero-avatar').setBaseColorFactor([0.62, 0.71, 0.78, 1]).setRoughnessFactor(0.6).setMetallicFactor(0);
for (const m of root.listMeshes()) { m.setName('avatar'); for (const p of m.listPrimitives()) p.setMaterial(mat); }
for (const n of root.listNodes()) if (n.getMesh()) n.setName('avatar').setExtras({ layer: 'shell', organId: null, persona: 'Haddad', note: 'Enveloppe lisse dérivée de Z-Anatomy (muscles + squelette), même repère que les calques' });
await doc.transform(meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
await io.write(out, doc);
console.log(`avatar : ${t0} → ${count()} triangles, ${(fs.statSync(out).size / 1e6).toFixed(2)} Mo`);
