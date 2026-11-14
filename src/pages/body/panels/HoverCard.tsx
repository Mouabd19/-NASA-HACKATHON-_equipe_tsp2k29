// Carte de survol (ROADMAP §1 « Survol d'un élément ») : récap santé DU JOUR de l'organe survolé
// (ou épinglé), reliée à son ancre écran par un trait de 1 px.
// La position est appliquée par ref dans une boucle requestAnimationFrame — aucun état React à 60 Hz.
import { useEffect, useMemo, useRef } from 'react';
import type { CSSProperties, JSX, SyntheticEvent } from 'react';
import type { Metric, OrganId, OrganState } from '../../../types';
import { DAY_TODAY } from '../../../mocks/mission';
import { trend7d } from '../../../models/trend';
import { hasBioAgeModel } from '../../../models/bioAge';
import { PROVENANCE_TEXT, ProvenanceBadge, Sparkline, StatusChip, fmt, fmtDay, statusVar } from '../../../ui';
import { LAYER_META, bodyAxis, hoverCardRect, plateSides, scenarioBody, screenAnchors, useBody } from '../store';
import './HoverCard.css';

// ── Réglages (tout ce qui se règle à l'œil est ici) ─────────────────────────
const CARD_W = 304;        // largeur de la carte (px) — doit suivre --hvc-w dans le CSS
const GAP_X = 64;          // distance horizontale mini ancre → bord de la carte
const CLEAR_M = 0.37;      // la carte se pose HORS de la silhouette : bord intérieur à CLEAR_M mètres de l'axe du corps
const SIDE_BIAS = 120;     // à place comparable, la carte va à GAUCHE (les étiquettes d'alerte sont à droite)
const RISE = 0;            // décalage vertical ancre → accroche : 0 = trait horizontal (coudé seulement si la carte bute sur un bord)
const HOOK_Y = 23;         // point d'accroche du trait, depuis le haut de la carte (milieu de l'en-tête)
const MARGIN = 12;         // marge mini avec les bords du conteneur
const MARGIN_BOTTOM = 48;  // bas réservé à la ligne d'aide de la scène (comme warnKnobs.bottomMargin)
const MARGIN_TOP = 40;     // haut réservé à l'étiquette de provenance de la scène
const NODE_R = 3;          // rayon du point posé sur l'ancre
const FOLLOW_SPEED = 14;   // lissage du suivi, en 1/s (indépendant du framerate)
const MAX_METRICS = 3;
const WINDOW_DAYS = 7;

interface TrendView {
  metric: Metric;
  value: number | null;       // %/semaine
  series: number[];
  band: [number, number] | undefined;
  dashedFrom: number | undefined;
}

/** Libellés trop longs pour une ligne de carte : forme courte à l'affichage (le libellé complet reste en infobulle). */
const SHORT_LABEL: Record<string, string> = {
  densite_osseuse: 'Densité estimée vs pré-vol',
  gaine_nerf_optique: 'Gaine du nerf optique',
};

/** Libellé affiché d'une métrique : sans parenthèse technique (« (scan hebdo) », « (44) »). */
export function metricLabel(m: Metric, short = false): string {
  return (short ? SHORT_LABEL[m.key] : undefined) ?? m.label.replace(/\s*\([^)]*\)/g, '').trim();
}

/** Ligne de projection (« perte projetée à J860 ») : sortie de modèle sur un jour futur, pas une valeur du jour. */
export const isProjectionMetric = (m: Metric): boolean => m.key.startsWith('projection');

/** Même précision que le panneau Calques : 1 décimale à partir de 10 %, 2 en dessous. */
function valueText(m: Metric): string {
  return m.unit === '%' ? fmt(m.value, Math.abs(m.value) >= 10 ? 1 : 2) : fmt(m.value);
}

function signed(n: number, digits: number): string {
  return `${n < 0 ? '−' : '+'}${fmt(Math.abs(n), digits)}`;
}

/** Seuil appliqué, en clair : « ≥ 95 % », « ≤ 5,5 mm », « 90 – 130 mmHg ». */
function thresholdText(m: Metric): string | null {
  const low = m.ref?.low;
  const high = m.ref?.high;
  if (low !== undefined && high !== undefined) return `${fmt(low)} – ${fmt(high)} ${m.unit}`;
  if (low !== undefined) return `≥ ${fmt(low)} ${m.unit}`;
  if (high !== undefined) return `≤ ${fmt(high)} ${m.unit}`;
  return null;
}

/** Tendance 7 j de la première métrique qui en a une (sinon la première métrique, tendance indisponible). */
function buildTrend(organ: OrganState, day: number, adherence: number): TrendView | null {
  if (organ.metrics.length === 0) return null;
  const withTrend = organ.metrics.map((m) => {
    const t = m.trend7d ?? trend7d(organ.id, m.key, day);
    return { m, t: t !== null && t !== undefined && Number.isFinite(t) ? t : null };
  });
  const pick = withTrend.find((x) => x.t !== null) ?? withTrend[0];
  const metric = pick.m;

  const series: number[] = [];
  let dashedFrom: number | undefined;
  for (let d = Math.max(0, day - (WINDOW_DAYS - 1)); d <= day; d++) {
    const v = scenarioBody(d, adherence).organs.find((o) => o.id === organ.id)?.metrics.find((k) => k.key === metric.key)?.value;
    if (v === undefined || !Number.isFinite(v)) continue;
    if (d > DAY_TODAY && dashedFrom === undefined) dashedFrom = Math.max(0, series.length - 1);
    series.push(v);
  }
  let band: [number, number] | undefined;
  if (metric.noise !== undefined && metric.noise > 0 && series.length > 0) {
    const mean = series.reduce((a, b) => a + b, 0) / series.length;
    band = [mean - metric.noise, mean + metric.noise];
  }
  return { metric, value: pick.t, series, band, dashedFrom };
}

/** Trait coudé ancre → carte : diagonale à 45° puis horizontale (ou verticale puis diagonale si ça ne tient pas). */
function elbow(ax: number, ay: number, cx: number, cy: number): string {
  const dx = cx - ax;
  const dy = cy - ay;
  const sx = Math.sign(dx) || 1;
  const sy = Math.sign(dy) || 1;
  const r = (n: number): string => (Math.round(n) + 0.5).toFixed(1);
  if (Math.abs(dy) <= Math.abs(dx)) {
    return `${r(ax)},${r(ay)} ${r(ax + sx * Math.abs(dy))},${r(cy)} ${r(cx)},${r(cy)}`;
  }
  return `${r(ax)},${r(ay)} ${r(ax)},${r(ay + sy * (Math.abs(dy) - Math.abs(dx)))} ${r(cx)},${r(cy)}`;
}

export function HoverCard(): JSX.Element | null {
  const hovered = useBody((s) => s.hovered);
  const selected = useBody((s) => s.selected);
  const day = useBody((s) => s.day);

  const organId: OrganId | null = hovered ?? selected;
  const pinned = organId !== null && selected === organId;

  const adherence = useBody((s) => s.adherence);
  const organ = useMemo(
    () => (organId === null ? null : scenarioBody(day, adherence).organs.find((o) => o.id === organId) ?? null),
    [organId, day, adherence],
  );
  const trend = useMemo(() => (organ ? buildTrend(organ, day, adherence) : null), [organ, day, adherence]);

  const rootRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<SVGPolylineElement>(null);
  const nodeRef = useRef<SVGCircleElement>(null);

  useEffect(() => {
    if (organId === null) return undefined;
    let raf = 0;
    let px = Number.NaN;       // position lissée de la carte
    let py = Number.NaN;
    let side: 1 | -1 | 0 = 0;  // côté retenu (hystérésis : on ne change pas de côté pour 2 px)
    let last = performance.now();
    let waited = 0;            // frames passées à attendre la première ancre 3D

    const frame = (now: number): void => {
      const dt = Math.min(0.25, Math.max(0, (now - last) / 1000));
      last = now;
      raf = requestAnimationFrame(frame);
      const root = rootRef.current;
      const card = cardRef.current;
      const line = lineRef.current;
      const node = nodeRef.current;
      if (!root || !card || !line || !node) return;
      const W = root.clientWidth;
      const H = root.clientHeight;
      if (W === 0 || H === 0) return;
      const ch = card.offsetHeight;
      const cw = card.offsetWidth || CARD_W;
      const a = screenAnchors.get(organId);
      const anchored = a !== undefined && a.visible && Number.isFinite(a.x) && Number.isFinite(a.y);

      let tx: number;
      let ty: number;
      if (anchored) {
        const roomRight = W - a.x;
        const roomLeft = a.x;
        const plate = plateSides.get(organId);
        if (plate !== undefined) side = plate > 0 ? -1 : 1;   // organe en alerte : la carte va du côté opposé à sa plaque
        else if (side === 0) side = roomRight > roomLeft + SIDE_BIAS ? 1 : -1;
        else if (side === 1 && roomLeft > roomRight - SIDE_BIAS + 80) side = -1;
        else if (side === -1 && roomRight > roomLeft + SIDE_BIAS + 80) side = 1;
        if (plate === undefined && side === -1 && roomLeft < cw + GAP_X / 2 && roomRight > roomLeft) side = 1;   // ne tient pas à gauche
        // hors silhouette : le bord intérieur de la carte reste à CLEAR_M de l'axe du corps (suit le zoom),
        // et jamais à moins de GAP_X de l'ancre — l'organe mis en avant garde son contexte visible.
        const clear = Number.isFinite(bodyAxis.x) && bodyAxis.pxPerM > 0 ? CLEAR_M * bodyAxis.pxPerM : 0;
        tx = side === 1
          ? Math.max(a.x + GAP_X, clear > 0 ? bodyAxis.x + clear : -Infinity)
          : Math.min(a.x - GAP_X, clear > 0 ? bodyAxis.x - clear : Infinity) - cw;
        ty = a.y - RISE - HOOK_Y;
      } else {
        // Ancre absente ou cachée (calque éteint) : carte rangée en haut à gauche, sans trait.
        tx = MARGIN;
        ty = MARGIN_TOP;
      }
      tx = Math.max(MARGIN, Math.min(W - cw - MARGIN, tx));
      ty = Math.max(Math.min(MARGIN_TOP, Math.max(MARGIN, H - ch - MARGIN_BOTTOM)), Math.min(H - ch - MARGIN_BOTTOM, ty));

      // La carte reste invisible tant que l'ancre 3D n'existe pas (sinon elle glisse depuis le coin) ;
      // au-delà de ~20 frames sans ancre (calque éteint), elle se range en haut à gauche.
      if (Number.isNaN(px)) {
        if (!anchored && waited++ < 20) return;
        px = tx; py = ty;
      } else {
        const k = 1 - Math.exp(-dt * FOLLOW_SPEED);
        px += (tx - px) * k; py += (ty - py) * k;
      }
      const x = Math.round(px);
      const y = Math.round(py);
      card.style.transform = `translate(${x}px, ${y}px)`;
      card.style.visibility = 'visible';
      card.dataset.side = side === -1 ? 'left' : 'right';
      hoverCardRect.on = true; hoverCardRect.x = x; hoverCardRect.y = y; hoverCardRect.w = cw; hoverCardRect.h = ch;

      if (anchored) {
        const hx = side === 1 ? x : x + cw;       // point d'accroche sur le bord de la carte
        // l'accroche glisse le long du bord de la carte : le trait reste horizontal tant que l'ancre est à sa hauteur
        const hy = Math.max(y + Math.min(HOOK_Y, ch / 2), Math.min(y + ch - Math.min(HOOK_Y, ch / 2), a.y));
        line.setAttribute('points', elbow(a.x, a.y, hx, hy));
        node.setAttribute('cx', a.x.toFixed(1));
        node.setAttribute('cy', a.y.toFixed(1));
        line.style.display = '';
        node.style.display = '';
      } else {
        line.style.display = 'none';
        node.style.display = 'none';
      }
    };
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); hoverCardRect.on = false; };
  }, [organId]);

  if (organId === null || organ === null) return null;

  const meta = LAYER_META[organ.layer] as { label: string } | undefined;
  const projected = day > DAY_TODAY;
  const unmodeled = organ.metrics.length === 0;
  const gap = organ.bioAge - organ.chronoAge;
  const gapKnown = hasBioAgeModel(organ.id) && Number.isFinite(gap);
  const metrics = organ.metrics.slice(0, MAX_METRICS);
  // Provenance : une seule puce dans l'en-tête si elle est commune ; sinon un mot par ligne de métrique.
  const commonProv = metrics.length > 0 && metrics.every((m) => m.provenance === metrics[0].provenance) ? metrics[0].provenance : null;
  const trendIsFirst = trend !== null && metrics.length > 0 && trend.metric.key === metrics[0].key;
  const style = { '--hvc-status': statusVar[organ.status] } as CSSProperties;
  const open = (): void => useBody.getState().openOrganWindow(organId);

  return (
    <div className="hvc" ref={rootRef} style={style} data-projected={projected} aria-live="polite">
      <svg className="hvc__wire" aria-hidden="true">
        <polyline ref={lineRef} className="hvc__line" fill="none" style={{ display: 'none' }} />
        <circle ref={nodeRef} className="hvc__node" r={NODE_R} data-color={organ.status} style={{ display: 'none' }} />
      </svg>

      <div className="hvc__card" ref={cardRef} style={{ visibility: 'hidden' }}>
        {/* key : rejoue le fondu de 120 ms à chaque changement d'organe */}
        <div className="hvc__in" key={organId}>
          <header className="hvc__head">
            <div className="hvc__title">
              <h3 className="hvc__name">{organ.name}</h3>
              <StatusChip color={organ.status} />
            </div>
            {projected ? <p className="hvc__sub">Projection {fmtDay(day)}</p> : null}
            {meta ? (
              <p className="hvc__sub hvc__sub--row sz-detail">
                {meta.label}
                {commonProv ? <ProvenanceBadge value={commonProv} /> : null}
              </p>
            ) : null}
            {organ.layer === 'squelette' ? (
              <p className="hvc__sub sz-detail">Source : modèle, bilan au sol et marqueurs urinaires (pas le scanner).</p>
            ) : null}
          </header>

          {unmodeled ? (
            <p className="hvc__none">
              Non modélisé<span className="sz-detail"> : aucune mesure pour cet organe, statut inconnu.</span>
            </p>
          ) : (
            <ul className="hvc__metrics">
              {metrics.map((m) => {
                const th = thresholdText(m);
                const proj = isProjectionMetric(m);
                // mode Détails : origine du seuil (norme NASA ou seuil d'équipe), puis la provenance si elle varie d'une ligne à l'autre
                const origin = [
                  th ? (m.ref?.standardId ? `NASA ${m.ref.standardId}` : 'hypothèse d’équipe') : null,
                  commonProv ? null : PROVENANCE_TEXT[m.provenance].toLocaleLowerCase('fr-FR'),
                ].filter(Boolean).join(' · ');
                return (
                  <li className="hvc__m" key={m.key}>
                    <div className="hvc__row">
                      <span className="hvc__k" title={m.label}>{metricLabel(m, true)}</span>
                      {/* une projection n'est pas un statut du jour : jamais de couleur vive */}
                      <span className={`hvc__v${proj ? ' hvc__v--proj' : ''}`} data-color={proj ? undefined : m.color}>
                        {valueText(m)}{m.unit ? <span className="sz-unit"> {m.unit}</span> : null}
                      </span>
                    </div>
                    {th ? (
                      <div className="hvc__note">
                        Seuil {th}{origin ? <span className="sz-detail"> · {origin}</span> : null}
                      </div>
                    ) : origin ? (
                      <div className="hvc__note sz-detail">{origin.charAt(0).toLocaleUpperCase('fr-FR') + origin.slice(1)}</div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}

          <div className="hvc__extra">
            {trend ? (
              <div className="hvc__m">
                <div className="hvc__row hvc__row--mid">
                  <span className="hvc__k">Tendance 7 j</span>
                  <Sparkline
                    values={trend.series}
                    width={56}
                    height={20}
                    dashedFrom={trend.dashedFrom}
                    label={`Tendance sur 7 jours : ${metricLabel(trend.metric)}`}
                  />
                  {trend.value === null ? (
                    <span className="hvc__v hvc__v--none">Indisponible</span>
                  ) : (
                    <span className="hvc__v">{signed(trend.value, 2)}<span className="sz-unit"> %/sem</span></span>
                  )}
                </div>
                {/* rappel de la métrique seulement si la tendance ne porte pas sur la première ligne de la carte */}
                {trendIsFirst ? null : <div className="hvc__note">{metricLabel(trend.metric, true)}</div>}
                {trend.band ? (
                  <div className="hvc__note sz-detail">Bruit de mesure ± {fmt(trend.metric.noise ?? 0)} {trend.metric.unit}</div>
                ) : null}
              </div>
            ) : null}

            <div className="hvc__m">
              <div className="hvc__row">
                <span className="hvc__k" title="Hypothèse de l’équipe : perte cumulée rapportée à la vitesse de vieillissement terrestre">Écart d’âge estimé</span>
                {gapKnown ? (
                  <span className="hvc__v">{signed(gap, 1)}<span className="sz-unit"> ans</span></span>
                ) : (
                  <span className="hvc__v hvc__v--none">Non modélisé</span>
                )}
              </div>
            </div>
          </div>

          {pinned ? (
            <footer className="hvc__foot" onPointerDown={stop} onPointerUp={stop} onClick={stop} onDoubleClick={stop}>
              <button
                type="button"
                className="sz-btn sz-btn--sm"
                onClick={open}
                title="Ouvrir la fenêtre de détail (ou double-clic sur l’organe)"
              >
                Ouvrir le détail
              </button>
            </footer>
          ) : null}
        </div>
      </div>
    </div>
  );
}

const stop = (e: SyntheticEvent): void => e.stopPropagation();
