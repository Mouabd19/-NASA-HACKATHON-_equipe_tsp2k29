// Warnings ancrés en 3D sur le corps (ROADMAP §1 « Warnings sur le corps »).
// Rendu DANS le <Canvas> par BodyScene, à l'intérieur du groupe du corps (les ancres suivent sa rotation).
//   · marqueur en scène : losange additif posé sur l'organe (lit à travers le bloom), taille écran constante ;
//   · plaque hexagonale DOM déportée sur le côté, reliée par un trait coudé de 1 px.
// Aucune mise à jour d'état React par frame : positions, fondus et pouls passent par des refs dans useFrame.
// Tous les réglages visuels : ./warnings/knobs.ts
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { JSX } from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { Color } from '../types';
import { statusColor } from '../ui/tokens';
import { useBody } from '../pages/body/store';
import { warnKnobs as K } from './warnings/knobs';
import { deOverlap, elbowPoints } from './warnings/layout';
import type { Slot } from './warnings/layout';
import { warnItems } from './warnings/model';
import type { WarnItem } from './warnings/model';
import { Plate } from './warnings/Plate';
import './Warnings3D.css';

/** État mutable d'un warning (hors React). */
interface Rec extends Slot {
  vis: number;        // 0..1, fondu d'apparition
  x: number;          // bord intérieur de la plaque (px), lissé
  placed: boolean;    // première position déjà posée (sinon on « saute » sans lisser)
  live: boolean;
  phase: number;      // phase du pouls 0..1
  plate: HTMLDivElement | null;
  line: SVGPolylineElement | null;
  marker: THREE.Group | null;
}

const newRec = (): Rec => ({ want: 0, y: 0, vis: 0, x: 0, placed: false, live: false, phase: Math.random(), plate: null, line: null, marker: null });

// Géométries partagées : losanges (anneau / disque à 4 segments), rayon 1.
const GEO_RING = new THREE.RingGeometry(0.74, 1, 4, 1);
const GEO_CORE = new THREE.CircleGeometry(0.3, 4);
const GEO_WAVE = new THREE.RingGeometry(0.9, 1, 4, 1);

const materials = new Map<string, THREE.MeshBasicMaterial>();
function baseMaterial(color: Color): THREE.MeshBasicMaterial {
  let m = materials.get(color);
  if (!m) {
    m = new THREE.MeshBasicMaterial({
      color: new THREE.Color(statusColor[color]).multiplyScalar(K.markerBoost),
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
      side: THREE.DoubleSide,
    });
    materials.set(color, m);
  }
  return m;
}

/** Garde les warnings sortants montés le temps de leur fondu. */
function useLingering(target: WarnItem[]): WarnItem[] {
  const [shown, setShown] = useState(target);
  useEffect(() => {
    setShown((prev) => {
      const keys = new Set(target.map((t) => t.key));
      const gone = prev.filter((p) => !keys.has(p.key)).map((p) => (p.leaving ? p : { ...p, leaving: true }));
      return gone.length ? [...target, ...gone] : target;
    });
    const timer = setTimeout(() => setShown((prev) => (prev.some((p) => p.leaving) ? prev.filter((p) => !p.leaving) : prev)), K.exitMs);
    return () => clearTimeout(timer);
  }, [target]);
  return shown;
}

/** Marqueur en scène : losange + cœur + onde de pouls. Animé par le parent via la ref du groupe. */
function Marker({ item, register }: { item: WarnItem; register: (g: THREE.Group | null) => void }): JSX.Element {
  // un matériau par maille (opacités indépendantes), cloné du matériau de statut
  const mats = useMemo(() => [0, 1, 2].map(() => baseMaterial(item.color).clone()), [item.color]);
  useEffect(() => () => mats.forEach((m) => m.dispose()), [mats]);
  return (
    <group ref={register} position={item.anchor} visible={false} renderOrder={50}>
      <mesh geometry={GEO_RING} material={mats[0]} renderOrder={50} raycast={noRaycast} />
      <mesh geometry={GEO_CORE} material={mats[1]} renderOrder={50} raycast={noRaycast} />
      <mesh geometry={GEO_WAVE} material={mats[2]} renderOrder={50} raycast={noRaycast} />
    </group>
  );
}
const noRaycast = (): void => {};

/** Calque DOM : traits coudés (un seul SVG) + plaques. */
function Overlay({ items, recs }: { items: WarnItem[]; recs: Map<string, Rec> }): JSX.Element {
  const rec = (key: string): Rec => {
    let r = recs.get(key);
    if (!r) { r = newRec(); recs.set(key, r); }
    return r;
  };
  return (
    <>
      <svg className="w3d-lines" aria-hidden="true">
        {items.map((it) => (
          <polyline
            key={it.key}
            ref={(el) => { if (el) rec(it.key).line = el; else { const r = recs.get(it.key); if (r) r.line = null; } }}
            className={`w3d-line w3d-line--${it.color}${it.projected ? ' is-projected' : ''}`}
          />
        ))}
      </svg>
      {items.map((it) => (
        <Plate key={it.key} item={it} register={(el) => { if (el) rec(it.key).plate = el; else { const r = recs.get(it.key); if (r) r.plate = null; } }} />
      ))}
    </>
  );
}

const tmp = {
  v: new THREE.Vector3(),
  q: new THREE.Quaternion(),
  axis: new THREE.Vector3(),
};
const columns: Record<1 | -1, Rec[]> = { 1: [], [-1]: [] };

export function Warnings3D(): JSX.Element | null {
  const day = useBody((s) => s.day);
  const layers = useBody((s) => s.layers);
  const gl = useThree((s) => s.gl);

  const target = useMemo(() => warnItems(day, layers), [day, layers]);
  const items = useLingering(target);
  const recs = useRef(new Map<string, Rec>()).current;
  const group = useRef<THREE.Group>(null);
  const anchors = useRef(new Map<string, { ax: number; ay: number; on: boolean }>()).current;

  // Calque DOM frère du canvas (racine React DOM séparée, comme <Html> de drei).
  const root = useRef<Root | null>(null);
  useLayoutEffect(() => {
    const parent = gl.domElement.parentElement;
    if (!parent) return;
    const host = document.createElement('div');
    host.className = 'w3d-layer';
    parent.appendChild(host);
    const r = createRoot(host);
    root.current = r;
    return () => {
      root.current = null;
      host.remove();
      setTimeout(() => r.unmount(), 0);
    };
  }, [gl]);
  useLayoutEffect(() => {
    root.current?.render(<Overlay items={items} recs={recs} />);
    // purge des enregistrements des warnings démontés
    const keys = new Set(items.map((i) => i.key));
    for (const k of recs.keys()) if (!keys.has(k)) recs.delete(k);
  });

  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;
    const dt = Math.min(delta, 0.1);
    const cam = state.camera as THREE.PerspectiveCamera;
    const W = state.size.width, H = state.size.height;
    const fovScale = 2 * Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2) / H; // mètres par px à 1 m
    const kFade = 1 - Math.exp(-K.fadeSpeed * dt);
    const kFollow = 1 - Math.exp(-K.followSpeed * dt);

    // orientation « face caméra » dans le repère du groupe (le corps peut tourner)
    g.getWorldQuaternion(tmp.q).invert().multiply(cam.quaternion);

    // axe du corps à l'écran → position des deux colonnes de plaques
    tmp.axis.set(0, 1, 0).applyMatrix4(g.matrixWorld);
    const axisDist = Math.max(0.1, tmp.axis.distanceTo(cam.position));
    const cx = (tmp.axis.project(cam).x * 0.5 + 0.5) * W;
    const offsetPx = K.columnOffsetM / (fovScale * axisDist);
    const colX: Record<1 | -1, number> = {
      1: Math.min(cx + offsetPx, W - K.plateW - K.edgeMargin),
      [-1]: Math.max(cx - offsetPx, K.plateW + K.edgeMargin),
    };

    columns[1].length = 0;
    columns[-1].length = 0;

    // 1) marqueurs + projection des ancres
    for (const it of items) {
      const r = recs.get(it.key);
      if (!r) continue;
      tmp.v.set(it.anchor[0], it.anchor[1], it.anchor[2]).applyMatrix4(g.matrixWorld);
      const dist = tmp.v.distanceTo(cam.position);
      tmp.v.project(cam);
      const ax = (tmp.v.x * 0.5 + 0.5) * W, ay = (-tmp.v.y * 0.5 + 0.5) * H;
      const on = tmp.v.z > -1 && tmp.v.z < 1 && ax > 0 && ax < W && ay > 0 && ay < H;
      let a = anchors.get(it.key);
      if (!a) { a = { ax, ay, on }; anchors.set(it.key, a); }
      a.ax = ax; a.ay = ay; a.on = on;

      r.vis += ((it.leaving || !on ? 0 : 1) - r.vis) * kFade;
      if (r.vis < 0.002) r.vis = 0;
      else if (r.vis > 0.998) r.vis = 1;
      r.phase = (r.phase + dt / K.pulse[it.color]) % 1;

      const m = r.marker;
      if (m) {
        m.visible = r.vis > 0;
        if (m.visible) {
          const px = K.markerPx * fovScale * dist;
          const dim = it.projected ? K.markerProjectedOpacity : 1;
          const beat = 0.5 + 0.5 * Math.cos(r.phase * Math.PI * 2);
          m.quaternion.copy(tmp.q);
          m.scale.setScalar(px * (0.5 + 0.5 * r.vis));
          const [ring, core, wave] = m.children as THREE.Mesh[];
          (ring.material as THREE.MeshBasicMaterial).opacity = r.vis * dim * (0.7 + 0.3 * beat);
          (core.material as THREE.MeshBasicMaterial).opacity = r.vis * dim * (0.35 + 0.65 * beat);
          wave.scale.setScalar(1 + r.phase * (K.pulseSpread - 1));
          (wave.material as THREE.MeshBasicMaterial).opacity = r.vis * dim * (1 - r.phase) * 0.8;
        }
      }

      r.want = ay;
      if (!it.leaving && on) columns[it.side].push(r);
    }

    // 2) dé-chevauchement vertical par colonne (les sortants gardent leur dernière place)
    const step = K.plateH + K.plateGap;
    const top = K.topMargin + K.plateH / 2, bottom = H - K.bottomMargin - K.plateH / 2;
    const slotY = new Map<Rec, number>();
    for (const side of [1, -1] as const) {
      const col = columns[side];
      const saved = col.map((r) => r.y);
      deOverlap(col, step, top, bottom);
      col.forEach((r, i) => { slotY.set(r, r.y); r.y = saved[i]; });
    }

    // 3) plaques + traits
    for (const it of items) {
      const r = recs.get(it.key);
      const a = anchors.get(it.key);
      if (!r || !a) continue;
      const wantY = slotY.get(r);
      if (wantY !== undefined) {
        const wantX = it.side > 0 ? Math.max(colX[1], Math.min(a.ax + K.minReach, W - K.plateW - K.edgeMargin)) : Math.min(colX[-1], Math.max(a.ax - K.minReach, K.plateW + K.edgeMargin));
        if (!r.placed) { r.x = wantX; r.y = wantY; r.placed = true; }
        else { r.x += (wantX - r.x) * kFollow; r.y += (wantY - r.y) * kFollow; }
      }
      const el = r.plate;
      if (el) {
        const live = r.vis > 0.5 && !it.leaving;
        // style en ligne (pas une classe : React réécrit className quand le niveau change)
        if (live !== r.live || !el.style.pointerEvents) { r.live = live; el.style.pointerEvents = live ? 'auto' : 'none'; }
        const left = Math.round(it.side > 0 ? r.x : r.x - K.plateW);
        const topPx = Math.round(r.y - K.plateH / 2);
        el.style.opacity = r.vis.toFixed(3);
        el.style.transform = `translate3d(${left}px,${topPx}px,0) scale(${(0.86 + 0.14 * r.vis).toFixed(3)})`;
      }
      const line = r.line;
      if (line) {
        line.style.opacity = (r.vis * K.lineOpacity * (it.projected ? 0.7 : 1)).toFixed(3);
        if (r.vis > 0 && r.placed) line.setAttribute('points', elbowPoints(a.ax, a.ay, Math.round(r.x), Math.round(r.y), it.side, K.lineTrim));
      }
    }
    for (const k of anchors.keys()) if (!recs.has(k)) anchors.delete(k);
  });

  if (!items.length) return <group ref={group} />;
  return (
    <group ref={group}>
      {items.map((it) => (
        <Marker
          key={it.key}
          item={it}
          register={(m) => {
            let r = recs.get(it.key);
            if (!r && m) { r = newRec(); recs.set(it.key, r); }
            if (r) r.marker = m;
          }}
        />
      ))}
    </group>
  );
}
