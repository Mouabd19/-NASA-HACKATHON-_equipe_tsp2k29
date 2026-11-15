// Scène 3D de la page Corps : visualisation anatomique de l'astronaute.
// Tout l'état vient du store useBody et des modules §7 ; le rendu est piloté par uniforms
// (aucun setState dans la boucle de rendu, aucune reconstruction quand le jour change).
import { useEffect, useMemo, useRef } from 'react';
import type { JSX } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import type { Color, LayerId, OrganId } from '../types';
import { tokens } from '../ui/tokens';
import { DAY_TODAY } from '../mocks/mission';
import { getDayBodyPlan } from '../sim/load';
import { bodyAxis, scanState, screenAnchors, useBody } from '../pages/body/store';
import { activeAnchors, organLayers } from './anatomy';
import { createBodyRig } from './core/rig';
import { createFloor, disposeFloor } from './core/floor';
import { look } from './look';
import { Warnings3D } from './Warnings3D';

/** Statut de chaque organe pour un jour donné (lecture §7). */
function statusesForDay(day: number, adherence: number): Map<OrganId, Color> {
  const map = new Map<OrganId, Color>();
  for (const o of getDayBodyPlan(day, adherence).organs) map.set(o.id, o.status);
  return map;
}

// Ancres lues à la première utilisation : après le chargement éventuel des modèles Z-Anatomy (main.tsx).
let anchorsCache: { id: OrganId; anchor: THREE.Vector3; layers: LayerId[] }[] | null = null;
const getAnchors = () => (anchorsCache ??= activeAnchors().map((o) => ({ id: o.id, anchor: new THREE.Vector3(...o.anchor), layers: organLayers(o.id) })));

function Rig(): JSX.Element {
  const rig = useMemo(() => createBodyRig(), []);
  const floor = useMemo(() => createFloor(), []);
  const root = useRef<THREE.Group>(null);
  const controls = useRef<OrbitControlsImpl>(null);
  const gl = useThree((s) => s.gl);

  // état d'interaction, hors React
  const st = useRef({
    clearTimer: 0 as ReturnType<typeof setTimeout> | 0,
    sceneHover: null as OrganId | null,   // survol posé par la scène (pas par un panneau)
    interacting: false,
    introOff: false,
    introWas: 0,   // l'utilisateur a pris la main : la vue du scan ne pilote plus la caméra
    lastInteraction: -100,
    swayPhase: 0,
    swayWeight: 0,
    sizeH: 0,
    now: 0,
  }).current;
  const tmp = useMemo(() => ({ v: new THREE.Vector3(), target: new THREE.Vector3(), dir: new THREE.Vector3() }), []);

  // statuts du jour : abonnement au store, sans re-rendu React
  useEffect(() => {
    const s0 = useBody.getState();
    rig.setStatuses(statusesForDay(s0.day, s0.adherence), true);
    // balayage du scanner au chargement (« ?noscan=1 » dans l'URL le désactive)
    const noscan = new URLSearchParams(window.location.search).get('noscan') === '1';
    if (!noscan) rig.startScan();
    const unsub = useBody.subscribe((s, prev) => {
      if (s.day !== prev.day || s.adherence !== prev.adherence) rig.setStatuses(statusesForDay(s.day, s.adherence));
      if (s.scanNonce !== prev.scanNonce) rig.startScan();
    });
    return () => {
      unsub();
      if (st.clearTimer) clearTimeout(st.clearTimer);
      gl.domElement.style.cursor = '';
      screenAnchors.clear();
      bodyAxis.x = Number.NaN;
      scanState.t = -1;
    };
  }, [rig, gl, st]);

  useEffect(() => () => { rig.dispose(); disposeFloor(floor); }, [rig, floor]);

  const setSceneHover = (id: OrganId | null): void => {
    if (st.clearTimer) { clearTimeout(st.clearTimer); st.clearTimer = 0; }
    const store = useBody.getState();
    if (id) {
      st.sceneHover = id;
      if (store.hovered !== id) store.setHovered(id);
      gl.domElement.style.cursor = 'pointer';
    } else if (st.sceneHover) {
      // effacement différé : évite le clignotement entre deux pièces voisines
      st.clearTimer = setTimeout(() => {
        st.clearTimer = 0;
        const cur = useBody.getState();
        if (cur.hovered === st.sceneHover) cur.setHovered(null);
        st.sceneHover = null;
        gl.domElement.style.cursor = '';
      }, look.hover.clearDelayMs);
    }
  };

  const onMove = (e: ThreeEvent<PointerEvent>): void => {
    setSceneHover(rig.pick(e.intersections, useBody.getState().layers));
  };
  const onOut = (): void => setSceneHover(null);
  const onClick = (e: ThreeEvent<MouseEvent>): void => {
    e.stopPropagation();
    if (e.delta > 6) return; // fin d'un glisser (rotation), pas un clic
    useBody.getState().setSelected(rig.pick(e.intersections, useBody.getState().layers));
  };
  const onDouble = (e: ThreeEvent<MouseEvent>): void => {
    e.stopPropagation();
    const id = rig.pick(e.intersections, useBody.getState().layers);
    if (id) {
      useBody.getState().setSelected(id);
      useBody.getState().openOrganWindow(id);
    }
  };

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.1);
    st.now += dt;
    const s = useBody.getState();
    const focus = s.hovered ?? s.selected;

    rig.update(dt, st.now, { layers: s.layers, focus, ghost: s.day > DAY_TODAY });

    // balancement au repos
    const g = root.current;
    if (g) {
      const idle = look.sway.enabled && !focus && !st.interacting && !s.organWindow && st.now - st.lastInteraction > look.sway.idleDelay;
      st.swayWeight += ((idle ? 1 : 0) - st.swayWeight) * (1 - Math.exp(-1.5 * dt));
      st.swayPhase += (dt * Math.PI * 2) / look.sway.period;
      g.rotation.y = look.sway.amplitude * Math.sin(st.swayPhase) * st.swayWeight;
      g.updateMatrixWorld();
    }

    // Cadrage : le corps entier reste dans le cadre. La sélection d'un organe ne déplace PAS la caméra (un zoom
    // coupait la tête et les pieds) : l'organe est mis en évidence par son rendu, la fiche se pose à côté du corps.
    const c = controls.current;
    if (c) {
      const cam = state.camera;
      // petit canevas (vidéoprojecteur 720p) : les marges en pixels (étiquettes, aide) pèsent plus → on recule un peu
      if (state.size.height !== st.sizeH) {
        st.sizeH = state.size.height;
        const pad = look.camera.fitPadPx, ref = look.camera.fitRefPx;
        const k = Math.max(1, (1 - (2 * pad) / ref) / Math.max(0.5, 1 - (2 * pad) / Math.max(1, st.sizeH)));
        const base = tmp.v.set(...look.camera.position).distanceTo(tmp.target.set(...look.camera.target));
        tmp.dir.copy(cam.position).sub(c.target).normalize();
        cam.position.copy(c.target).addScaledVector(tmp.dir, base * k);
      }
      // vue du scan : trois quarts légèrement plongeante, puis retour de face à la sortie du caisson
      const view = rig.scan().view;
      if (!st.introOff && (view > 0 || st.introWas > 0)) {
        const dist = cam.position.distanceTo(c.target);
        tmp.dir.set(...look.camera.position).sub(tmp.target.set(...look.camera.target)).normalize();
        tmp.dir.applyAxisAngle(Y_AXIS, look.scan.viewYaw * view);
        tmp.dir.y += look.scan.viewLift * view;
        tmp.dir.normalize();
        cam.position.copy(c.target).addScaledVector(tmp.dir, dist);
      }
      st.introWas = view;
      c.update();
    }

    // ancres écran pour les traits de liaison et la carte de survol
    if (g) {
      const w = state.size.width, h = state.size.height;
      // axe du corps à l'écran + échelle px/m à sa profondeur (la carte de survol se pose hors silhouette)
      tmp.v.set(0, 1, 0).applyMatrix4(g.matrixWorld);
      const axisDist = Math.max(0.1, tmp.v.distanceTo(state.camera.position));
      const fov = (state.camera as THREE.PerspectiveCamera).fov;
      bodyAxis.pxPerM = h / (2 * Math.tan(THREE.MathUtils.degToRad(fov) / 2) * axisDist);
      bodyAxis.x = (tmp.v.project(state.camera).x * 0.5 + 0.5) * w;
      // libellé « Scan n % » : suit le bord droit de l'anneau de scan
      const sc = rig.scan();
      scanState.t = sc.t;
      if (sc.t >= 0) {
        tmp.v.set(look.scan.poolRadius + 0.12, sc.y, 0).applyMatrix4(g.matrixWorld).project(state.camera);
        scanState.x = (tmp.v.x * 0.5 + 0.5) * w;
        scanState.y = (-tmp.v.y * 0.5 + 0.5) * h;
      }
      for (const a of getAnchors()) {
        tmp.v.copy(a.anchor).applyMatrix4(g.matrixWorld).project(state.camera);
        let active = false;
        for (const l of a.layers) if (s.layers[l] && rig.layerFade(l) > 0.5) active = true;
        const visible = active && tmp.v.z > -1 && tmp.v.z < 1;
        const cur = screenAnchors.get(a.id);
        const x = (tmp.v.x * 0.5 + 0.5) * w, y = (-tmp.v.y * 0.5 + 0.5) * h;
        if (cur) { cur.x = x; cur.y = y; cur.visible = visible; }
        else screenAnchors.set(a.id, { x, y, visible });
      }
    }
  });

  return (
    <>
      <primitive object={floor} />
      <group ref={root}>
        <primitive object={rig.staticGroup} />
        <primitive object={rig.pickGroup} onPointerMove={onMove} onPointerOut={onOut} onClick={onClick} onDoubleClick={onDouble} />
        <primitive object={rig.scanGroup} />
        <Warnings3D />
      </group>
      <OrbitControls
        ref={controls}
        makeDefault
        enablePan={false}
        enableDamping
        dampingFactor={look.camera.damping}
        rotateSpeed={look.camera.rotateSpeed}
        zoomSpeed={look.camera.zoomSpeed}
        minDistance={look.camera.minDistance}
        maxDistance={look.camera.maxDistance}
        minPolarAngle={look.camera.minPolar}
        maxPolarAngle={look.camera.maxPolar}
        target={look.camera.target}
        onStart={() => { st.interacting = true; st.introOff = true; }}
        onEnd={() => { st.interacting = false; st.lastInteraction = st.now; }}
      />
    </>
  );
}

/** Canvas plein cadre (le parent doit être position:relative avec une taille). */
const Y_AXIS = new THREE.Vector3(0, 1, 0);

export function BodyScene(): JSX.Element {
  return (
    <Canvas
      flat
      dpr={[1, look.maxDpr]}
      camera={{ position: look.camera.position, fov: look.camera.fov, near: 0.1, far: 40 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      style={{ position: 'absolute', inset: 0 }}
      onPointerMissed={() => useBody.getState().setSelected(null)}
    >
      <color attach="background" args={[tokens.color.bg]} />
      <Rig />
    </Canvas>
  );
}
