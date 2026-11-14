// Courbe miniature en SVG : polyligne nette, sans axes.
import type { JSX } from 'react';

export interface SparklineProps {
  values: number[];
  width?: number;
  height?: number;
  /** Couleur du trait (défaut : texte). Toujours une variable CSS ou une valeur de tokens. */
  color?: string;
  /** Bande [bas, haut] en unités de valeur (bruit de mesure, intervalle) — aplat discret. */
  band?: [number, number];
  /** Indice à partir duquel le tracé est en pointillé (partie prédite). */
  dashedFrom?: number;
  refLow?: number;
  refHigh?: number;
}

const PAD = 3;

export function Sparkline({
  values, width = 96, height = 24, color = 'var(--sz-text)', band, dashedFrom, refLow, refHigh,
}: SparklineProps): JSX.Element {
  const pts = values.map((v, i) => ({ v, i })).filter((p) => Number.isFinite(p.v));
  const empty = pts.length === 0;

  const extra = [refLow, refHigh, band?.[0], band?.[1]].filter((x): x is number => x !== undefined && Number.isFinite(x));
  const all = [...pts.map((p) => p.v), ...extra];
  let min = all.length ? Math.min(...all) : 0;
  let max = all.length ? Math.max(...all) : 1;
  if (max - min < 1e-9) { min -= 1; max += 1; }

  const n = Math.max(values.length - 1, 1);
  const x = (i: number): number => PAD + (i / n) * (width - 2 * PAD);
  const y = (v: number): number => PAD + (1 - (v - min) / (max - min)) * (height - 2 * PAD);
  const r = (k: number): string => k.toFixed(1);
  const path = (list: { v: number; i: number }[]): string => list.map((p) => `${r(x(p.i))},${r(y(p.v))}`).join(' ');

  const cut = dashedFrom === undefined ? Number.POSITIVE_INFINITY : Math.max(0, dashedFrom);
  const solid = pts.filter((p) => p.i <= cut);
  const dashed = pts.filter((p) => p.i >= cut);
  const last = pts[pts.length - 1];
  const lastDashed = last !== undefined && last.i > cut;

  return (
    <svg
      className="sz-spark"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={empty ? 'Aucune donnée' : `Courbe de ${pts.length} points`}
      style={{ color, display: 'block', overflow: 'visible', flex: 'none' }}
    >
      {band && !empty ? (
        <rect
          x={PAD}
          width={width - 2 * PAD}
          y={Math.min(y(band[0]), y(band[1]))}
          height={Math.max(Math.abs(y(band[0]) - y(band[1])), 1)}
          fill="currentColor"
          opacity={0.12}
        />
      ) : null}
      {[refLow, refHigh].map((ref, k) => (ref !== undefined && Number.isFinite(ref) ? (
        <line
          key={k}
          x1={0}
          x2={width}
          y1={Math.round(y(ref)) + 0.5}
          y2={Math.round(y(ref)) + 0.5}
          stroke="var(--sz-border-strong)"
          strokeWidth={1}
          strokeDasharray="1 3"
        />
      ) : null))}
      {empty ? (
        <line x1={PAD} x2={width - PAD} y1={height / 2} y2={height / 2} stroke="var(--sz-unknown)" strokeWidth={1} strokeDasharray="2 3" />
      ) : null}
      {solid.length > 1 ? (
        <polyline points={path(solid)} fill="none" stroke="currentColor" strokeWidth={1.25} strokeLinejoin="round" strokeLinecap="round" />
      ) : null}
      {dashed.length > 1 ? (
        <polyline points={path(dashed)} fill="none" stroke="currentColor" strokeWidth={1.25} strokeLinejoin="round" strokeDasharray="2 2.5" opacity={0.75} />
      ) : null}
      {last !== undefined ? (
        lastDashed
          ? <circle cx={x(last.i)} cy={y(last.v)} r={1.75} fill="var(--sz-bg)" stroke="currentColor" strokeWidth={1} />
          : <circle cx={x(last.i)} cy={y(last.v)} r={2} fill="currentColor" />
      ) : null}
    </svg>
  );
}
