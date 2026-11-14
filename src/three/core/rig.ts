// « Rig » du corps : maillages + matériaux créés UNE fois à partir de PartDef[], puis
// pilotés uniquement par des uniforms (aucune reconstruction quand le jour change).
// Sans React : BodyScene.tsx l'instancie et appelle update() à chaque frame.
import * as THREE from 'three';
import type { Color, LayerId, OrganId } from '../../types';
import { statusColor, tokens } from '../../ui/tokens';
import { buildAnatomy, partLayers } from '../anatomy';
import type { PartDef } from '../anatomy';
import { createHologramMaterial, SCAN_Y_IDLE } from '../HologramMaterial';
import { look } from '../look';

const LAYERS: LayerId[] = ['squelette', 'muscles', 'organes', 'cardio', 'nerveux', 'exposition'];

interface Entry {
  mat: THREE.ShaderMaterial;
  meshes: THREE.Mesh[];
  organId: OrganId | null;
  layer: LayerId | 'shell';
  layers: LayerId[];
  modeled: boolean;
  tintTarget: THREE.Color;
  mixTarget: number;
  tintWeight: number;
  opacityFactor: number;   // organes gris : plus éteints
  opacityFactorTarget: number;
}

export interface RigFrameState {
  layers: Record<LayerId, boolean>;
  /** Organe mis en avant (survol, sinon sélection), ou null. */
  focus: OrganId | null;
  /** Corps projeté (jour > aujourd'hui). */
  ghost: boolean;
}

export interface BodyRig {
  /** Enveloppe + pièces de contexte : jamais interactives. */
  staticGroup: THREE.Group;
  /** Pièces rattachées à un organe : cibles du survol / clic. */
  pickGroup: THREE.Group;
  /** Plan de scan (anneau + disque). */
  scanGroup: THREE.Group;
  /** Statuts du jour → teintes cibles (transition douce dans update). */
  setStatuses(statuses: Map<OrganId, Color>, immediate?: boolean): void;
  /** Lance le balayage pieds → tête. */
  startScan(): void;
  /** Avance l'animation. dt et t en secondes. */
  update(dt: number, t: number, s: RigFrameState): void;
  /** Avancement du balayage (0..1), ou −1 s'il n'y en a pas, et hauteur du plan (m). */
  scan(): { t: number; y: number };
  /** Fondu courant d'un calque (0..1). */
  layerFade(l: LayerId): number;
  /** Organe désigné par une liste d'intersections (la plus proche d'abord). */
  pick(hits: { object: THREE.Object3D }[], layers: Record<LayerId, boolean>): OrganId | null;
  dispose(): void;
}

const damp = (speed: number, dt: number): number => 1 - Math.exp(-speed * dt);

export function createBodyRig(): BodyRig {
  const parts = buildAnatomy();
  const staticGroup = new THREE.Group();
  const pickGroup = new THREE.Group();
  const shared = { time: { value: 0 }, scanY: { value: SCAN_Y_IDLE }, ghost: { value: 0 } };
  const neutral = new THREE.Color(tokens.color.holo);
  const statusColors: Record<Color, THREE.Color> = {
    green: new THREE.Color(statusColor.green),
    amber: new THREE.Color(statusColor.amber),
    red: new THREE.Color(statusColor.red),
    grey: new THREE.Color(statusColor.grey),
  };

  // un matériau par groupe (organe × calque), partagé entre les pièces gauche/droite
  const entries = new Map<string, Entry>();
  const entryFor = (p: PartDef): Entry => {
    const key = `${p.organId ?? 'contexte'}|${p.layer}|${p.fx ?? ''}|${p.tintWeight ?? 1}`;
    let e = entries.get(key);
    if (!e) {
      const mat = createHologramMaterial({ layer: p.layer, fx: p.fx });
      // pièces SUIVIES (porteuses d'un statut) : elles restent lisibles même à l'arrière du corps (mollet, paravertébraux)
      if (p.organId && mat.uniforms.uDepthCue.value > 0) mat.uniforms.uDepthCue.value = Math.max(mat.uniforms.uDepthCue.value, look.depthCueTracked);
      mat.uniforms.uTime = shared.time;
      mat.uniforms.uScanY = shared.scanY;
      mat.uniforms.uGhost = shared.ghost;
      e = {
        mat, meshes: [], organId: p.organId, layer: p.layer, layers: partLayers(p), modeled: p.modeled,
        tintTarget: neutral.clone(), mixTarget: 0, tintWeight: p.tintWeight ?? 1, opacityFactor: 1, opacityFactorTarget: 1,
      };
      entries.set(key, e);
    }
    return e;
  };

  for (const p of parts) {
    const e = entryFor(p);
    const mesh = new THREE.Mesh(p.geometry, e.mat);
    mesh.name = p.key;
    mesh.position.set(...p.position);
    mesh.rotation.set(...p.rotation);
    mesh.scale.set(...p.scale);
    mesh.updateMatrix();
    mesh.matrixAutoUpdate = false;
    mesh.frustumCulled = false;
    mesh.renderOrder = p.layer === 'shell' ? 0 : 1;
    mesh.userData = { organId: p.organId, layers: e.layers, modeled: p.modeled, size: p.geometry.boundingSphere?.radius ?? 1 };
    e.meshes.push(mesh);
    (p.organId ? pickGroup : staticGroup).add(mesh);
  }
  const list = [...entries.values()];

  // plan de scan : anneau + disque très léger
  const scanGroup = new THREE.Group();
  const ringGeo = new THREE.BufferGeometry().setFromPoints(
    Array.from({ length: 129 }, (_, i) => {
      const a = (i / 128) * Math.PI * 2;
      return new THREE.Vector3(Math.cos(a) * look.scan.ringRadius, 0, Math.sin(a) * look.scan.ringRadius);
    }),
  );
  const ringMat = new THREE.LineBasicMaterial({ color: tokens.color.text, transparent: true, opacity: look.scan.ringOpacity, depthTest: false, depthWrite: false });
  const discGeo = new THREE.CircleGeometry(look.scan.ringRadius, 64).rotateX(-Math.PI / 2);
  const discMat = new THREE.MeshBasicMaterial({
    color: tokens.color.holo, transparent: true, opacity: look.scan.discOpacity,
    blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false, side: THREE.DoubleSide,
  });
  scanGroup.add(new THREE.Line(ringGeo, ringMat), new THREE.Mesh(discGeo, discMat));
  scanGroup.visible = false;

  const fade: Record<LayerId, number> = { squelette: 0, muscles: 0, organes: 0, cardio: 0, nerveux: 0, exposition: 0 };
  let fadeInit = false;
  let inner = 0;        // 0 = aucun calque interne, 1 = un seul, 2 = trois ou plus (lissé)
  let scanT = -1; // < 0 : pas de balayage en cours
  const scanInfo = { t: -1, y: 0 };

  const setStatuses = (statuses: Map<OrganId, Color>, immediate = false): void => {
    for (const e of list) {
      if (!e.organId) continue;
      // donnée absente ou pièce non modélisée → gris (jamais vert par défaut)
      const st: Color = e.modeled ? statuses.get(e.organId) ?? 'grey' : 'grey';
      e.tintTarget.copy(statusColors[st]);
      // gris (inconnu) : jamais atténué — une pièce périphérique grise doit rester grise, pas neutre
      e.mixTarget = look.status[st] * (st === 'grey' ? 1 : e.tintWeight);
      e.opacityFactorTarget = st === 'grey' ? look.status.greyOpacity : 1;
      if (immediate) {
        (e.mat.uniforms.uTint.value as THREE.Color).copy(e.tintTarget);
        e.mat.uniforms.uTintMix.value = e.mixTarget;
        e.opacityFactor = e.opacityFactorTarget;
      }
    }
  };

  const update = (dt: number, t: number, s: RigFrameState): void => {
    shared.time.value = t;
    shared.ghost.value += ((s.ghost ? 1 : 0) - shared.ghost.value) * damp(look.ghost.lerpSpeed, dt);

    // balayage
    if (scanT >= 0) {
      scanT += dt / look.scan.duration;
      if (scanT >= 1) {
        scanT = -1;
        scanInfo.t = -1;
        shared.scanY.value = SCAN_Y_IDLE;
        scanGroup.visible = false;
      } else {
        const k = scanT * scanT * (3 - 2 * scanT);
        const y = look.scan.yStart + (look.scan.yEnd - look.scan.yStart) * k;
        shared.scanY.value = y;
        scanInfo.t = k; scanInfo.y = y;
        scanGroup.position.y = y;
        scanGroup.visible = true;
        const edge = Math.min(1, scanT * 8, (1 - scanT) * 8);
        ringMat.opacity = look.scan.ringOpacity * edge;
        discMat.opacity = look.scan.discOpacity * edge;
      }
    }

    // fondu des calques
    const kf = fadeInit ? damp(look.layerFadeSpeed, dt) : 1;
    fadeInit = true;
    let innerTarget = 0;
    for (const l of LAYERS) {
      fade[l] += ((s.layers[l] ? 1 : 0) - fade[l]) * kf;
      if (s.layers[l]) innerTarget += 1;
    }
    innerTarget = innerTarget <= 1 ? innerTarget : Math.min(2, 1 + (innerTarget - 1) / 2);
    inner += (innerTarget - inner) * kf;

    const focusVisible = s.focus !== null && list.some((e) => e.organId === s.focus && e.layers.some((l) => s.layers[l]));
    const kh = damp(look.hover.lerpSpeed, dt);
    const ks = damp(look.status.lerpSpeed, dt);

    for (const e of list) {
      const u = e.mat.uniforms;
      let f = 1;
      let base: number;
      if (e.layer === 'shell') {
        const sh = look.shell;
        const o = inner <= 1
          ? sh.opacityAlone + (sh.opacityOneLayer - sh.opacityAlone) * inner
          : sh.opacityOneLayer + (sh.opacityWithLayers - sh.opacityOneLayer) * (inner - 1);
        base = look.layers.shell.opacity * o;
      } else {
        f = 0;
        for (const l of e.layers) f = Math.max(f, fade[l]);
        base = look.layers[e.layer].opacity * (e.organId ? 1 : look.context[e.layer]);
      }
      const visible = f > 0.004;
      for (const m of e.meshes) m.visible = visible;
      if (!visible) continue;
      e.opacityFactor += (e.opacityFactorTarget - e.opacityFactor) * ks;
      u.uOpacity.value = base * f * e.opacityFactor;
      (u.uTint.value as THREE.Color).lerp(e.tintTarget, ks);
      u.uTintMix.value += (e.mixTarget - u.uTintMix.value) * ks;
      const isFocus = focusVisible && e.organId === s.focus;
      u.uHighlight.value += ((isFocus ? 1 : 0) - u.uHighlight.value) * kh;
      u.uDim.value += ((focusVisible && !isFocus ? 1 : 0) - u.uDim.value) * kh;
    }
  };

  const pick = (hits: { object: THREE.Object3D }[], layers: Record<LayerId, boolean>): OrganId | null => {
    // Le corps est « radiographique » : plusieurs pièces sont sous le pointeur. Priorité :
    // 1) organe porteur de données, le plus PETIT (le plus précis : col du fémur avant cuisse) ;
    // 2) organe « non modélisé » le plus proche ; 3) carte de dose (couvre tout le corps).
    let best: OrganId | null = null;
    let bestSize = Infinity;
    let fallback: OrganId | null = null;
    let dose: OrganId | null = null;
    for (const h of hits) {
      const d = h.object.userData as { organId?: OrganId | null; layers?: LayerId[]; modeled?: boolean; size?: number };
      if (!d.organId || !d.layers || !d.layers.some((l) => layers[l])) continue;
      if (d.organId === 'dose') { dose ??= d.organId; continue; }
      if (d.modeled) {
        const size = d.size ?? 1;
        if (size < bestSize) { bestSize = size; best = d.organId; }
      } else fallback ??= d.organId;
    }
    return best ?? fallback ?? dose;
  };

  return {
    staticGroup, pickGroup, scanGroup, setStatuses, update, pick,
    startScan: () => { scanT = 0; shared.scanY.value = look.scan.yStart; },
    layerFade: (l) => fade[l],
    scan: () => scanInfo,
    dispose: () => {
      for (const e of list) e.mat.dispose();
      ringGeo.dispose(); ringMat.dispose(); discGeo.dispose(); discMat.dispose();
    },
  };
}
