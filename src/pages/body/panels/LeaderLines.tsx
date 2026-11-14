// Traits de liaison « Cyberware » : relient les cartes [data-organ-id] des colonnes latérales
// aux ancres écran des organes — UNIQUEMENT pour l'organe survolé ou épinglé (au repos, chaque
// alerte a déjà son trait plaque → marqueur dans la scène : un seul système de traits à la fois). Un SVG couvre le conteneur de la scène ; les attributs sont
// mutés directement à chaque frame (aucun setState), les éléments SVG sont recyclés.
import { useEffect, useRef } from 'react';
import type { JSX } from 'react';
import type { Color, Level } from '../../../types';
import { levelColor, statusVar } from '../../../ui';
import { screenAnchors, useBody } from '../store';
import './LeaderLines.css';

// ── Réglages ────────────────────────────────────────────────────────────────
const RUN = 18;            // 1er segment horizontal depuis le bord du conteneur (px)
const STAGGER = 9;         // décalage du coude entre deux traits voisins (px)
const NODE = 5;            // côté du carré posé sur l'ancre
const MIN_VISIBLE = 0.5;   // part de la carte qui doit être visible dans sa liste pour tirer un trait
const EDGE_PAD = 6;        // le départ reste à EDGE_PAD px du haut/bas du conteneur
const SVG_NS = 'http://www.w3.org/2000/svg';

interface Wire { g: SVGGElement; line: SVGPolylineElement; node: SVGRectElement; stub: SVGRectElement }

function makeWire(parent: SVGSVGElement): Wire {
  const g = document.createElementNS(SVG_NS, 'g');
  g.setAttribute('class', 'ldl__wire');
  const line = document.createElementNS(SVG_NS, 'polyline');
  line.setAttribute('class', 'ldl__line');
  line.setAttribute('fill', 'none');
  const node = document.createElementNS(SVG_NS, 'rect');
  node.setAttribute('class', 'ldl__node');
  node.setAttribute('width', String(NODE));
  node.setAttribute('height', String(NODE));
  const stub = document.createElementNS(SVG_NS, 'rect');
  stub.setAttribute('class', 'ldl__stub');
  stub.setAttribute('width', '3');
  stub.setAttribute('height', '7');
  g.append(line, node, stub);
  parent.append(g);
  return { g, line, node, stub };
}

/** Couleur du trait : data-level (niveau d'alerte) sinon data-color (statut) sinon holo. */
function wireColor(el: HTMLElement): string {
  const level = el.dataset.level as Level | undefined;
  const fromLevel = level ? levelColor[level] : undefined;
  if (fromLevel) return statusVar[fromLevel];
  const c = el.dataset.color as Color | undefined;
  if (c && statusVar[c]) return statusVar[c];
  return 'var(--sz-holo)';
}

const clipCache = new WeakMap<Element, Element | null>();
/** Premier ancêtre qui rogne son contenu (liste défilante) — mis en cache par élément. */
function clipParent(el: Element): Element | null {
  const hit = clipCache.get(el);
  if (hit !== undefined) return hit;
  let p = el.parentElement;
  let found: Element | null = null;
  while (p && p !== document.body) {
    const oy = getComputedStyle(p).overflowY;
    if (oy === 'auto' || oy === 'scroll' || oy === 'hidden') { found = p; break; }
    p = p.parentElement;
  }
  clipCache.set(el, found);
  return found;
}

const half = (n: number): string => (Math.round(n) + 0.5).toFixed(1);

export function LeaderLines(): JSX.Element {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return undefined;
    const pool: Wire[] = [];
    let raf = 0;

    const frame = (): void => {
      raf = requestAnimationFrame(frame);
      // La boîte est relue à chaque frame : le redimensionnement est donc suivi sans écouteur.
      const box = svg.getBoundingClientRect();
      const W = box.width;
      const H = box.height;
      let used = 0;
      if (W > 0 && H > 0) {
        const { hovered, selected } = useBody.getState();
        const scene = svg.parentElement?.parentElement ?? null;
        const els = document.querySelectorAll<HTMLElement>('[data-organ-id]');
        const perSide = { left: 0, right: 0 };
        for (const el of els) {
          const id = el.dataset.organId;
          if (!id) continue;
          if (scene && scene.contains(el)) continue;          // marqueurs posés dans la scène : pas des cartes
          // au repos : pas de trait. Trait seulement si l'organe est épinglé, ou si CETTE carte est survolée / a le focus
          // (un survol venu de la 3D a déjà la carte de survol : pas de second trait à travers la scène).
          if (selected !== id && !(hovered === id && el.matches(':hover, :focus-visible'))) continue;
          const a = screenAnchors.get(id);
          if (!a || !a.visible || !Number.isFinite(a.x) || !Number.isFinite(a.y)) continue;
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) continue;
          const cyAbs = r.top + r.height / 2;
          const clip = clipParent(el);
          if (clip) {                                         // carte sortie de sa liste défilante
            const cr = clip.getBoundingClientRect();
            const seen = Math.min(r.bottom, cr.bottom) - Math.max(r.top, cr.top);
            if (seen < r.height * MIN_VISIBLE) continue;      // carte en grande partie rognée : pas de trait vers un coin
          }
          const fromRight = r.left + r.width / 2 >= box.left + W / 2;
          const k = fromRight ? perSide.right++ : perSide.left++;
          const dir = fromRight ? -1 : 1;                     // sens de progression vers le corps
          const x0 = fromRight ? W : 0;
          const y0 = Math.max(EDGE_PAD, Math.min(H - EDGE_PAD, cyAbs - box.top));
          const x1 = x0 + dir * (RUN + k * STAGGER);
          const dy = a.y - y0;
          const room = Math.max(0, (a.x - x1) * dir);         // place horizontale restante jusqu'à l'ancre
          let pts: string;
          if (Math.abs(dy) <= room) {
            // horizontale → diagonale 45° → horizontale jusqu'à l'ancre
            pts = `${half(x0)},${half(y0)} ${half(x1)},${half(y0)} ${half(x1 + dir * Math.abs(dy))},${half(a.y)} ${half(a.x)},${half(a.y)}`;
          } else {
            // pas assez de place : la diagonale va jusqu'à l'aplomb de l'ancre, puis verticale
            const sy = Math.sign(dy) || 1;
            pts = `${half(x0)},${half(y0)} ${half(x1)},${half(y0)} ${half(a.x)},${half(y0 + sy * room)} ${half(a.x)},${half(a.y)}`;
          }

          let w = pool[used];
          if (!w) { w = makeWire(svg); pool.push(w); }
          used++;
          w.g.style.display = '';
          w.g.style.color = wireColor(el);
          const state = hovered === id ? 'hot' : 'pin';
          if (w.g.dataset.state !== state) w.g.dataset.state = state;
          w.line.setAttribute('points', pts);
          w.node.setAttribute('x', (Math.round(a.x) - (NODE - 1) / 2).toFixed(1));
          w.node.setAttribute('y', (Math.round(a.y) - (NODE - 1) / 2).toFixed(1));
          w.stub.setAttribute('x', String(fromRight ? W - 3 : 0));
          w.stub.setAttribute('y', (Math.round(y0) - 3).toFixed(1));
        }
      }
      for (let i = used; i < pool.length; i++) pool[i].g.style.display = 'none';
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      for (const w of pool) w.g.remove();
    };
  }, []);

  return (
    <div className="ldl" aria-hidden="true">
      <svg ref={svgRef} className="ldl__svg" />
    </div>
  );
}
