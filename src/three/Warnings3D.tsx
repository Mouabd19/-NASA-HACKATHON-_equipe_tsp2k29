// Annotations d'alerte ancrées au corps.
// Rendu DANS le <Canvas> par BodyScene, à l'intérieur du groupe du corps (les ancres suivent sa rotation).
// Tout l'affichage est un calque DOM frère du canvas : point d'ancrage rond sur l'organe, étiquette déportée
// sur le côté, trait de liaison coudé de 1 px.
// Aucune mise à jour d'état React par frame : positions et fondus passent par des refs dans useFrame.
// Tous les réglages visuels : ./warnings/knobs.ts
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { JSX } from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { hoverCardRect, plateSides, useBody } from '../pages/body/store';
import { warnKnobs as K } from './warnings/knobs';
import { deOverlap, elbowPoints } from './warnings/layout';
import type { Slot } from './warnings/layout';
import { warnItems } from './warnings/model';
import type { WarnItem } from './warnings/model';
import { Plate } from './warnings/Plate';
import './Warnings3D.css';

/** État mutable d'une annotation (hors React). */
interface Rec extends Slot {
  vis: number;        // 0..1, fondu d'apparition
  cover: number;      // 0..1, étiquette masquée parce que la carte de survol la recouvre
  x: number;          // bord intérieur de l'étiquette (px), lissé
  w: number;          // largeur mesurée de l'étiquette (px)
  placed: boolean;    // première position déjà posée (sinon on « saute » sans lisser)
  live: boolean;
  plate: HTMLDivElement | null;
  line: SVGPolylineElement | null;
  dot: SVGCircleElement | null;
}

const newRec = (): Rec => ({ want: 0, y: 0, vis: 0, cover: 0, x: 0, w: K.plateW, placed: false, live: false, plate: null, line: null, dot: null });

/**
 * Garde les warnings sortants montés le temps de leur fondu.
 * `target` reste la source : on ne stocke en état QUE les sortants, et on n'appelle setState que si une clé a
 * réellement disparu (une dizaine de fois sur toute la mission). Un setState à chaque changement de jour
 * faisait déborder le compteur de mises à jour imbriquées du réconciliateur (React #185) en maintenant ← / →.
 */
function useLingering(target: WarnItem[]): WarnItem[] {
  const [leaving, setLeaving] = useState<WarnItem[]>([]);
  const prev = useRef<WarnItem[]>(target);
  const timer = useRef<ReturnType<typeof setTimeout> | 0>(0);
  useEffect(() => {
    const before = prev.current;
    prev.current = target;
    if (before === target) return;
    const keys = new Set(target.map((t) => t.key));
    const gone = before.filter((p) => !keys.has(p.key));
    if (!gone.length) return;
    setLeaving((cur) => [...cur.filter((c) => !gone.some((g) => g.key === c.key)), ...gone.map((g) => ({ ...g, leaving: true }))]);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { timer.current = 0; setLeaving([]); }, K.exitMs);
  }, [target]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  return useMemo(() => {
    if (!leaving.length) return target;
    const keys = new Set(target.map((t) => t.key));
    const rest = leaving.filter((l) => !keys.has(l.key));
    return rest.length ? [...target, ...rest] : target;
  }, [target, leaving]);
}

/** Calque DOM : traits de liaison et points d'ancrage (un seul SVG) + étiquettes. */
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
            className={`w3d-line${it.projected ? ' is-projected' : ''}`}
          />
        ))}
        {items.map((it) => (
          <circle
            key={it.key}
            ref={(el) => { if (el) rec(it.key).dot = el; else { const r = recs.get(it.key); if (r) r.dot = null; } }}
            className={`w3d-dot w3d-dot--${it.color}${it.projected ? ' is-projected' : ''}`}
            r={K.dotR}
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
  axis: new THREE.Vector3(),
};
const columns: Record<1 | -1, Rec[]> = { 1: [], [-1]: [] };

const sameItem = (a: WarnItem, b: WarnItem): boolean =>
  a.key === b.key && a.color === b.color && a.side === b.side && a.projected === b.projected
  && a.label === b.label && a.levelLabel === b.levelLabel && a.alert.message === b.alert.message && a.num === b.num;

export function Warnings3D(): JSX.Element | null {
  const lastTarget = useRef<WarnItem[]>([]);
  const day = useBody((s) => s.day);
  const layers = useBody((s) => s.layers);
  const gl = useThree((s) => s.gl);

  const adherence = useBody((s) => s.adherence);
  const target = useMemo(() => {
    const next = warnItems(day, layers, adherence);
    // même liste qu'au rendu précédent (cas courant d'un jour à l'autre) : on garde la même référence
    const prev = lastTarget.current;
    if (prev.length === next.length && next.every((n, i) => sameItem(n, prev[i]))) return prev;
    lastTarget.current = next;
    return next;
  }, [day, layers, adherence]);
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

  const tick = useRef(0);
  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;
    // largeur réelle des étiquettes : relue de temps en temps (texte, mode Détails, police chargée), pas à chaque frame
    const measure = tick.current++ % 20 === 0;
    const dt = Math.min(delta, 0.1);
    const cam = state.camera as THREE.PerspectiveCamera;
    const W = state.size.width, H = state.size.height;
    const fovScale = 2 * Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2) / H; // mètres par px à 1 m
    const kFade = 1 - Math.exp(-K.fadeSpeed * dt);
    const kFollow = 1 - Math.exp(-K.followSpeed * dt);

    // axe du corps à l'écran → position des deux colonnes d'étiquettes
    tmp.axis.set(0, 1, 0).applyMatrix4(g.matrixWorld);
    const axisDist = Math.max(0.1, tmp.axis.distanceTo(cam.position));
    const cx = (tmp.axis.project(cam).x * 0.5 + 0.5) * W;
    const offsetPx = K.columnOffsetM / (fovScale * axisDist);
    const colX: Record<1 | -1, number> = { 1: cx + offsetPx, [-1]: cx - offsetPx };

    columns[1].length = 0;
    columns[-1].length = 0;

    // 1) projection des ancres + points d'ancrage
    for (const it of items) {
      const r = recs.get(it.key);
      if (!r) continue;
      tmp.v.set(it.anchor[0], it.anchor[1], it.anchor[2]).applyMatrix4(g.matrixWorld);
      tmp.v.project(cam);
      const ax = (tmp.v.x * 0.5 + 0.5) * W, ay = (-tmp.v.y * 0.5 + 0.5) * H;
      const on = tmp.v.z > -1 && tmp.v.z < 1 && ax > 0 && ax < W && ay > 0 && ay < H;
      let a = anchors.get(it.key);
      if (!a) { a = { ax, ay, on }; anchors.set(it.key, a); }
      a.ax = ax; a.ay = ay; a.on = on;

      r.vis += ((it.leaving || !on ? 0 : 1) - r.vis) * kFade;
      if (r.vis < 0.002) r.vis = 0;
      else if (r.vis > 0.998) r.vis = 1;
      if (measure && r.plate) { const w = r.plate.offsetWidth; if (w > 0) r.w = w; }

      const dot = r.dot;
      if (dot) {
        dot.style.opacity = r.vis.toFixed(3);
        if (r.vis > 0) { dot.setAttribute('cx', ax.toFixed(1)); dot.setAttribute('cy', ay.toFixed(1)); }
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

    // 3) étiquettes + traits
    const pinned = useBody.getState().selected;
    const focus = useBody.getState().hovered ?? pinned;
    plateSides.clear();
    for (const it of items) if (!it.leaving) plateSides.set(it.organId, it.side);
    for (const it of items) {
      const r = recs.get(it.key);
      const a = anchors.get(it.key);
      if (!r || !a) continue;
      const wantY = slotY.get(r);
      if (wantY !== undefined) {
        const maxR = W - r.w - K.edgeMargin, minL = r.w + K.edgeMargin;
        const wantX = it.side > 0
          ? Math.min(maxR, Math.max(colX[1], a.ax + K.minReach))
          : Math.max(minL, Math.min(colX[-1], a.ax - K.minReach));
        if (!r.placed) { r.x = wantX; r.y = wantY; r.placed = true; }
        else { r.x += (wantX - r.x) * kFollow; r.y += (wantY - r.y) * kFollow; }
      }
      // la carte de survol passe devant : une étiquette qu'elle recouvre s'efface (avec son trait),
      // sauf celle de l'organe survolé — la carte se pose toujours du côté opposé à cette étiquette.
      const pl = it.side > 0 ? r.x : r.x - r.w, pt = r.y - K.plateH / 2;
      const hc = hoverCardRect;
      // Organe épinglé : sa carte porte déjà nom + statut → sa propre étiquette s'efface (le point reste sur l'organe).
      const covered = it.organId === pinned || (hc.on && it.organId !== focus
        && pl < hc.x + hc.w + 6 && pl + r.w > hc.x - 6 && pt < hc.y + hc.h + 4 && pt + K.plateH > hc.y - 4);
      r.cover += ((covered ? 1 : 0) - r.cover) * kFade;
      if (r.cover < 0.002) r.cover = 0;
      const shown = r.vis * (1 - r.cover);
      const el = r.plate;
      if (el) {
        const live = r.vis > 0.5 && r.cover < 0.5 && !it.leaving;
        // style en ligne (pas une classe : React réécrit className quand le niveau change)
        if (live !== r.live || !el.style.pointerEvents) { r.live = live; el.style.pointerEvents = live ? 'auto' : 'none'; }
        const left = Math.round(pl);
        const topPx = Math.round(r.y - K.plateH / 2);
        el.style.opacity = shown.toFixed(3);
        el.style.transform = `translate3d(${left}px,${topPx}px,0)`;
      }
      const line = r.line;
      if (line) {
        line.style.opacity = shown.toFixed(3);
        if (r.vis > 0 && r.placed) line.setAttribute('points', elbowPoints(a.ax, a.ay, Math.round(r.x), Math.round(r.y), it.side, K.lineTrim));
      }
    }
    for (const k of anchors.keys()) if (!recs.has(k)) anchors.delete(k);
  });

  return <group ref={group} />;
}
