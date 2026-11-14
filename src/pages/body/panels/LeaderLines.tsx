// Trait de liaison ligne de panneau → organe : relie la ligne [data-organ-id] SURVOLÉE (ou au focus clavier)
// d'une colonne latérale à l'ancre écran de son organe. Rien au repos, rien pour un organe simplement épinglé
// (sa carte porte déjà son propre trait carte → organe : un seul système de traits à la fois).
// Un SVG couvre le conteneur de la scène ; les attributs sont mutés directement à chaque frame
// (aucun setState), les éléments SVG sont recyclés.
import { useEffect, useRef } from 'react';
import type { JSX } from 'react';
import { screenAnchors, useBody } from '../store';
import './LeaderLines.css';

// ── Réglages ────────────────────────────────────────────────────────────────
const RUN = 16;            // 1er segment horizontal depuis le bord du conteneur (px)
const STAGGER = 8;         // décalage du coude entre deux traits voisins (px)
const TRIM = 6;            // le trait s'arrête TRIM px avant l'ancre (le point d'ancrage est dessiné par la carte)
const MIN_VISIBLE = 0.5;   // part de la ligne qui doit être visible dans sa liste pour tirer un trait
const EDGE_PAD = 8;        // le départ reste à EDGE_PAD px du haut/bas du conteneur
const SVG_NS = 'http://www.w3.org/2000/svg';

function makeWire(parent: SVGSVGElement): SVGPolylineElement {
  const line = document.createElementNS(SVG_NS, 'polyline');
  line.setAttribute('class', 'ldl__line');
  line.setAttribute('fill', 'none');
  parent.append(line);
  return line;
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
    const pool: SVGPolylineElement[] = [];
    let raf = 0;

    const frame = (): void => {
      raf = requestAnimationFrame(frame);
      // La boîte est relue à chaque frame : le redimensionnement est donc suivi sans écouteur.
      const box = svg.getBoundingClientRect();
      const W = box.width;
      const H = box.height;
      let used = 0;
      if (W > 0 && H > 0) {
        const { hovered } = useBody.getState();
        const scene = svg.parentElement?.parentElement ?? null;
        const els = document.querySelectorAll<HTMLElement>('[data-organ-id]');
        const perSide = { left: 0, right: 0 };
        for (const el of els) {
          const id = el.dataset.organId;
          if (!id) continue;
          if (scene && scene.contains(el)) continue;          // étiquettes posées dans la scène : pas des lignes de panneau
          // trait seulement si CETTE ligne est survolée ou a le focus (un survol venu de la 3D a déjà sa carte)
          if (hovered !== id || !el.matches(':hover, :focus-visible')) continue;
          const a = screenAnchors.get(id);
          if (!a || !a.visible || !Number.isFinite(a.x) || !Number.isFinite(a.y)) continue;
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) continue;
          const cyAbs = r.top + r.height / 2;
          const clip = clipParent(el);
          if (clip) {                                         // ligne sortie de sa liste défilante
            const cr = clip.getBoundingClientRect();
            const seen = Math.min(r.bottom, cr.bottom) - Math.max(r.top, cr.top);
            if (seen < r.height * MIN_VISIBLE) continue;      // ligne en grande partie rognée : pas de trait
          }
          const fromRight = r.left + r.width / 2 >= box.left + W / 2;
          const k = fromRight ? perSide.right++ : perSide.left++;
          const dir = fromRight ? -1 : 1;                     // sens de progression vers le corps
          const x0 = fromRight ? W : 0;
          const y0 = Math.max(EDGE_PAD, Math.min(H - EDGE_PAD, cyAbs - box.top));
          const x1 = x0 + dir * (RUN + k * STAGGER);
          // tracé orthogonal : horizontale, verticale le long du bord, horizontale jusqu'à l'ancre
          const x2 = a.x - dir * TRIM;
          const pts = (x2 - x1) * dir > 0
            ? `${half(x0)},${half(y0)} ${half(x1)},${half(y0)} ${half(x1)},${half(a.y)} ${half(x2)},${half(a.y)}`
            : `${half(x0)},${half(y0)} ${half(x1)},${half(y0)} ${half(x1)},${half(a.y)}`;

          let w = pool[used];
          if (!w) { w = makeWire(svg); pool.push(w); }
          used++;
          w.style.display = '';
          w.setAttribute('points', pts);
        }
      }
      for (let i = used; i < pool.length; i++) pool[i].style.display = 'none';
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      for (const w of pool) w.remove();
    };
  }, []);

  return (
    <div className="ldl" aria-hidden="true">
      <svg ref={svgRef} className="ldl__svg" />
    </div>
  );
}
