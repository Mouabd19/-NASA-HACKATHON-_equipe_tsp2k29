// Fenêtre organe : modale centrée sur toute la page Corps, affichée quand useBody.organWindow !== null.
// 3 colonnes : modèle 3D · métriques du jour + synthèse · graphe de l'écart d'âge
// (trait plein = mesuré, pointillé = projection, bande d'incertitude). 'global' → PhenoAge + écart par organe.
// Provenance, normes, prévision du modèle d'IA, formule et limites : visibles en mode Détails seulement,
// une seule fois par bloc (une puce dans l'en-tête de section, pas une par ligne).
import { useEffect, useMemo, useRef } from 'react';
import type { CSSProperties, JSX, ReactNode } from 'react';
import {
  Area, CartesianGrid, ComposedChart, Line, ReferenceDot, ReferenceLine,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import type { BioAgePoint, Metric, OrganId, OrganState, PhenoAgeResult, Tag } from '../../../types';
import { CHRONO_AGE_J0, DAY_END, DAY_SOL0, DAY_TODAY } from '../../../mocks/mission';
import { getAnalyteMeta, getBloodTests, getDayBodyPlan } from '../../../sim/load';
import { bioAgeSeries, hasBioAgeModel } from '../../../models/bioAge';
import { phenoAge } from '../../../models/phenoAge';
import { lossToYears } from '../../../models/agingRates';
import { organForecast, type Forecast, type ForecastOrgan } from '../../../models/ml';
import { SUMMARY_SOURCE, getSummaryPlan } from '../../../content/summaries';
import { lightTimeMin, lightTimeSource } from '../../../content/horizons';
import {
  CloseButton, ProvenanceBadge, StatusChip, StatusDot, TAG_TEXT, dayToDate, fmt, fmtDay, sentenceCase, statusVar, tokens,
} from '../../../ui';
import { usePrefs } from '../../../ui/prefs';
import { OrganViewer } from '../../../three/OrganViewer';
import { useBody } from '../store';
import { isProjectionMetric, metricLabel } from './HoverCard';
import './OrganWindow.css';

// ── Réglages du graphe (itération rapide) ────────────────────────────────────────────────────
const C = tokens.color;
const CHART = {
  measured: { stroke: C.text, width: 1.5 },
  /** Scénario mis en avant / scénario en retrait. */
  on: { stroke: C.text, width: 1.5, opacity: 1, dash: '5 4', band: 0.14 },
  off: { stroke: C.textDim, width: 1.25, opacity: 0.9, dash: '2 4', band: 0.06 },
  measuredBand: 0.2,
  chrono: { stroke: C.textMuted, width: 1, opacity: 1 },
  grid: C.border,
  axis: C.textMuted,
  /** Repères verticaux (aujourd'hui, Sol 0, jour affiché). */
  mark: C.borderStrong,
  font: tokens.size.xs,
  /** Heure UTC d'émission de la synthèse par le sol (donnée du scénario). */
  groundEmitMin: 6 * 60,
} as const;

const YEAR = 365.25;
const chronoAt = (day: number): number => CHRONO_AGE_J0 + day / YEAR;
const signed = (n: number, digits = 1): string => `${n < 0 ? '−' : '+'}${fmt(Math.abs(n), digits)}`;
const DATE_FMT = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
/** « 2026-11-14 » → « 14 nov. 2026 ». */
const fmtDate = (iso: string): string => {
  const t = Date.parse(`${iso}T00:00:00Z`);
  return Number.isFinite(t) ? DATE_FMT.format(t) : iso;
};
const hhmm = (min: number): string => {
  const m = ((Math.round(min) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};

// ── Données du graphe ────────────────────────────────────────────────────────────────────────
interface Row {
  day: number;
  chrono: number;
  meas?: number;
  bandMeas?: [number, number];
  p0?: number;
  p1?: number;
  band0?: [number, number];
  band1?: [number, number];
}

/** Modèle d'IA B (régression quantile) : perte p10/p50/p90 à Sol 0 et en fin de mission, convertie en âge équivalent. */
interface MlPoint { day: number; f: Forecast; lo: number; mid: number; hi: number }
const ML_ORGANS = new Set<OrganId>(['hanche', 'cuisse', 'coeur']);
const ML_DAYS = [DAY_SOL0, DAY_END] as const;

function mlPoints(organId: OrganId, adherence: 0 | 1): MlPoint[] {
  if (!ML_ORGANS.has(organId)) return [];
  const out: MlPoint[] = [];
  for (const day of ML_DAYS) {
    if (day !== 210 && day !== 860) continue;
    const f = organForecast(organId as ForecastOrgan, day, adherence);
    const y = (loss: number): number | null => { const v = lossToYears(organId, loss); return v === null ? null : chronoAt(day) + v; };
    const [lo, mid, hi] = f ? [y(f.p10), y(f.p50), y(f.p90)] : [null, null, null];
    if (f && lo !== null && mid !== null && hi !== null) out.push({ day, f, lo, mid, hi });
  }
  return out;
}

interface GapChart {
  rows: Row[];
  ml: [MlPoint[], MlPoint[]];   // modèle d'IA B, rythme actuel / avec le plan
  modeled: boolean;
  hasPrediction: boolean;
  splitDay: number;
  end: [number | null, number | null];   // écart en fin de mission, rythme actuel / avec le plan
  endPoint: [BioAgePoint | null, BioAgePoint | null];
  domain: [number, number];
  yTicks: number[];
}

/**
 * Axe Y à pas CONSTANT (1, 2 ou 5 ans) : bornes arrondies au pas, graduations régulières.
 * Pas de marge ajoutée avant l'arrondi (elle faisait franchir une graduation et vidait le haut du tracé) :
 * une graduation de plus seulement si la courbe touche presque la borne haute.
 */
function niceAxis(lo: number, hi: number): { domain: [number, number]; yTicks: number[] } {
  const span = Math.max(1, hi - lo);
  const step = span <= 6 ? 1 : span <= 12 ? 2 : 5;
  const y0 = Math.floor(lo / step) * step;
  let y1 = Math.ceil(hi / step) * step;
  if (y1 - hi < 0.15 * step) y1 += step;
  const yTicks: number[] = [];
  for (let v = y0; v <= y1 + 1e-9; v += step) yTicks.push(v);
  return { domain: [y0, y1], yTicks };
}

function buildGapChart(organId: OrganId, withMl: boolean): GapChart {
  const s0 = bioAgeSeries(organId, 0);
  const s1 = bioAgeSeries(organId, 1);
  const modeled = s0.some((p) => p.band !== undefined);
  let split = -1;
  s0.forEach((p, i) => { if (!p.predicted) split = i; });
  const hasPrediction = s0.some((p) => p.predicted);
  const splitDay = split >= 0 ? s0[split].day : -1;
  const plan = new Map(s1.map((p) => [p.day, p]));
  const ml: [MlPoint[], MlPoint[]] = withMl ? [mlPoints(organId, 0), mlPoints(organId, 1)] : [[], []];

  let lo = Infinity;
  let hi = -Infinity;
  const see = (...v: number[]): void => { for (const x of v) { lo = Math.min(lo, x); hi = Math.max(hi, x); } };

  const rows = s0.map((p, i): Row => {
    const row: Row = { day: p.day, chrono: chronoAt(p.day) };
    see(row.chrono, p.bioAge, ...(p.band ?? []));
    if (i <= split) {
      row.meas = p.bioAge;
      if (p.band) row.bandMeas = p.band;
    }
    if (i >= split && hasPrediction) {
      // le dernier point mesuré appartient aussi aux séries prédites : le trait reste continu
      row.p0 = p.bioAge;
      if (p.band) row.band0 = p.band;
      const q = i === split ? p : plan.get(p.day);
      if (q) {
        row.p1 = q.bioAge;
        if (q.band) row.band1 = q.band;
        see(q.bioAge, ...(q.band ?? []));
      }
    }
    return row;
  });

  for (const m of [...ml[0], ...ml[1]]) see(m.lo, m.hi);

  const last0 = s0.length ? s0[s0.length - 1] : null;
  const last1 = s1.length ? s1[s1.length - 1] : null;
  const gap = (p: BioAgePoint | null): number | null => (p && modeled ? p.bioAge - chronoAt(p.day) : null);
  if (!Number.isFinite(lo)) { lo = CHRONO_AGE_J0; hi = CHRONO_AGE_J0 + 1; }
  return {
    rows, ml, modeled, hasPrediction, splitDay,
    end: [gap(last0), gap(last1)],
    endPoint: [last0, last1],
    ...niceAxis(lo, hi),
  };
}

interface PhenoRow { day: number; chrono: number; pheno: number }

function buildPhenoRows(): PhenoRow[] {
  const days = [...new Set(getBloodTests().map((t) => t.day))].filter((d) => d <= DAY_TODAY).sort((a, b) => a - b);
  const rows: PhenoRow[] = [];
  for (const d of days) {
    const r = phenoAge(d);
    if (r && r.day === d && !rows.some((x) => x.day === d)) rows.push({ day: d, chrono: chronoAt(d), pheno: r.phenoAge });
  }
  return rows;
}

// ── Petites pièces ───────────────────────────────────────────────────────────────────────────
function Sect({ title, right, children, className }: { title: ReactNode; right?: ReactNode; children: ReactNode; className?: string }): JSX.Element {
  return (
    <section className={`ow__sect${className ? ` ${className}` : ''}`}>
      <header className="ow__sect-head">
        <h3 className="sz-section-title">{title}</h3>
        {right ? <span className="ow__sect-right">{right}</span> : null}
      </header>
      {children}
    </section>
  );
}

function refText(m: Metric): string {
  const lo = m.ref?.low;
  const hi = m.ref?.high;
  if (lo !== undefined && hi !== undefined) return `${fmt(lo)} – ${fmt(hi)}`;
  if (lo !== undefined) return `≥ ${fmt(lo)}`;
  if (hi !== undefined) return `≤ ${fmt(hi)}`;
  return '—';
}

const capFirst = (s: string): string => s.charAt(0).toLocaleUpperCase('fr-FR') + s.slice(1);

/** Métriques affichées : arrivé au dernier jour, « perte projetée à J860 » doublerait la perte cumulée du jour. */
const shownMetrics = (organ: OrganState, day: number): Metric[] =>
  organ.metrics.filter((m) => !(day >= DAY_END && isProjectionMetric(m)));

function MetricsTable({ organ, day }: { organ: OrganState; day: number }): JSX.Element {
  // Os : rien n'est mesuré par le scanner — la « pente » est celle du modèle, pas une pente mesurée.
  const modelOnly = organ.layer === 'squelette';
  const rows = shownMetrics(organ, day);
  if (rows.length === 0) {
    return <p className="ow__empty">Aucune mesure ni modèle pour cet organe.</p>;
  }
  // l'étiquette d'une valeur n'est écrite par ligne que si elle varie d'une ligne à l'autre
  const sameTag = rows.every((m) => m.tag === rows[0].tag);
  return (
    <table className="sz-table ow__table">
      <thead>
        <tr>
          <th>Métrique</th>
          <th data-num>Valeur</th>
          <th aria-hidden="true" />
          <th data-num>Seuil</th>
          <th data-num title={modelOnly ? 'Pente du modèle sur 7 jours, pas une tendance mesurée' : 'Pente mesurée sur 7 jours'}>Pente <span className="sz-unit">%/sem</span></th>
        </tr>
      </thead>
      <tbody>
        {rows.map((m) => {
          const t = m.trend7d;   // pas de repli : une métrique sans tendance (cumul, projection) affiche « — »
          const proj = isProjectionMetric(m);
          const hasRef = m.ref?.low !== undefined || m.ref?.high !== undefined;
          // mode Détails : une seule ligne de texte sous le libellé, avec ce qui est propre à la ligne
          // (source si elle varie, bruit de mesure, origine du seuil) ; les colonnes de chiffres restent sur une ligne
          const detail = [
            sameTag ? null : TAG_TEXT[m.tag],
            m.noise !== undefined ? `± ${fmt(m.noise)}${m.unit ? ` ${m.unit}` : ''}` : null,
            hasRef ? (m.ref?.standardId ? `seuil NASA ${m.ref.standardId}` : m.tag === 'H' ? null : 'seuil d’équipe') : null,
          ].filter(Boolean).join(' · ');
          return (
            <tr key={m.key} data-proj={proj}>
              <td>
                <span className="ow__metric">
                  <StatusDot color={proj ? 'grey' : m.color} />
                  <span className="ow__metric-text">
                    <span className="ow__metric-label" title={sentenceCase(m.label)}>{sentenceCase(metricLabel(m))}</span>
                    {detail ? <span className="ow__meta sz-detail">{capFirst(detail)}</span> : null}
                  </span>
                </span>
              </td>
              <td data-num>
                <span className="ow__val" style={{ '--ow-status': proj ? 'var(--sz-text-dim)' : m.color === 'green' || m.color === 'grey' ? 'var(--sz-text)' : statusVar[m.color] } as CSSProperties}>
                  {fmt(m.value)}
                </span>
              </td>
              <td className="ow__unit-cell">{m.unit ? <span className="sz-unit">{m.unit}</span> : null}</td>
              <td data-num>
                <span className={hasRef ? undefined : 'sz-muted'}>{refText(m)}</span>
              </td>
              <td data-num>
                {t === null || t === undefined || !Number.isFinite(t)
                  ? <span className="sz-muted">—</span>
                  : signed(t, 2)}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/**
 * Texte de synthèse (rédigé au sol) → affichage sobre : aucun crochet, aucune capitale de code.
 * La norme citée (« [V1 4027] ») n'apparaît qu'en mode Détails, entre parenthèses.
 */
function SynthText({ text }: { text: string }): JSX.Element {
  const clean = text
    .replace(/\s*\[(?:H|Persona|Publié|Simulé)\]/gi, '')
    .replace(/\s*(?:→|->)\s*(ROUGE|AMBRE|ORANGE|VERT)\b/g, (_m, w: string) => ` : ${w.toLocaleLowerCase('fr-FR')}`)
    .replace(/\bENSUITE\b/g, 'Ensuite')
    .replace(/\bMAINTENANT\b/g, 'Maintenant');
  const parts = clean.split(/\s*\[(V\d[^\]]*)\]/g);   // indices impairs : identifiants de norme
  return (
    <p className="ow__synth-text">
      {parts.map((p, i) => (i % 2 === 0 ? p : <span key={i} className="sz-detail"> (NASA {p})</span>))}
    </p>
  );
}

function Synthesis({ organId, day, hideEmpty }: { organId: OrganId; day: number; hideEmpty?: boolean }): JSX.Element | null {
  const adherence = useBody((s) => s.adherence);
  const summary = useMemo(() => getSummaryPlan(organId, day, adherence), [organId, day, adherence]);
  const date = dayToDate(summary?.day ?? day);
  const delay = useMemo(() => lightTimeMin(date), [date]);
  const delayExact = useMemo(() => lightTimeSource(date) === 'table', [date]);
  const isTemplate = SUMMARY_SOURCE === 'gabarit';
  const future = summary !== null && summary.day > DAY_TODAY;
  if (!summary && hideEmpty) return null;
  return (
    <Sect
      className="ow__synth"
      title={isTemplate ? 'Synthèse' : 'Synthèse IA'}
      right={summary ? (
        <>
          <span className="ow__pill">À valider par le médecin de bord</span>
          <ProvenanceBadge value={future ? 'H' : 'SIMULÉ'} />
        </>
      ) : null}
    >
      {summary ? (
        <>
          <SynthText text={summary.text} />
          {future ? (
            <p className="ow__note sz-detail">Projection, pas un message reçu. Jamais utilisée pour un seuil.</p>
          ) : (
            <p className="ow__note">
              {summary.day !== day ? `Synthèse du ${fmtDay(summary.day)}, reçue` : 'Reçue'} à {hhmm(CHART.groundEmitMin + delay)} · délai{' '}
              {delayExact ? '' : '≈ '}{fmt(delay, 0)} min
              <span className="sz-detail"> · générée au sol, jamais utilisée pour un seuil</span>
            </p>
          )}
        </>
      ) : (
        <p className="ow__empty">Pas de synthèse pour cet organe.</p>
      )}
    </Sect>
  );
}

// ── Graphe ───────────────────────────────────────────────────────────────────────────────────
const tickStyle = { fontFamily: tokens.font.text, fontSize: CHART.font, fill: CHART.axis, fontVariantNumeric: 'tabular-nums' };

/** Petite étiquette horizontale en haut d'un repère vertical ; `row` décale d'une ligne pour éviter les chevauchements. */
function markLabel(text: string, row = 0, side: 'right' | 'left' = 'right') {
  return function MarkLabel(props: { viewBox?: { x?: number; y?: number } }): JSX.Element {
    const x = (props.viewBox?.x ?? 0) + (side === 'right' ? 5 : -5);
    const y = (props.viewBox?.y ?? 0) + 10 + row * 14;
    return <text x={x} y={y} textAnchor={side === 'right' ? 'start' : 'end'} style={tickStyle}>{text}</text>;
  };
}

function endLabel(text: string, fill: string, dy: number) {
  return function EndLabel(props: { viewBox?: { x?: number; y?: number; width?: number; height?: number } }): JSX.Element {
    const vb = props.viewBox ?? {};
    const x = (vb.x ?? 0) + (vb.width ?? 0) / 2 - 6;
    const y = (vb.y ?? 0) + (vb.height ?? 0) / 2 + dy;
    return <text x={x} y={y} textAnchor="end" style={{ ...tickStyle, fill }}>{text}</text>;
  };
}

interface TipProps { active?: boolean; payload?: ReadonlyArray<{ payload?: Row | PhenoRow }> }

function TipRow({ label, value, chrono, band }: { label: string; value: number; chrono?: number; band?: [number, number] }): JSX.Element {
  return (
    <div className="ow__tip-row">
      <span className="sz-dim">{label}</span>
      <span>
        {fmt(value, 1)} ans{chrono !== undefined ? <span className="sz-dim"> ({signed(value - chrono)})</span> : null}
        {band ? <span className="ow__tip-band sz-muted">{fmt(band[0], 1)} – {fmt(band[1], 1)}</span> : null}
      </span>
    </div>
  );
}

function GapTip({ active, payload }: TipProps): JSX.Element | null {
  const r = payload?.[0]?.payload as Row | undefined;
  if (!active || !r) return null;
  const predicted = r.meas === undefined;
  return (
    <div className="ow__tip">
      <div className="ow__tip-head">{fmtDay(r.day)} · {predicted ? 'prédit' : 'mesuré'}</div>
      {r.meas !== undefined ? <TipRow label="Mesuré" value={r.meas} chrono={r.chrono} band={r.bandMeas} /> : null}
      {predicted && r.p0 !== undefined ? <TipRow label="Rythme actuel" value={r.p0} chrono={r.chrono} band={r.band0} /> : null}
      {predicted && r.p1 !== undefined ? <TipRow label="Avec le plan" value={r.p1} chrono={r.chrono} band={r.band1} /> : null}
      <TipRow label="Âge réel" value={r.chrono} />
    </div>
  );
}

function PhenoTip({ active, payload }: TipProps): JSX.Element | null {
  const r = payload?.[0]?.payload as PhenoRow | undefined;
  if (!active || !r) return null;
  return (
    <div className="ow__tip">
      <div className="ow__tip-head">{fmtDay(r.day)} · prélèvement</div>
      <TipRow label="PhenoAge" value={r.pheno} chrono={r.chrono} />
      <TipRow label="Âge réel" value={r.chrono} />
    </div>
  );
}

const CHART_MARGIN = { top: 8, right: 16, bottom: 0, left: 0 };

function GapChartView({ chart, day, adherence }: { chart: GapChart; day: number; adherence: 0 | 1 }): JSX.Element {
  const s = [adherence === 0 ? CHART.on : CHART.off, adherence === 1 ? CHART.on : CHART.off] as const;
  // pas de repère du jour au dernier jour : l'axe se termine là, les fins de courbe y sont déjà
  const showDay = day !== DAY_TODAY && day !== DAY_SOL0 && day < DAY_END;
  const xTicks = [0, DAY_TODAY, DAY_SOL0, DAY_END];
  const [e0, e1] = chart.endPoint;
  const split = chart.rows.find((r) => r.day === chart.splitDay);
  // Étiquettes de fin posées juste au-dessus de leur courbe (qui monte : le texte, à gauche du point, ne la touche pas).
  // Si les deux fins de courbe sont trop proches, celle du plan passe dessous.
  const apart = e0 && e1 ? (e0.bioAge - e1.bioAge) / Math.max(1e-6, chart.domain[1] - chart.domain[0]) : 1;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={chart.rows} margin={CHART_MARGIN}>
        <CartesianGrid stroke={CHART.grid} vertical={false} />
        <XAxis
          dataKey="day" type="number" domain={[0, DAY_END]} ticks={xTicks} tick={tickStyle} interval={0}
          tickFormatter={(d: number) => fmtDay(d)} tickLine={false} axisLine={{ stroke: CHART.grid }} height={22}
        />
        <YAxis
          type="number" domain={chart.domain} ticks={chart.yTicks} interval={0} tick={tickStyle} width={30} allowDecimals={false}
          tickFormatter={(v: number) => fmt(v, 0)} tickLine={false} axisLine={false}
        />

        {/* bandes d'incertitude */}
        <Area dataKey="bandMeas" stroke="none" fill={C.text} fillOpacity={CHART.measuredBand} isAnimationActive={false} activeDot={false} connectNulls={false} />
        <Area dataKey="band0" stroke="none" fill={C.text} fillOpacity={s[0].band} isAnimationActive={false} activeDot={false} />
        <Area dataKey="band1" stroke="none" fill={C.text} fillOpacity={s[1].band} isAnimationActive={false} activeDot={false} />

        {/* âge réel */}
        <Line dataKey="chrono" stroke={CHART.chrono.stroke} strokeWidth={CHART.chrono.width} strokeOpacity={CHART.chrono.opacity} dot={false} activeDot={false} isAnimationActive={false} />

        {/* repères verticaux */}
        <ReferenceLine x={DAY_TODAY} stroke={CHART.mark} strokeWidth={1} label={markLabel('Aujourd’hui', 0)} />
        <ReferenceLine x={DAY_SOL0} stroke={CHART.mark} strokeWidth={1} strokeDasharray="2 3" label={markLabel('Sol 0', 1)} />
        {showDay ? (
          /* en fin d'axe, l'étiquette recouvrirait celles de fin de courbe : le jour est déjà dans l'en-tête */
          <ReferenceLine
            x={day} stroke={C.textDim} strokeWidth={1}
            label={day > DAY_END * 0.86 ? undefined : markLabel(fmtDay(day), 2, day > DAY_END * 0.5 ? 'left' : 'right')}
          />
        ) : null}

        {/* projection = pointillé ; mesuré = plein ; les étiquettes de fin sont ancrées sur leur courbe */}
        <Line dataKey="p1" stroke={s[1].stroke} strokeWidth={s[1].width} strokeOpacity={s[1].opacity} strokeDasharray={s[1].dash} strokeLinecap="butt" dot={false} activeDot={false} isAnimationActive={false} />
        <Line dataKey="p0" stroke={s[0].stroke} strokeWidth={s[0].width} strokeOpacity={s[0].opacity} strokeDasharray={s[0].dash} strokeLinecap="butt" dot={false} activeDot={false} isAnimationActive={false} />
        <Line dataKey="meas" stroke={CHART.measured.stroke} strokeWidth={CHART.measured.width} dot={false} activeDot={false} isAnimationActive={false} />

        {chart.hasPrediction && chart.modeled && e0 ? (
          <ReferenceDot x={e0.day} y={e0.bioAge} r={0} fill="none" stroke="none" label={endLabel('Rythme actuel', s[0].stroke, -11)} />
        ) : null}
        {chart.hasPrediction && chart.modeled && e1 ? (
          <ReferenceDot x={e1.day} y={e1.bioAge} r={0} fill="none" stroke="none" label={endLabel('Avec le plan', s[1].stroke, apart >= 0.1 ? -11 : 16)} />
        ) : null}

        {chart.modeled && chart.splitDay >= 0 && split ? (
          <ReferenceDot x={split.day} y={split.meas ?? split.chrono} r={2.5} fill={C.text} stroke={C.inset} strokeWidth={1} />
        ) : null}

        {/* modèle d'IA B (mode Détails seulement : une seule prévision par défaut) : barre p10–p90 et médiane, scénario affiché */}
        {chart.modeled ? chart.ml[adherence].map((m) => (
          <ReferenceLine
            key={`ml-${m.day}`} ifOverflow="extendDomain" stroke={C.textDim} strokeWidth={2}
            segment={[{ x: m.day, y: m.lo }, { x: m.day, y: m.hi }]}
          />
        )) : null}
        {chart.modeled ? chart.ml[adherence].map((m) => (
          <ReferenceDot key={`ml-mid-${m.day}`} x={m.day} y={m.mid} r={2.5} fill={C.textDim} stroke={C.inset} strokeWidth={1} />
        )) : null}

        <Tooltip content={<GapTip />} cursor={{ stroke: C.borderStrong, strokeWidth: 1 }} isAnimationActive={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

function PhenoChartView({ rows, usedDay }: { rows: PhenoRow[]; usedDay: number | null }): JSX.Element {
  let lo = Infinity;
  let hi = -Infinity;
  for (const r of rows) { lo = Math.min(lo, r.pheno, r.chrono); hi = Math.max(hi, r.pheno, r.chrono); }
  if (!Number.isFinite(lo)) { lo = CHRONO_AGE_J0; hi = CHRONO_AGE_J0 + 1; }
  const { domain, yTicks } = niceAxis(lo, hi);
  const ticks = [0, 28, 56, 84].filter((d) => d < DAY_TODAY - 6).concat(DAY_TODAY);
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={rows} margin={CHART_MARGIN}>
        <CartesianGrid stroke={CHART.grid} vertical={false} />
        <XAxis
          dataKey="day" type="number" domain={[0, DAY_TODAY]} ticks={ticks} tick={tickStyle} interval={0}
          tickFormatter={(d: number) => fmtDay(d)} tickLine={false} axisLine={{ stroke: CHART.grid }} height={22}
        />
        <YAxis
          type="number" domain={domain} ticks={yTicks} interval={0} tick={tickStyle} width={30} allowDecimals={false}
          tickFormatter={(v: number) => fmt(v, 0)} tickLine={false} axisLine={false}
        />
        <Line dataKey="chrono" stroke={CHART.chrono.stroke} strokeWidth={CHART.chrono.width} strokeOpacity={CHART.chrono.opacity} dot={false} activeDot={false} isAnimationActive={false} />
        {usedDay !== null ? (
          <ReferenceLine x={usedDay} stroke={CHART.mark} strokeWidth={1} label={markLabel(`Prélèvement ${fmtDay(usedDay)}`, 0, 'left')} />
        ) : null}
        <Line
          dataKey="pheno" stroke={CHART.measured.stroke} strokeWidth={CHART.measured.width} isAnimationActive={false}
          dot={{ r: 2, fill: C.inset, stroke: C.text, strokeWidth: 1 }} activeDot={{ r: 3, fill: C.text, stroke: C.inset }}
        />
        <Tooltip content={<PhenoTip />} cursor={{ stroke: C.borderStrong, strokeWidth: 1 }} isAnimationActive={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

function Legend({ pheno, ml }: { pheno?: boolean; ml?: boolean }): JSX.Element {
  return (
    <ul className="ow__legend">
      <li><i className="ow__key ow__key--solid" />{pheno ? 'PhenoAge' : 'Mesuré'}</li>
      {pheno ? null : <li><i className="ow__key ow__key--dash" />Projection</li>}
      {pheno ? null : <li><i className="ow__key ow__key--band" />Incertitude</li>}
      {ml ? <li title="Modèle d’IA : médiane et intervalle P10–P90"><i className="ow__key ow__key--ml" />Prévision IA, P10–P90</li> : null}
      <li><i className="ow__key ow__key--thin" />Âge réel</li>
    </ul>
  );
}

// ── Colonnes ─────────────────────────────────────────────────────────────────────────────────
function OrganRight({ organ, day }: { organ: OrganState; day: number }): JSX.Element {
  const adherence = useBody((s) => s.adherence);
  const setAdherence = useBody((s) => s.setAdherence);
  // la prévision du modèle d'IA double la projection : elle n'entre dans le graphe (et dans l'échelle) qu'en mode Détails
  const details = usePrefs((s) => s.details);
  const chart = useMemo(() => buildGapChart(organ.id, details), [organ.id, details]);
  const hasMl = chart.modeled && chart.ml[adherence].length > 0;
  const btn = (a: 0 | 1, label: string): JSX.Element => {
    const v = chart.end[a];
    return (
      <button
        type="button" className="ow__scn" aria-pressed={adherence === a}
        disabled={!chart.modeled} onClick={() => setAdherence(a)}
      >
        <span className="ow__scn-top">
          <i className={`ow__key ${adherence === a ? 'ow__key--dash' : 'ow__key--dash-off'}`} />
          {label}
        </span>
        <span className="ow__stat-val">
          <span className="sz-value">{v === null ? '—' : signed(v)}</span>
          {v === null ? null : <span className="sz-unit">ans</span>}
        </span>
      </button>
    );
  };
  return (
    <div className="ow__right">
      <Sect
        title="Écart d’âge en fin de mission"
        right={<><span>{fmtDay(DAY_END)}</span><ProvenanceBadge value="H" /></>}
      >
        <div className="ow__scns" role="group" aria-label="Scénario">
          {btn(0, 'Rythme actuel')}
          {btn(1, 'Avec le plan')}
        </div>
        <div className="ow__plot">
          <span className="ow__axis-title">Âge équivalent (ans)</span>
          <div className="ow__chart">
            <GapChartView chart={chart} day={day} adherence={adherence} />
            {chart.modeled ? null : <div className="ow__chart-veil">Écart d’âge non modélisé</div>}
          </div>
        </div>
        <Legend ml={hasMl} />
      </Sect>
      <div className="ow__notes sz-detail">
        {hasMl ? (
          <p>
            Modèle IA B, {chart.ml[adherence][0].f.unit} :{' '}
            {chart.ml[adherence].map((m, i) => (
              <span key={m.day}>
                {i > 0 ? ' · ' : ''}{m.day === DAY_SOL0 ? 'Sol 0' : fmtDay(m.day)} {fmt(m.f.p50, 1)} ({fmt(m.f.p10, 1)} – {fmt(m.f.p90, 1)})
              </span>
            ))}
          </p>
        ) : null}
        <p>Âge équivalent = âge réel + perte cumulée (%) ÷ vitesse de vieillissement terrestre (%/an).</p>
        <p>Équivalent en années, pas un vieillissement réel : la perte spatiale est en partie réversible au retour.</p>
      </div>
    </div>
  );
}

function GlobalRight({ result }: { result: PhenoAgeResult | null }): JSX.Element {
  const rows = useMemo(buildPhenoRows, []);
  return (
    <div className="ow__right">
      <Sect
        title="PhenoAge dans le temps"
      >
        <div className="ow__plot">
          <span className="ow__axis-title">Âge (ans)</span>
          <div className="ow__chart">
            <PhenoChartView rows={rows} usedDay={result?.day ?? null} />
          </div>
        </div>
        <Legend pheno />
      </Sect>
      <div className="ow__notes sz-detail">
        <p>Un point par prélèvement hebdomadaire, sans projection.</p>
      </div>
    </div>
  );
}

function OrganCentre({ organ, day }: { organ: OrganState; day: number }): JSX.Element {
  const bone = organ.layer === 'squelette';
  const rows = shownMetrics(organ, day);
  // provenance commune à toutes les lignes : une seule puce, dans l'en-tête de section
  const prov = rows.length > 0 && rows.every((m) => m.provenance === rows[0].provenance) ? rows[0].provenance : null;
  const title = day > DAY_TODAY ? `Projection à ${fmtDay(day)}` : bone ? 'Estimations du jour' : 'Métriques du jour';
  return (
    <div className="ow__centre sz-scroll">
      <Sect title={title} right={prov ? <ProvenanceBadge value={prov} /> : null}>
        <MetricsTable organ={organ} day={day} />
        {bone ? (
          <p className="ow__note">
            Densité osseuse estimée par modèle, non mesurée par le scanner.
            <span className="sz-detail"> Source : modèle, bilan au sol et marqueurs urinaires.</span>
          </p>
        ) : null}
      </Sect>
      <Synthesis organId={organ.id} day={day} />
    </div>
  );
}

/** Un seul chiffre principal par bloc : les autres passent `dim` (en retrait). */
function Stat({ label, value, dim }: { label: string; value: string; dim?: boolean }): JSX.Element {
  return (
    <div className="ow__stat">
      <span className="sz-label">{label}</span>
      <span className="ow__stat-val">
        <span className={`sz-value${dim ? ' sz-dim' : ''}`}>{value}</span>
        <span className="sz-unit">ans</span>
      </span>
    </div>
  );
}

/** Écart d'âge par organe (colonne de gauche de « Corps entier ») : une ligne par organe, ouvre sa fenêtre. */
function OrganGaps({ organs }: { organs: OrganState[] }): JSX.Element {
  const openOrganWindow = useBody((s) => s.openOrganWindow);
  return (
    <Sect className="ow__gaps" title="Écart d’âge par organe" right={<ProvenanceBadge value="H" />}>
      <ul className="ow__organs sz-scroll">
        {organs.map((o) => {
          const modeled = hasBioAgeModel(o.id);
          return (
            <li key={o.id}>
              <button type="button" className="ow__organ" onClick={() => openOrganWindow(o.id)}>
                <StatusDot color={o.status} />
                <span className="ow__organ-name">{sentenceCase(o.name.replace(/\s*\(non modélisé\)\s*$/i, ''))}</span>
                {/* « a un modèle d'écart d'âge » vient du modèle, pas de la couleur : sans modèle, jamais « +0,0 » */}
                {modeled
                  ? <span className="ow__organ-val">{signed(o.bioAge - o.chronoAge)}<span className="sz-unit ow__unit">ans</span></span>
                  : <span className="ow__organ-val sz-muted">Non modélisé</span>}
              </button>
            </li>
          );
        })}
      </ul>
    </Sect>
  );
}

function GlobalCentre({ result, day }: { result: PhenoAgeResult | null; day: number }): JSX.Element {
  const tests = useMemo(() => (result ? getBloodTests().filter((t) => t.day === result.day) : []), [result]);
  const inputs = result ? Object.entries(result.inputs) : [];
  const tagOf = (key: string): Tag => (key === 'age' ? 'Persona' : tests.find((t) => t.analyte === key)?.tag ?? 'Persona');
  // source commune à toutes les lignes : dite une fois (puce de l'en-tête), sinon par ligne
  const sameTag = inputs.every(([key]) => tagOf(key) === tagOf(inputs[0][0]));
  return (
    <div className="ow__centre ow__centre--fixed">
      <Sect
        title="Âge biologique (PhenoAge)"
        right={(
          <>
            {result?.mock ? <span className="ow__pill sz-detail">Valeur provisoire</span> : null}
            <span className="sz-detail">Levine et al., 2018</span>
          </>
        )}
      >
        {result ? (
          <>
            <div className="ow__stats">
              <Stat label="Écart" value={signed(result.phenoAge - result.chronoAge)} />
              <Stat label="PhenoAge" value={fmt(result.phenoAge, 1)} dim />
              <Stat label="Âge réel" value={fmt(result.chronoAge, 1)} dim />
            </div>
            <p className="ow__note">
              Prélèvement du {fmtDay(result.day)}{day !== result.day ? `, dernier disponible à ${fmtDay(day)}` : ''}.
            </p>
          </>
        ) : (
          <p className="ow__empty">Aucun prélèvement : données insuffisantes.</p>
        )}
      </Sect>
      <Synthesis organId="global" day={day} hideEmpty />
      {result ? (
        <Sect className="ow__sect--fill" title="Marqueurs utilisés" right={<ProvenanceBadge value="SIMULÉ" />}>
          {/* seul contenu qui défile dans la fenêtre : l'en-tête du tableau reste en place */}
          <div className="ow__scroll sz-scroll">
            <table className="sz-table ow__table ow__table--dense">
              <thead>
                <tr><th>Marqueur</th><th data-num>Valeur</th><th aria-hidden="true" /><th data-num>Référence</th></tr>
              </thead>
              <tbody>
                {inputs.map(([key, value]) => {
                  const meta = getAnalyteMeta(key);
                  const test = tests.find((t) => t.analyte === key);
                  const isAge = key === 'age';
                  const out = test ? value < test.refLow || value > test.refHigh : false;
                  const unit = isAge ? 'ans' : test?.unit ?? meta?.unit ?? '';
                  const ref = test ? `${fmt(test.refLow)} – ${fmt(test.refHigh)}` : meta ? `${fmt(meta.refLow)} – ${fmt(meta.refHigh)}` : null;
                  return (
                    <tr key={key}>
                      <td>
                        {isAge ? 'Âge réel' : meta?.label ?? key}
                        {sameTag ? null : <span className="ow__meta ow__meta--inline sz-detail">{TAG_TEXT[tagOf(key)]}</span>}
                      </td>
                      <td data-num>
                        <span className="ow__val" style={{ '--ow-status': out ? 'var(--sz-amber)' : 'var(--sz-text)' } as CSSProperties}>
                          {fmt(value, meta?.digits)}
                        </span>
                      </td>
                      <td className="ow__unit-cell">{unit ? <span className="sz-unit">{unit}</span> : null}</td>
                      <td data-num>{ref ?? <span className="sz-muted">—</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Sect>
      ) : null}
    </div>
  );
}

// ── Fenêtre ──────────────────────────────────────────────────────────────────────────────────
export function OrganWindow(): JSX.Element | null {
  const target = useBody((s) => s.organWindow);
  const day = useBody((s) => s.day);
  const adherence = useBody((s) => s.adherence);
  const openOrganWindow = useBody((s) => s.openOrganWindow);
  const dialogRef = useRef<HTMLDivElement>(null);
  const open = target !== null;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') { e.stopPropagation(); openOrganWindow(null); }
    };
    window.addEventListener('keydown', onKey);
    dialogRef.current?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [open, openOrganWindow]);

  const body = useMemo(() => getDayBodyPlan(day, adherence), [day, adherence]);
  const pheno = useMemo(() => (target === 'global' ? phenoAge(day) : null), [target, day]);
  if (target === null) return null;

  const isGlobal = target === 'global';
  const organ = isGlobal ? null : body.organs.find((o) => o.id === target) ?? null;
  const name = isGlobal ? 'Corps entier' : sentenceCase(organ?.name ?? String(target));
  const gap = organ && hasBioAgeModel(organ.id) ? organ.bioAge - organ.chronoAge : null;

  return (
    <div className="ow" onMouseDown={(e) => { if (e.target === e.currentTarget) openOrganWindow(null); }}>
      <div
        ref={dialogRef} className="ow__win" role="dialog" aria-modal="true" tabIndex={-1}
        aria-label={`Fenêtre organe — ${name}`} data-kind={isGlobal ? 'global' : 'organ'}
      >
        <header className="ow__head">
          <h2 className="ow__name">{name}</h2>
          {organ ? <StatusChip color={organ.status} label={organ.status === 'grey' ? 'Non modélisé' : undefined} /> : null}
          {/* écart d'âge du jour : dans l'en-tête, à côté du statut (les deux chiffres clés restent ceux de la colonne de droite) */}
          {organ && gap !== null ? (
            <span className="ow__head-gap" title="Hypothèse de l’équipe : perte cumulée rapportée à la vitesse de vieillissement terrestre">
              Écart d’âge estimé <strong>{signed(gap)} ans</strong>
            </span>
          ) : null}
          <span className="ow__fill" />
          <span className="ow__date">
            {fmtDay(day)} · {fmtDate(body.date || dayToDate(day))}{body.projected ? ' · projection' : ''}
          </span>
          <CloseButton onClose={() => openOrganWindow(null)} label="Fermer la fenêtre (Échap)" />
        </header>

        <div className="ow__grid">
          <div className="ow__left">
            <div className="ow__view" title="Glisser pour tourner">
              <OrganViewer organId={target} />
            </div>
            {isGlobal ? <OrganGaps organs={body.organs} /> : null}
          </div>

          {isGlobal ? <GlobalCentre result={pheno} day={day} /> : null}
          {!isGlobal && organ ? <OrganCentre organ={organ} day={day} /> : null}
          {!isGlobal && !organ ? (
            <div className="ow__centre"><p className="ow__empty">Organe inconnu : aucune donnée.</p></div>
          ) : null}

          {isGlobal ? <GlobalRight result={pheno} /> : null}
          {!isGlobal && organ ? <OrganRight organ={organ} day={day} /> : null}
          {!isGlobal && !organ ? <div className="ow__right" /> : null}
        </div>
      </div>
    </div>
  );
}
