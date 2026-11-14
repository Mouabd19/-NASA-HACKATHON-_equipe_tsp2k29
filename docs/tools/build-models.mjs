// SOL ZÉRO — construit public/models/ à partir des .glb Z-Anatomy (via nqwrc/3d-anatomy).
// Propriétaire : Steve (D). Usage :
//   git clone --depth 1 https://github.com/nqwrc/3d-anatomy.git /tmp/3d-anatomy
//   cd docs/tools && npm i @gltf-transform/core @gltf-transform/extensions @gltf-transform/functions draco3dgltf meshoptimizer
//   node build-models.mjs /tmp/3d-anatomy/public/models ../../public/models
//
// Sorties :
//   public/models/<calque>.glb         un fichier par calque, décimé, compressé meshopt (pas de Draco : son décodeur vient d'un CDN)
//   public/models/organs/<organId>.glb organe isolé, centré à l'origine (fenêtre organe)
//   public/models/manifest.json        format ModelManifest (ROADMAP §6)
// Conventions pour three.js : chaque nœud d'organe suivi porte userData.organId (+ za_name, layer).
// Le reste d'un calque est fusionné dans un seul mesh « <calque>:reste » (moins de draw calls).

import fs from 'node:fs';
import path from 'node:path';
import { NodeIO, Document, getBounds } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { flatten, mergeDocuments, unpartition, dedup, prune, weld, simplify, meshopt, center, transformPrimitive, joinPrimitives } from '@gltf-transform/functions';
import draco3d from 'draco3dgltf';
import { MeshoptSimplifier, MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';

const [SRC, OUT] = process.argv.slice(2);
if (!SRC || !OUT) { console.error('usage: node build-models.mjs <src models dir> <out dir>'); process.exit(1); }
await Promise.all([MeshoptSimplifier.ready, MeshoptEncoder.ready, MeshoptDecoder.ready]);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'draco3d.decoder': await draco3d.createDecoderModule(),
  'meshopt.encoder': MeshoptEncoder,
  'meshopt.decoder': MeshoptDecoder,
});

// --- Organes suivis : organId → (système source, motif sur le nom Z-Anatomy) -------------------
const ORGANS = [
  { id: 'hanche', sys: 'skeletal', re: /^Hip bone\.[lr]$/ },
  { id: 'femur', sys: 'skeletal', re: /^Femur\.[lr]$/ },
  { id: 'rachis', sys: 'skeletal', re: /^(Vertebra [CTL]\d+|Atlas \(C1\)|Axis \(C2\)|Sacrum|Coccyx)$/ },
  { id: 'cuisse', sys: 'muscular', re: /^(Rectus femoris|Vastus (lateralis|medialis|intermedius)|(Long|Short) head of biceps femoris|Biceps femoris|Semitendinosus|Semimembranosus|Adductor (longus|brevis|magnus)|Gracilis|Sartorius)( muscle)?\.[lr]$/i },
  { id: 'mollet', sys: 'muscular', re: /^((Lateral|Medial) head of gastrocnemius|Soleus)( muscle)?\.[lr]$/i },
  { id: 'paravertebraux', sys: 'muscular', re: /^(Iliocostalis|Longissimus|Spinalis|Multifidus|Erector spinae)/i },
  { id: 'coeur', sys: 'cardiovascular', re: /^((Left|Right) (atrium|ventricle)|.*papillary muscle.*|.*leaflet.*|.*interventricular artery.*|Circumflex artery of heart|.*vein of left ventricle.*)$/ },
  { id: 'poumons', sys: 'visceral', re: /^((Superior|Inferior) lobe of (left|right) lung|Middle lobe of right lung)$/ },
  { id: 'foie', sys: 'visceral', re: /^Liver$/ },
  { id: 'reins', sys: 'visceral', re: /^(Kidney|Renal pelvis)\.[lr]$/ },
  { id: 'cerveau', sys: 'nervous', re: /(gyrus|gyri|cerebell|Midbrain|Pons|Medulla|Insula|Cingulate|Cuneus|lobule|Thalamus|Hippocamp|Corpus callosum|Precuneus|pole)/i, not: /spinal|optic|eyeball|nerve|Falx|Tentorium|conus|filum|cauda|terminal|tract/i },
  { id: 'yeux', sys: 'nervous', re: /^((Anterior|Posterior) segment of eyeball|Retina|Optic nerve \(II\)|Lens)\.[lr]$/ },
  { id: 'aorte', sys: 'cardiovascular', re: /^(Ascending|Thoracic|Abdominal) aorta$|^Arch of aorta$/ },
];

// --- Calques : sources, filtres et décimation -------------------------------------------------
// ratio = fraction de triangles gardée ; on vise ~150–250 k triangles par calque.
const LAYERS = [
  { id: 'squelette', parts: [{ sys: 'skeletal' }], ratio: 0.22, organs: ['hanche', 'femur', 'rachis'] },
  { id: 'muscles', parts: [{ sys: 'muscular', drop: /fascia|bursa|retinaculum|aponeurosis|sheath|tendon|ligament|septum/i }], ratio: 0.09, organs: ['cuisse', 'mollet', 'paravertebraux'] },
  {
    id: 'organes',
    parts: [
      { sys: 'visceral', drop: /bronch|duct|taenia|omentum|mesocolon|Meso-|Pleura|penis|Testis|Epididym|Seminal|Ejaculatory|Prostate|Urethra|gland|Gingiva|Tongue|palate|Uvula|pharynx|Mucosa|Epiglottis|hypophysis|segment of liver/i },
      { sys: 'cardiovascular', only: ['coeur'] },
      { sys: 'nervous', only: ['cerveau'] },
    ],
    ratio: 0.25, organs: ['coeur', 'poumons', 'foie', 'reins', 'cerveau'],
  },
  { id: 'cardio', parts: [{ sys: 'cardiovascular' }], ratio: 0.045, organs: ['coeur', 'aorte'] },
  { id: 'nerveux', parts: [{ sys: 'nervous', drop: /Falx|Tentorium|ventricle|Aqueduct|cochlea|vestib|canal|duct|sac/i }], ratio: 0.07, organs: ['cerveau', 'yeux'] },
];

const organOf = (sys, za) => ORGANS.find((o) => o.sys === sys && o.re.test(za) && !(o.not && o.not.test(za)))?.id ?? null;
const za = (n) => n.getExtras()?.za_name ?? n.getName();
const sysOf = (n) => n.getExtras()?.za_system;

async function loadSystem(sys) {
  const doc = await io.read(path.join(SRC, `${sys}.glb`));
  await doc.transform(flatten());
  return doc;
}

// Garde dans `doc` les nœuds-mesh pour lesquels keep(node) est vrai ; jette le reste.
function filterNodes(doc, keep) {
  for (const n of doc.getRoot().listNodes()) {
    if (n.getMesh() && keep(n)) continue;
    if (n.getMesh()) n.setMesh(null);
  }
  for (const n of doc.getRoot().listNodes()) if (!n.getMesh()) n.dispose();
}

// Fusionne plusieurs documents en un seul, une seule scène, un seul buffer.
async function mergeInto(target, src) {
  const map = mergeDocuments(target, src);
  const root = target.getRoot();
  const [main, ...others] = root.listScenes();
  for (const s of others) { for (const c of s.listChildren()) main.addChild(c); s.dispose(); }
  root.setDefaultScene(main);
  return map;
}

function tag(doc, layer) {
  const root = doc.getRoot();
  const mat = root.listMaterials()[0] ?? doc.createMaterial();
  mat.setName(`sol-zero-${layer}`).setBaseColorFactor([0.62, 0.71, 0.78, 1]).setRoughnessFactor(0.6).setMetallicFactor(0);
  for (const m of root.listMaterials()) if (m !== mat) m.dispose();
  for (const mesh of root.listMeshes()) for (const p of mesh.listPrimitives()) { p.setMaterial(mat); for (const s of p.listSemantics()) if (s !== 'POSITION' && s !== 'NORMAL') p.setAttribute(s, null); }
  for (const n of root.listNodes()) {
    if (!n.getMesh()) continue;
    const name = za(n), sys = sysOf(n), organId = organOf(sys, name);
    n.setExtras(organId ? { za_name: name, organId, layer } : { za_name: name, layer });
    n.setName(organId ? `${organId}:${name}` : '');
  }
}

// Les sources sont en Draco : on retire l'extension pour ne sortir que du meshopt.
const dropDraco = (doc) => { for (const e of doc.getRoot().listExtensionsUsed()) if (e.extensionName === 'KHR_draco_mesh_compression') e.dispose(); };

// Cuisson : un mesh par organe suivi + un mesh « reste », transformations appliquées (miroirs compris).
// Résultat : ~2 à 6 nœuds par calque au lieu de ~500 → peu de draw calls.
function bake(doc, layer) {
  const root = doc.getRoot(), scene = root.listScenes()[0];
  const groups = new Map();
  for (const n of root.listNodes()) {
    if (!n.getMesh()) continue;
    const key = n.getExtras()?.organId ?? 'reste';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(n);
  }
  for (const [key, nodes] of groups) {
    const prims = [];
    for (const n of nodes) for (const p of n.getMesh().listPrimitives()) {
      const c = p.clone();
      for (const s of ['POSITION', 'NORMAL']) { const a = c.getAttribute(s); if (a) c.setAttribute(s, a.clone()); }
      const idx = c.getIndices();
      if (idx) { const arr = new Uint32Array(idx.getArray()); c.setIndices(idx.clone().setArray(arr)); }
      transformPrimitive(c, n.getWorldMatrix());
      prims.push(c);
    }
    const joined = prims.length > 1 ? joinPrimitives(prims) : prims[0];
    const mesh = doc.createMesh(`${layer}:${key}`).addPrimitive(joined);
    const extras = key === 'reste' ? { layer } : { organId: key, layer, za_names: nodes.map(za).slice(0, 60) };
    scene.addChild(doc.createNode(key === 'reste' ? `${layer}:reste` : key).setMesh(mesh).setExtras(extras));
    for (const p of prims) if (p !== joined) p.dispose();
    for (const n of nodes) n.dispose();
  }
}

const tris = (doc) => doc.getRoot().listMeshes().reduce((t, m) => t + m.listPrimitives().reduce((a, p) => a + (p.getIndices()?.getCount() ?? p.getAttribute('POSITION').getCount()) / 3, 0), 0);

const POSTERIOR = new Set(['rachis', 'paravertebraux']);
// Ancre du warning : centre des nœuds de l'organe (côté gauche si l'organe est pair), posé devant le corps (+z = avant).
function anchorOf(nodes, id) {
  const left = nodes.filter((n) => /\.l$|left/i.test(za(n)));
  const use = left.length ? left : nodes;
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (const n of use) { const b = getBounds(n); for (let i = 0; i < 3; i++) { lo[i] = Math.min(lo[i], b.min[i]); hi[i] = Math.max(hi[i], b.max[i]); } }
  const c = lo.map((v, i) => (v + hi[i]) / 2);
  if (id === 'femur') c[1] = hi[1] - 0.12 * (hi[1] - lo[1]); // col du fémur, pas le milieu de la diaphyse
  // Structures postérieures (dos) : ancre derrière le corps ; les autres devant.
  c[2] = POSTERIOR.has(id) ? lo[2] - 0.03 : hi[2] + 0.03;
  return c.map((v) => +v.toFixed(3));
}

fs.mkdirSync(path.join(OUT, 'organs'), { recursive: true });
const manifest = { layers: [], organs: [], credits: '' };
const anchors = {};
const report = [];

for (const L of LAYERS) {
  const out = new Document();
  for (const part of L.parts) {
    const src = await loadSystem(part.sys);
    filterNodes(src, (n) => {
      const name = za(n), org = organOf(part.sys, name);
      if (part.only) return part.only.includes(org);
      if (org) return true;
      return !(part.drop && part.drop.test(name));
    });
    await mergeInto(out, src);
  }
  await out.transform(unpartition());
  tag(out, L.id);
  // Ancres calculées avant décimation, en coordonnées monde.
  for (const o of L.organs) {
    if (anchors[o]) continue;
    const nodes = out.getRoot().listNodes().filter((n) => n.getExtras()?.organId === o);
    if (nodes.length) anchors[o] = anchorOf(nodes, o);
  }
  const before = tris(out);
  await out.transform(
    dedup(), prune(), weld(),
    simplify({ simplifier: MeshoptSimplifier, ratio: L.ratio, error: 0.01 }),
  );
  bake(out, L.id);
  await out.transform(prune());
  const after = tris(out);
  await out.transform(meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
  const file = `${L.id}.glb`;
  dropDraco(out);
  await io.write(path.join(OUT, file), out);
  const size = fs.statSync(path.join(OUT, file)).size;
  const present = [...new Set(out.getRoot().listNodes().map((n) => n.getExtras()?.organId).filter(Boolean))];
  manifest.layers.push({ id: L.id, file, organs: present });
  report.push({ layer: L.id, trisBefore: Math.round(before), trisAfter: Math.round(after), nodes: out.getRoot().listNodes().length, mo: +(size / 1e6).toFixed(2), organs: present.join(',') });
}

// --- Organes isolés (fenêtre organe), centrés à l'origine --------------------------------------
const ISOLATED = { coeur: 60000, poumons: 60000, foie: 40000, reins: 30000, cerveau: 40000, yeux: 30000, hanche: 50000, femur: 40000, rachis: 60000, cuisse: 30000, mollet: 40000, paravertebraux: 25000 };
for (const [id, budget] of Object.entries(ISOLATED)) {
  const o = ORGANS.find((x) => x.id === id);
  const doc = await loadSystem(o.sys);
  filterNodes(doc, (n) => organOf(o.sys, za(n)) === id);
  await doc.transform(unpartition(), prune());
  tag(doc, 'isole');
  const t0 = tris(doc);
  await doc.transform(dedup(), prune(), weld(), center({ pivot: 'center' }));
  if (t0 > budget) await doc.transform(simplify({ simplifier: MeshoptSimplifier, ratio: budget / t0, error: 0.001 }));
  bake(doc, 'isole');
  await doc.transform(prune(), center({ pivot: 'center' }), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
  const file = `organs/${id}.glb`;
  dropDraco(doc);
  await io.write(path.join(OUT, file), doc);
  report.push({ layer: `organe ${id}`, trisBefore: Math.round(t0), trisAfter: Math.round(tris(doc)), nodes: doc.getRoot().listNodes().length, mo: +(fs.statSync(path.join(OUT, file)).size / 1e6).toFixed(2) });
}

// 'sang' : pas de mesh propre ; ancré sur l'aorte (calque cardio).
for (const o of [...Object.keys(ISOLATED), 'aorte']) manifest.organs.push({ id: o, file: o in ISOLATED ? `organs/${o}.glb` : undefined, anchor: anchors[o] });
manifest.organs.push({ id: 'sang', anchor: anchors.aorte });
manifest.credits = 'Z-Anatomy - The open source atlas of anatomy - CC-BY-SA 4.0 · BodyParts3D - The Database Center for Life Science - CC-BY-SA 2.1 Japan · Kidney - by lissiecowley - CC-BY-NC 4.0 · Anatomy of the Inner Ear / Cranial Nerves and Foramina - University of Dundee · export glTF : nqwrc/3d-anatomy · ensemble distribué sous CC BY-NC-SA 4.0';
fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.table(report);
