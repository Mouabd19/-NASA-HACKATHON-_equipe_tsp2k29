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
/** Ordre de dessin des pièces suivies, du plus enveloppant au plus interne : un os en alerte reste lisible sous un muscle. */
const LAYER_RANK: Record<LayerId, number> = { exposition: 0, muscles: 0.1, organes: 0.2, cardio: 0.3, nerveux: 0.4, squelette: 0.5 };

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
  /** Statut ambre ou rouge : opacité constante quel que soit le nombre de calques, dessinée après le reste. */
  alert: boolean;
  alertWeight: number;     // 0..1, lissé
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
  scan(): { t: number; y: number; view: number };
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
      // Mélange alpha classique (et non additif) : les superpositions convergent vers la teinte du corps
      // au lieu de saturer en blanc, et une teinte de statut reste mate. Le matériau partagé reste additif par défaut.
      mat.blending = THREE.NormalBlending;
      // pièces SUIVIES (porteuses d'un statut) : elles restent lisibles même à l'arrière du corps (mollet, paravertébraux)
      if (p.organId && mat.uniforms.uDepthCue.value > 0) mat.uniforms.uDepthCue.value = Math.max(mat.uniforms.uDepthCue.value, look.depthCueTracked);
      mat.uniforms.uTime = shared.time;
      mat.uniforms.uScanY = shared.scanY;
      mat.uniforms.uGhost = shared.ghost;
      e = {
        mat, meshes: [], organId: p.organId, layer: p.layer, layers: partLayers(p), modeled: p.modeled,
        tintTarget: neutral.clone(), mixTarget: 0, tintWeight: p.tintWeight ?? 1, opacityFactor: 1, opacityFactorTarget: 1,
        alert: false, alertWeight: 0,
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
    // enveloppe d'abord, puis le contexte, puis les pièces suivies, puis celles en alerte (voir setStatuses)
    mesh.renderOrder = p.layer === 'shell' ? 0 : p.organId ? 2 + LAYER_RANK[p.layer] : 1;
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

  // Scanner façon Midjourney Medical : la personne, debout sur une plateforme lumineuse, descend dans un bassin
  // d'eau tiède à travers un anneau de capteurs à ultrasons fixé à la surface. La caméra suit le corps : on voit
  // donc la surface de l'eau, l'anneau et le bord du bassin MONTER le long du corps, puis redescendre.
  // Vue en coupe : le bord du bassin n'est dessiné qu'à l'arrière, pour voir le corps sous l'eau.
  const S = look.scan;
  const PR = S.poolRadius;
  const fades: { mat: THREE.Material & { opacity: number }; o: number }[] = [];
  const track = <M extends THREE.Material & { opacity: number }>(mat: M, o: number): M => { mat.opacity = o; fades.push({ mat, o }); return mat; };
  const geos: THREE.BufferGeometry[] = [];
  const keep = <G extends THREE.BufferGeometry>(g: G): G => { geos.push(g); return g; };
  const water = new THREE.Color(tokens.color.water);
  const poolTime = { value: 0 };
  const fresnelShader = (base: number, gain: number, color: THREE.Color): THREE.ShaderMaterial => new THREE.ShaderMaterial({
    uniforms: { uColor: { value: color }, opacity: { value: 1 } },
    vertexShader: /* glsl */ `
      varying vec3 vN; varying vec3 vP;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vP = wp.xyz; vN = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor; uniform float opacity;
      varying vec3 vN; varying vec3 vP;
      void main() {
        vec3 V = normalize(cameraPosition - vP);
        float f = pow(1.0 - abs(dot(normalize(vN), V)), 2.5);
        gl_FragColor = vec4(uColor * (0.85 + 0.5 * f), (${base.toFixed(3)} + ${gain.toFixed(3)} * f) * opacity);
      }`,
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
  });

  // ── éléments qui suivent la surface (enfants de scanGroup, qui monte avec le niveau d'eau) ──
  const surface = new THREE.Group();
  // surface de l'eau : ondes concentriques lentes, bord plus lumineux
  const surfGeo = keep(new THREE.CircleGeometry(PR, 96).rotateX(-Math.PI / 2));
  const surfMat = track(new THREE.ShaderMaterial({
    uniforms: { uColor: { value: water }, uTime: poolTime, opacity: { value: 1 }, uR: { value: PR } },
    vertexShader: /* glsl */ `varying vec2 vXZ; void main() { vXZ = position.xz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor; uniform float uTime; uniform float opacity; uniform float uR;
      varying vec2 vXZ;
      void main() {
        float r = length(vXZ) / uR;
        float ripple = 0.5 + 0.5 * sin(r * 38.0 - uTime * 3.0);
        float edge = smoothstep(0.82, 1.0, r);
        float a = 0.05 + 0.05 * ripple * (1.0 - r) + 0.25 * edge;
        gl_FragColor = vec4(uColor * (1.0 + 0.4 * edge), a * opacity);
      }`,
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
  }), 1);
  const surf = new THREE.Mesh(surfGeo, surfMat); surf.renderOrder = -1; surface.add(surf);

  // anneau de capteurs : couronne sombre + rangée de puces lumineuses
  const ringBodyGeo = keep(new THREE.TorusGeometry(PR - 0.035, 0.03, 16, 160).rotateX(Math.PI / 2));
  const ringBody = new THREE.Mesh(ringBodyGeo, track(new THREE.MeshBasicMaterial({ color: tokens.color.panelHover, transparent: true, depthWrite: false }), 0.9));
  ringBody.renderOrder = -1;   // derrière le corps : l'anneau ne coupe pas les jambes surface.add(ringBody);
  const chipPts: THREE.Vector3[] = [];
  const CHIPS = 40;                                            // 40 modules Butterfly
  for (let i = 0; i < CHIPS; i++) {
    const a0 = (i / CHIPS) * Math.PI * 2, a1 = a0 + (Math.PI * 2 / CHIPS) * 0.62;
    const r = PR - 0.064;
    for (let k = 0; k < 4; k++) {
      const b0 = a0 + ((a1 - a0) * k) / 4, b1 = a0 + ((a1 - a0) * (k + 1)) / 4;
      chipPts.push(new THREE.Vector3(Math.cos(b0) * r, 0, Math.sin(b0) * r), new THREE.Vector3(Math.cos(b1) * r, 0, Math.sin(b1) * r));
    }
  }
  const chipGeo = keep(new THREE.BufferGeometry().setFromPoints(chipPts));
  const chips = new THREE.LineSegments(chipGeo, track(new THREE.LineBasicMaterial({ color: tokens.color.text, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }), 0.95));
  chips.renderOrder = 13; surface.add(chips);
  // halo de la bande de scan juste sous l'anneau
  const glowGeo = keep(new THREE.TorusGeometry(PR - 0.07, 0.006, 8, 160).rotateX(Math.PI / 2).translate(0, -0.03, 0));
  const glow = new THREE.Mesh(glowGeo, track(new THREE.MeshBasicMaterial({ color: tokens.color.water, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }), 0.9));
  glow.renderOrder = 13; surface.add(glow);

  // bord du bassin (plage) : couronne à l'arrière seulement (vue en coupe), fondue vers l'extérieur
  const deckGeo = keep(new THREE.RingGeometry(PR + 0.005, S.deckRadius, 128, 1, Math.PI * 0.08, Math.PI * 0.84).rotateX(-Math.PI / 2));
  const deckMat = track(new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(tokens.color.panelHover) }, uEdge: { value: new THREE.Color(tokens.color.textDim) }, opacity: { value: 1 }, uR0: { value: PR }, uR1: { value: S.deckRadius } },
    vertexShader: /* glsl */ `varying vec2 vXZ; void main() { vXZ = position.xz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor; uniform vec3 uEdge; uniform float opacity; uniform float uR0; uniform float uR1;
      varying vec2 vXZ;
      void main() {
        float r = (length(vXZ) - uR0) / (uR1 - uR0);
        float lip = 1.0 - smoothstep(0.0, 0.06, r);              // arête du bassin éclairée
        vec3 c = mix(uColor, uEdge, lip * 0.6);
        float a = (0.9 - 0.9 * smoothstep(0.35, 1.0, r));
        gl_FragColor = vec4(c, a * opacity);
      }`,
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
  }), 1);
  const deck = new THREE.Mesh(deckGeo, deckMat); deck.renderOrder = -1; surface.add(deck);
  scanGroup.add(surface);

  // ── éléments fixes au sol (recalés à chaque image : scanGroup monte) ──
  const floorSet = new THREE.Group();
  // colonne d'eau : du fond jusqu'à la surface (mise à l'échelle en hauteur), reflets de bord
  const colGeo = keep(new THREE.CylinderGeometry(PR, PR, 1, 96, 1, true).translate(0, 0.5, 0));
  const col = new THREE.Mesh(colGeo, track(fresnelShader(0.06, 0.28, water), 1));
  col.renderOrder = -1;   // l'eau teinte le fond, pas le corps floorSet.add(col);
  // plateforme lumineuse sous les pieds
  const platGeo = keep(new THREE.CylinderGeometry(0.3, 0.32, 0.02, 96).translate(0, -0.01, 0));
  const plat = new THREE.Mesh(platGeo, track(new THREE.MeshBasicMaterial({ color: tokens.color.panelHover, transparent: true, depthWrite: false }), 0.95));
  plat.renderOrder = -2; floorSet.add(plat);
  const platLedGeo = keep(new THREE.TorusGeometry(0.3, 0.006, 8, 128).rotateX(Math.PI / 2).translate(0, 0.002, 0));
  const platLed = new THREE.Mesh(platLedGeo, track(new THREE.MeshBasicMaterial({ color: tokens.color.water, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }), 0.9));
  platLed.renderOrder = -1; floorSet.add(platLed);
  // caisson métallique autour du corps : cylindre brossé ouvert sur l'avant (coupe), cerclages haut et bas.
  // Ombrage « cuit » dans les sommets : reflets verticaux de métal brossé, bords de l'ouverture éclairés.
  const CH = S.casingHeight, CR = PR + 0.05, OPEN = S.casingOpening;
  const metalDark = new THREE.Color(tokens.color.panelHover), metalLight = new THREE.Color(tokens.color.textDim);
  const metalShade = (g: THREE.BufferGeometry): void => {
    const pos = g.getAttribute('position');
    const colr = new Float32Array(pos.count * 3);
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      const a = Math.atan2(x, z);                                   // 0 = face caméra
      const sheen = 0.5 + 0.5 * Math.cos(a * 3.0 + 0.6);            // bandes de reflet du métal brossé
      const edge = 1 - THREE.MathUtils.smoothstep(Math.abs(Math.abs(a) - OPEN / 2), 0, 0.35);
      const ao = THREE.MathUtils.smoothstep(y, 0, 0.35);
      c.copy(metalDark).multiplyScalar(0.6 + 0.3 * ao).lerp(metalLight, 0.18 * sheen + 0.5 * edge);
      colr[i * 3] = c.r; colr[i * 3 + 1] = c.g; colr[i * 3 + 2] = c.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(colr, 3));
  };
  const metal = (o: number): THREE.MeshBasicMaterial =>
    track(new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, side: THREE.DoubleSide, depthWrite: false }), o);
  const shellGeo = keep(new THREE.CylinderGeometry(CR, CR, CH, 160, 16, true, OPEN / 2, Math.PI * 2 - OPEN).translate(0, CH / 2, 0));
  metalShade(shellGeo);
  const shell = new THREE.Mesh(shellGeo, metal(0.97)); shell.renderOrder = -1; floorSet.add(shell);
  for (const [y, h] of [[0.025, 0.05], [CH - 0.03, 0.06]] as const) {          // cerclages bas et haut
    const bandGeo = keep(new THREE.CylinderGeometry(CR + 0.025, CR + 0.025, h, 160, 1, true).translate(0, y, 0));
    metalShade(bandGeo);
    const band = new THREE.Mesh(bandGeo, metal(1)); band.renderOrder = -1; floorSet.add(band);
  }
  const lipGeo = keep(new THREE.TorusGeometry(CR + 0.025, 0.004, 6, 160).rotateX(Math.PI / 2).translate(0, CH, 0));
  const lip = new THREE.Mesh(lipGeo, track(new THREE.MeshBasicMaterial({ color: tokens.color.text, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }), 0.5));
  lip.renderOrder = 15; floorSet.add(lip);
  // arêtes verticales de l'ouverture
  const edgeGeo = keep(new THREE.BoxGeometry(0.03, CH, 0.03).translate(0, CH / 2, 0));
  metalShade(edgeGeo);
  for (const a of [-OPEN / 2, OPEN / 2]) {
    const post = new THREE.Mesh(edgeGeo, metal(1));
    post.position.set(Math.sin(a) * CR, 0, Math.cos(a) * CR);
    post.rotation.y = a;
    post.renderOrder = -1; floorSet.add(post);
  }
  // l'ouverture du caisson et le bord du bassin font face à la caméra de trois quarts du scan
  floorSet.rotation.y = S.viewYaw;
  deck.rotation.y = S.viewYaw;
  scanGroup.add(floorSet);

  const setBoothFade = (k: number): void => {
    for (const f of fades) {
      if (f.mat instanceof THREE.ShaderMaterial) f.mat.uniforms.opacity.value = f.o * k;
      else f.mat.opacity = f.o * k;
    }
  };
  /**
   * Place la surface à la hauteur `level` (m). Le fond, la plateforme et le caisson restent au sol, sauf à la sortie :
   * `back` (m) recule tout l'appareil d'un bloc : le corps sort du caisson par l'ouverture, vers la caméra.
   */
  const setLevel = (level: number, back = 0): void => {
    scanGroup.position.y = level;
    scanGroup.position.z = -back;
    floorSet.position.y = S.yStart - level;
    col.scale.y = Math.max(0.001, level - S.yStart);
  };

  scanGroup.visible = false;
  let scanT = -1;  // ≥ 0 : immersion en cours (0..1)
  let holdT = 0;   // > 0 : sur la plateforme, avant l'immersion
  let exitT = 0;   // > 0 : scan fini, l'appareil part vers le haut et disparaît
  const scanInfo = { t: -1, y: 0, view: 0 };   // view : 1 = vue de trois quarts du scan, 0 = vue de face normale

  const fade: Record<LayerId, number> = { squelette: 0, muscles: 0, organes: 0, cardio: 0, nerveux: 0, exposition: 0 };
  let fadeInit = false;
  let inner = 0;        // 0 = aucun calque interne, 1 = un seul, 2 = trois ou plus (lissé)
  let crowd = 1;        // atténuation des pièces sans alerte quand beaucoup de calques sont actifs (lissé)

  const setStatuses = (statuses: Map<OrganId, Color>, immediate = false): void => {
    for (const e of list) {
      if (!e.organId) continue;
      // donnée absente ou pièce non modélisée → gris (jamais vert par défaut)
      const st: Color = e.modeled ? statuses.get(e.organId) ?? 'grey' : 'grey';
      e.tintTarget.copy(statusColors[st]);
      // gris (inconnu) : jamais atténué — une pièce périphérique grise doit rester grise, pas neutre
      e.mixTarget = look.status[st] * (st === 'grey' ? 1 : e.tintWeight);
      e.opacityFactorTarget = st === 'grey' ? look.status.greyOpacity
        : st === 'red' && e.layer !== 'shell' ? look.status.redOpacity[e.layer] ?? 1 : 1;
      // une zone en alerte porte l'information : dessinée après les autres, jamais atténuée par le nombre de calques
      e.alert = st === 'amber' || st === 'red';
      const order = 2 + (e.alert ? 1 : 0) + (e.layer === 'shell' ? 0 : LAYER_RANK[e.layer]);
      for (const m of e.meshes) m.renderOrder = order;
      if (immediate) {
        e.alertWeight = e.alert ? 1 : 0;
        (e.mat.uniforms.uTint.value as THREE.Color).copy(e.tintTarget);
        e.mat.uniforms.uTintMix.value = e.mixTarget;
        e.opacityFactor = e.opacityFactorTarget;
      }
    }
  };

  const update = (dt: number, t: number, s: RigFrameState): void => {
    shared.time.value = t;
    shared.ghost.value += ((s.ghost ? 1 : 0) - shared.ghost.value) * damp(look.ghost.lerpSpeed, dt);

    poolTime.value = t;
    ringMat.opacity = 0; discMat.opacity = 0;   // l'ancien plan de scan est remplacé par la surface de l'eau
    if (scanT >= 0 && holdT > 0) {
      // 1. debout sur la plateforme, bassin et anneau qui apparaissent
      holdT -= dt;
      shared.scanY.value = S.yStart;
      scanInfo.t = 0; scanInfo.y = S.yStart;
      setLevel(S.yStart);
      scanGroup.visible = true;
      setBoothFade(Math.min(1, (S.hold - holdT) / 0.4));
      scanInfo.view = 1;
    } else if (scanT >= 0) {
      // 2. immersion : le corps descend à travers l'anneau, pieds d'abord (ce qui est sous l'eau est scanné)
      scanT += dt / S.duration;
      if (scanT >= 1) {
        scanT = -1;
        exitT = S.exit;
        scanInfo.t = -1;
        shared.scanY.value = SCAN_Y_IDLE;
      } else {
        const k = scanT * scanT * (3 - 2 * scanT);
        const y = S.yStart + (S.yEnd - S.yStart) * k;
        shared.scanY.value = y;
        scanInfo.t = k; scanInfo.y = y;
        setLevel(y);
        setBoothFade(1);
        scanInfo.view = 1;
      }
    } else if (exitT > 0) {
      // 3. scan fini : changement de vue (trois quarts → face) et le corps sort du caisson, qui recule et s'efface
      exitT -= dt;
      const u = 1 - Math.max(0, exitT) / S.exit;
      const k = u * u * (3 - 2 * u);
      setLevel(S.yEnd, S.exitDistance * k);
      setBoothFade(1 - THREE.MathUtils.smoothstep(u, 0.45, 1));
      scanInfo.view = 1 - k;
      if (exitT <= 0) { scanGroup.visible = false; scanInfo.view = 0; }
    }

    // fondu des calques
    const kf = fadeInit ? damp(look.layerFadeSpeed, dt) : 1;
    fadeInit = true;
    let innerTarget = 0;
    for (const l of LAYERS) {
      fade[l] += ((s.layers[l] ? 1 : 0) - fade[l]) * kf;
      if (s.layers[l]) innerTarget += 1;
    }
    crowd += (look.crowd[Math.min(innerTarget, look.crowd.length - 1)] - crowd) * kf;
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
        e.alertWeight += ((e.alert ? 1 : 0) - e.alertWeight) * ks;
        base = look.layers[e.layer].opacity * (e.organId ? 1 : look.context[e.layer]) * (crowd + (1 - crowd) * e.alertWeight);
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
    startScan: () => { scanT = 0; holdT = look.scan.hold; exitT = 0; shared.scanY.value = look.scan.yStart; },
    scan: () => scanInfo,
    layerFade: (l) => fade[l],
    dispose: () => {
      for (const e of list) e.mat.dispose();
      ringGeo.dispose(); ringMat.dispose(); discGeo.dispose(); discMat.dispose();
      for (const g of geos) g.dispose();
      for (const f of fades) { (f.mat as THREE.MeshBasicMaterial).map?.dispose(); f.mat.dispose(); }
    },
  };
}
