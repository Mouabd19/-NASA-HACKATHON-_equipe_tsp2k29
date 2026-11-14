// Fenêtre organe (ROADMAP §1 « Clic sur l'âge biologique → fenêtre organe »).
// Modale centrée sur toute la page Body, affichée quand useBody.organWindow !== null.
// 3 colonnes : modèle 3D seul · métriques du jour + synthèse IA · graphe de l'écart d'âge [H]
// (trait plein = mesuré, pointillé = prédit, bande d'incertitude). 'global' → PhenoAge [Publié].
import { useEffect, useMemo, useRef } from 'react';
import type { CSSProperties, JSX, ReactNode } from 'react';
import {
  Area, CartesianGrid, ComposedChart, Line, ReferenceArea, ReferenceDot, ReferenceLine,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import type { BioAgePoint, Metric, OrganId, OrganState, PhenoAgeResult } from '../../../types';
import { CHRONO_AGE_J0, DAY_END, DAY_SOL0, DAY_TODAY } from '../../../mocks/mission';
import { getAnalyteMeta, getBloodTests, getDayBodyPlan } from '../../../sim/load';
import { bioAgeSeries } from '../../../models/bioAge';
import { phenoAge } from '../../../models/phenoAge';
import { trend7d } from '../../../models/trend';
import { getSummary } from '../../../content/summaries';
import { lightTimeMin } from '../../../content/horizons';
import {
  ProvenanceBadge, StatusChip, StatusDot, TagBadge, dayToDate, fmt, fmtDay, statusVar, tokens,
} from '../../../ui';
import { OrganViewer } from '../../../three/OrganViewer';
import { LAYER_META, useBody } from '../store';
import './OrganWindow.css';

// ── Réglages du graphe (itération rapide) ────────────────────────────────────────────────────
const C = tokens.color;
const CHART = {
  measured: { stroke: C.text, width: 2.25 },
  /** Scénario mis en avant / scénario en retrait. */
  on: { stroke: C.text, width: 1.75, opacity: 1, dash: '5 4', band: 0.2 },
  off: { stroke: C.textDim, width: 1.25, opacity: 0.85, dash: '2 4', band: 0.07 },
  measuredBand: 0.3,
  chrono: { stroke: C.textDim, width: 1, opacity: 0.7 },
  grid: C.border,
  axis: C.textDim,
  predictedZone: 0.035,
  font: 9,
  /** Heure UTC d'émission de la synthèse par le sol [Persona]. */
  groundEmitMin: 6 * 60,
} as const;

const YEAR = 365.25;
const chronoAt = (day: number): number => CHRONO_AGE_J0 + day / YEAR;
const signed = (n: number, digits = 1): string => `${n < 0 ? '−' : '+'}${fmt(Math.abs(n), digits)}`;
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

interface GapChart {
  rows: Row[];
  modeled: boolean;
  hasPrediction: boolean;
  splitDay: number;
  end: [number | null, number | null];   // écart en fin de mission, rythme actuel / avec le plan
  endPoint: [BioAgePoint | null, BioAgePoint | null];
  domain: [number, number];
}

function buildGapChart(organId: OrganId): GapChart {
  const s0 = bioAgeSeries(organId, 0);
  const s1 = bioAgeSeries(organId, 1);
  const modeled = s0.some((p) => p.band !== undefined);
  let split = -1;
  s0.forEach((p, i) => { if (!p.predicted) split = i; });
  const hasPrediction = s0.some((p) => p.predicted);
  const splitDay = split >= 0 ? s0[split].day : -1;
  const plan = new Map(s1.map((p) => [p.day, p]));

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

  const last0 = s0.length ? s0[s0.length - 1] : null;
  const last1 = s1.length ? s1[s1.length - 1] : null;
  const gap = (p: BioAgePoint | null): number | null => (p && modeled ? p.bioAge - chronoAt(p.day) : null);
  if (!Number.isFinite(lo)) { lo = CHRONO_AGE_J0; hi = CHRONO_AGE_J0 + 1; }
  return {
    rows, modeled, hasPrediction, splitDay,
    end: [gap(last0), gap(last1)],
    endPoint: [last0, last1],
    domain: [Math.floor(lo), Math.ceil(hi + Math.max(0.4, (hi - lo) * 0.1))],
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
        <h3 className="sz-label">{title}</h3>
        <span className="ow__fill" />
        {right}
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

function MetricsTable({ organ, day }: { organ: OrganState; day: number }): JSX.Element {
  if (organ.metrics.length === 0) {
    return (
      <div className="ow__empty">
        <span className="sz-label">NON MODÉLISÉ — AUCUNE MÉTRIQUE</span>
        <p>Aucune mesure ni modèle pour cet organe. Statut inconnu : il n’est jamais affiché en vert par défaut.</p>
      </div>
    );
  }
  return (
    <table className="ow__table">
      <thead>
        <tr>
          <th>MÉTRIQUE</th>
          <th className="ow__num">VALEUR</th>
          <th>SEUIL</th>
          <th>PROV.</th>
          <th className="ow__num">TEND. 7 J</th>
        </tr>
      </thead>
      <tbody>
        {organ.metrics.map((m) => {
          const t = m.trend7d ?? trend7d(organ.id, m.key, day);
          const nasaId = m.tag === 'NASA' ? m.ref?.standardId : undefined;
          return (
            <tr key={m.key}>
              <td>
                <span className="ow__metric">
                  <StatusDot color={m.color} />
                  <span>{m.label}</span>
                </span>
              </td>
              <td className="ow__num">
                <span className="ow__val" style={{ '--ow-status': m.color === 'green' || m.color === 'grey' ? 'var(--sz-text)' : statusVar[m.color] } as CSSProperties}>
                  {fmt(m.value)}
                </span>
                <span className="ow__unit">{m.unit}</span>
                {m.noise !== undefined ? <span className="ow__noise">± {fmt(m.noise)}</span> : null}
              </td>
              <td>
                <span className="ow__ref">{refText(m)}</span>
                <TagBadge tag={m.tag} id={nasaId} />
              </td>
              <td><ProvenanceBadge value={m.provenance} /></td>
              <td className="ow__num">
                {t === null || t === undefined || !Number.isFinite(t)
                  ? <span className="sz-dim">—</span>
                  : <span className="ow__trend">{signed(t, 2)}<span className="ow__unit">%/sem</span></span>}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function Synthesis({ organId, day }: { organId: OrganId; day: number }): JSX.Element {
  const summary = useMemo(() => getSummary(organId, day), [organId, day]);
  const delay = useMemo(() => lightTimeMin(dayToDate(summary?.day ?? day)), [summary, day]);
  return (
    <Sect
      className="ow__synth"
      title="SYNTHÈSE IA — À VALIDER PAR LE CMO"
      right={summary ? <span className="ow__unreviewed sz-label">NON VALIDÉE</span> : null}
    >
      {summary ? (
        <>
          <p className="ow__synth-text">{summary.text}</p>
          <p className="ow__synth-meta sz-label">
            REÇUE DE LA TERRE À {hhmm(CHART.groundEmitMin + delay)} — DÉLAI {fmt(delay, 1)} MIN — GÉNÉRÉE AU SOL, JAMAIS UTILISÉE POUR UN SEUIL
          </p>
          <p className="ow__synth-meta sz-label sz-dim">
            SYNTHÈSE DU {fmtDay(summary.day)} · HEURE UTC <TagBadge tag="Persona" /> · DÉLAI <TagBadge tag="Publié" />
          </p>
        </>
      ) : (
        <div className="ow__empty ow__empty--flat">
          <span className="sz-label">PAS DE SYNTHÈSE POUR CET ORGANE</span>
        </div>
      )}
    </Sect>
  );
}

// ── Graphe ───────────────────────────────────────────────────────────────────────────────────
const tickStyle = { fontFamily: tokens.font.mono, fontSize: CHART.font, fill: CHART.axis, letterSpacing: '0.08em' };

/** Libellé vertical le long d'un repère (à gauche du trait, depuis le haut). */
function vLabel(text: string, fill: string) {
  return function VLabel(props: { viewBox?: { x?: number; y?: number } }): JSX.Element {
    const x = (props.viewBox?.x ?? 0) - 4;
    const y = (props.viewBox?.y ?? 0) + 4;
    return (
      <text x={x} y={y} transform={`rotate(-90 ${x} ${y})`} textAnchor="end" style={{ ...tickStyle, fill }}>
        {text}
      </text>
    );
  };
}

function endLabel(text: string, fill: string, dy: number) {
  return function EndLabel(props: { viewBox?: { x?: number; y?: number; width?: number; height?: number } }): JSX.Element {
    const vb = props.viewBox ?? {};
    const x = (vb.x ?? 0) + (vb.width ?? 0) / 2 - 6;
    const y = (vb.y ?? 0) + (vb.height ?? 0) / 2 + dy;
    return <text x={x} y={y} textAnchor="end" style={{ ...tickStyle, fontSize: 10, fill }}>{text}</text>;
  };
}

interface TipProps { active?: boolean; payload?: ReadonlyArray<{ payload?: Row | PhenoRow }> }

function GapTip({ active, payload }: TipProps): JSX.Element | null {
  const r = payload?.[0]?.payload as Row | undefined;
  if (!active || !r) return null;
  const predicted = r.meas === undefined;
  const line = (label: string, v: number | undefined, band?: [number, number]): JSX.Element | null => (v === undefined ? null : (
    <div className="ow__tip-row">
      <span className="sz-dim">{label}</span>
      <span>{fmt(v, 1)} ANS <span className="sz-dim">({signed(v - r.chrono)})</span></span>
      {band ? <span className="sz-dim ow__tip-band">[{fmt(band[0], 1)} – {fmt(band[1], 1)}]</span> : null}
    </div>
  ));
  return (
    <div className="ow__tip sz-label">
      <div className="ow__tip-head">{fmtDay(r.day)} · {predicted ? 'PRÉDIT' : 'MESURÉ'}</div>
      {line('MESURÉ', r.meas, r.bandMeas)}
      {predicted ? line('RYTHME ACTUEL', r.p0, r.band0) : null}
      {predicted ? line('AVEC LE PLAN', r.p1, r.band1) : null}
      <div className="ow__tip-row"><span className="sz-dim">ÂGE RÉEL</span><span>{fmt(r.chrono, 1)} ANS</span></div>
    </div>
  );
}

function PhenoTip({ active, payload }: TipProps): JSX.Element | null {
  const r = payload?.[0]?.payload as PhenoRow | undefined;
  if (!active || !r) return null;
  return (
    <div className="ow__tip sz-label">
      <div className="ow__tip-head">{fmtDay(r.day)} · PRÉLÈVEMENT</div>
      <div className="ow__tip-row"><span className="sz-dim">PHENOAGE</span><span>{fmt(r.pheno, 1)} ANS <span className="sz-dim">({signed(r.pheno - r.chrono)})</span></span></div>
      <div className="ow__tip-row"><span className="sz-dim">ÂGE RÉEL</span><span>{fmt(r.chrono, 1)} ANS</span></div>
    </div>
  );
}

function GapChartView({ chart, day, adherence }: { chart: GapChart; day: number; adherence: 0 | 1 }): JSX.Element {
  const s = [adherence === 0 ? CHART.on : CHART.off, adherence === 1 ? CHART.on : CHART.off] as const;
  const showDay = day !== DAY_TODAY && day !== DAY_SOL0;
  const xTicks = [0, DAY_TODAY, DAY_SOL0, DAY_END];
  const [e0, e1] = chart.endPoint;
  const split = chart.rows.find((r) => r.day === chart.splitDay);
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={chart.rows} margin={{ top: 8, right: 10, bottom: 0, left: 0 }}>
        <CartesianGrid stroke={CHART.grid} vertical={false} />
        <XAxis
          dataKey="day" type="number" domain={[0, DAY_END]} ticks={xTicks} tick={tickStyle} interval={0}
          tickFormatter={(d: number) => fmtDay(d)} tickLine={{ stroke: CHART.axis }} axisLine={{ stroke: CHART.axis }} height={22}
        />
        <YAxis
          type="number" domain={chart.domain} tick={tickStyle} width={34} allowDecimals={false}
          tickFormatter={(v: number) => fmt(v, 0)} tickLine={false} axisLine={{ stroke: CHART.axis }}
        />
        {chart.hasPrediction ? (
          <ReferenceArea x1={chart.splitDay} x2={DAY_END} fill={C.text} fillOpacity={CHART.predictedZone} stroke="none" ifOverflow="hidden" />
        ) : null}

        {/* bandes d'incertitude */}
        <Area dataKey="bandMeas" stroke="none" fill={C.text} fillOpacity={CHART.measuredBand} isAnimationActive={false} activeDot={false} connectNulls={false} />
        <Area dataKey="band0" stroke={s[0].stroke} strokeOpacity={0.25} strokeWidth={0.5} fill={C.text} fillOpacity={s[0].band} isAnimationActive={false} activeDot={false} />
        <Area dataKey="band1" stroke={s[1].stroke} strokeOpacity={0.25} strokeWidth={0.5} fill={C.text} fillOpacity={s[1].band} isAnimationActive={false} activeDot={false} />

        {/* âge réel */}
        <Line dataKey="chrono" stroke={CHART.chrono.stroke} strokeWidth={CHART.chrono.width} strokeOpacity={CHART.chrono.opacity} dot={false} activeDot={false} isAnimationActive={false} />

        {/* repères verticaux */}
        <ReferenceLine x={DAY_TODAY} stroke={C.text} strokeOpacity={0.55} strokeWidth={1} label={vLabel('AUJOURD’HUI', C.text)} />
        <ReferenceLine x={DAY_SOL0} stroke={C.textDim} strokeOpacity={0.8} strokeWidth={1} strokeDasharray="1 3" label={vLabel('SOL 0', C.textDim)} />
        {showDay ? (
          <ReferenceLine x={day} stroke={C.holo} strokeWidth={1} label={vLabel(`AFFICHÉ ${fmtDay(day)}`, C.holo)} />
        ) : null}

        {/* prédit = pointillé ; mesuré = plein */}
        <Line dataKey="p1" stroke={s[1].stroke} strokeWidth={s[1].width} strokeOpacity={s[1].opacity} strokeDasharray={s[1].dash} strokeLinecap="butt" dot={false} activeDot={false} isAnimationActive={false} />
        <Line dataKey="p0" stroke={s[0].stroke} strokeWidth={s[0].width} strokeOpacity={s[0].opacity} strokeDasharray={s[0].dash} strokeLinecap="butt" dot={false} activeDot={false} isAnimationActive={false} />
        <Line dataKey="meas" stroke={CHART.measured.stroke} strokeWidth={CHART.measured.width} dot={false} activeDot={false} isAnimationActive={false} />

        {chart.hasPrediction && chart.modeled && e0 ? (
          <ReferenceDot x={e0.day} y={e0.band?.[1] ?? e0.bioAge} r={0} fill="none" stroke="none" label={endLabel('RYTHME ACTUEL', s[0].stroke, -6)} />
        ) : null}
        {chart.hasPrediction && chart.modeled && e1 ? (
          <ReferenceDot x={e1.day} y={e1.band?.[0] ?? e1.bioAge} r={0} fill="none" stroke="none" label={endLabel('AVEC LE PLAN', s[1].stroke, 13)} />
        ) : null}

        {chart.modeled && chart.splitDay >= 0 && split ? (
          <ReferenceDot x={split.day} y={split.meas ?? split.chrono} r={3} fill={C.text} stroke={C.bg} strokeWidth={1} />
        ) : null}
        {chart.hasPrediction && chart.modeled && e0 ? <ReferenceDot x={e0.day} y={e0.bioAge} r={2.5} fill={C.bg} stroke={s[0].stroke} /> : null}
        {chart.hasPrediction && chart.modeled && e1 ? <ReferenceDot x={e1.day} y={e1.bioAge} r={2.5} fill={C.bg} stroke={s[1].stroke} /> : null}

        <Tooltip content={<GapTip />} cursor={{ stroke: C.textDim, strokeWidth: 1 }} isAnimationActive={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

function PhenoChartView({ rows, usedDay }: { rows: PhenoRow[]; usedDay: number | null }): JSX.Element {
  let lo = Infinity;
  let hi = -Infinity;
  for (const r of rows) { lo = Math.min(lo, r.pheno, r.chrono); hi = Math.max(hi, r.pheno, r.chrono); }
  if (!Number.isFinite(lo)) { lo = CHRONO_AGE_J0; hi = CHRONO_AGE_J0 + 1; }
  const y0 = Math.floor(lo * 2) / 2;
  const y1 = Math.ceil(hi * 2 + 0.4) / 2;
  const yTicks: number[] = [];
  for (let v = y0; v <= y1 + 1e-9; v += 0.5) yTicks.push(v);
  const ticks = [0, 28, 56, 84].filter((d) => d < DAY_TODAY - 6).concat(DAY_TODAY);
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={rows} margin={{ top: 8, right: 10, bottom: 0, left: 0 }}>
        <CartesianGrid stroke={CHART.grid} vertical={false} />
        <XAxis
          dataKey="day" type="number" domain={[0, DAY_TODAY]} ticks={ticks} tick={tickStyle} interval={0}
          tickFormatter={(d: number) => fmtDay(d)} tickLine={{ stroke: CHART.axis }} axisLine={{ stroke: CHART.axis }} height={22}
        />
        <YAxis
          type="number" domain={[y0, y1]} ticks={yTicks} interval={0} tick={tickStyle} width={34}
          tickFormatter={(v: number) => fmt(v, 1)} tickLine={false} axisLine={{ stroke: CHART.axis }}
        />
        <Line dataKey="chrono" stroke={CHART.chrono.stroke} strokeWidth={CHART.chrono.width} strokeOpacity={CHART.chrono.opacity} dot={false} activeDot={false} isAnimationActive={false} />
        {usedDay !== null ? (
          <ReferenceLine x={usedDay} stroke={C.holo} strokeWidth={1} label={vLabel(`PRÉLÈVEMENT ${fmtDay(usedDay)}`, C.holo)} />
        ) : null}
        <Line
          dataKey="pheno" stroke={CHART.measured.stroke} strokeWidth={CHART.measured.width} isAnimationActive={false}
          dot={{ r: 2, fill: C.bg, stroke: C.text, strokeWidth: 1 }} activeDot={{ r: 3, fill: C.text, stroke: C.text }}
        />
        <Tooltip content={<PhenoTip />} cursor={{ stroke: C.textDim, strokeWidth: 1 }} isAnimationActive={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

function Legend({ pheno }: { pheno?: boolean }): JSX.Element {
  return (
    <ul className="ow__legend sz-label">
      <li><i className="ow__key ow__key--solid" />{pheno ? 'PHENOAGE MESURÉ' : 'MESURÉ'}</li>
      {pheno ? null : <li><i className="ow__key ow__key--dash" />PRÉDIT (MODÈLE)</li>}
      {pheno ? null : <li><i className="ow__key ow__key--band" />INCERTITUDE</li>}
      <li><i className="ow__key ow__key--thin" />ÂGE RÉEL</li>
    </ul>
  );
}

// ── Colonnes ─────────────────────────────────────────────────────────────────────────────────
function OrganRight({ organ, day }: { organ: OrganState; day: number }): JSX.Element {
  const adherence = useBody((s) => s.adherence);
  const setAdherence = useBody((s) => s.setAdherence);
  const chart = useMemo(() => buildGapChart(organ.id), [organ.id]);
  const btn = (a: 0 | 1, label: string): JSX.Element => {
    const v = chart.end[a];
    return (
      <button
        type="button" className="ow__scn" aria-pressed={adherence === a} data-on={adherence === a}
        disabled={!chart.modeled} onClick={() => setAdherence(a)}
      >
        <span className="ow__scn-top sz-label">
          <i className={`ow__key ${adherence === a ? 'ow__key--dash' : 'ow__key--dash-off'}`} />
          {label}
        </span>
        <span className="ow__scn-num">
          {v === null ? '—' : signed(v)}
          <small>ANS</small>
        </span>
        <span className="sz-label sz-dim">FIN DE MISSION · {fmtDay(DAY_END)}</span>
      </button>
    );
  };
  return (
    <div className="ow__right">
      <Sect title={<>ÉCART D’ÂGE ESTIMÉ <TagBadge tag="H" /></>} right={<ProvenanceBadge value="H" />}>
        <div className="ow__scns">
          {btn(0, 'RYTHME ACTUEL')}
          {btn(1, 'AVEC LE PLAN')}
        </div>
        <div className="ow__axis-title sz-label sz-dim">
          <span>ÂGE ÉQUIVALENT (ANS)</span>
          <span>MESURÉ {fmtDay(0)}–{fmtDay(DAY_TODAY)} │ PRÉDIT → {fmtDay(DAY_END)}</span>
        </div>
        <div className="ow__chart">
          <GapChartView chart={chart} day={day} adherence={adherence} />
          {chart.modeled ? null : (
            <div className="ow__chart-veil">
              <span className="sz-label">NON MODÉLISÉ — ÉCART D’ÂGE INCONNU</span>
              <span className="sz-label sz-dim">AUCUN MODÈLE : ÂGE ÉQUIVALENT = ÂGE RÉEL</span>
            </div>
          )}
        </div>
        <Legend />
      </Sect>
      <div className="ow__notes">
        <p className="ow__formula sz-mono">
          bioAge = âge réel + perte cumulée % / vitesse de vieillissement terrestre %/an <TagBadge tag="H" />
        </p>
        <p className="ow__limit">
          Équivalent en années, pas un vieillissement réel : la perte spatiale est en partie réversible au retour.
        </p>
      </div>
    </div>
  );
}

function GlobalRight({ result }: { result: PhenoAgeResult | null }): JSX.Element {
  const rows = useMemo(buildPhenoRows, []);
  return (
    <div className="ow__right">
      <Sect title={<>PHENOAGE DANS LE TEMPS <TagBadge tag="Publié" /></>} right={<ProvenanceBadge value="SIMULÉ" />}>
        <div className="ow__scns">
          <div className="ow__scn" data-on="true" data-static="true">
            <span className="ow__scn-top sz-label"><i className="ow__key ow__key--solid" />PHENOAGE</span>
            <span className="ow__scn-num">{result ? fmt(result.phenoAge, 1) : '—'}<small>ANS</small></span>
            <span className="sz-label sz-dim">{result ? `PRÉLÈVEMENT ${fmtDay(result.day)}` : 'AUCUN PRÉLÈVEMENT'}</span>
          </div>
          <div className="ow__scn" data-static="true">
            <span className="ow__scn-top sz-label"><i className="ow__key ow__key--thin" />ÂGE RÉEL</span>
            <span className="ow__scn-num">{result ? fmt(result.chronoAge, 1) : '—'}<small>ANS</small></span>
            <span className="sz-label sz-dim">HADDAD <TagBadge tag="Persona" /></span>
          </div>
        </div>
        <div className="ow__axis-title sz-label sz-dim">
          <span>ÂGE (ANS)</span>
          <span>UN POINT PAR PRÉLÈVEMENT HEBDOMADAIRE</span>
        </div>
        <div className="ow__chart">
          <PhenoChartView rows={rows} usedDay={result?.day ?? null} />
        </div>
        <Legend pheno />
      </Sect>
      <div className="ow__notes">
        <p className="ow__formula sz-mono">PAS DE PROJECTION POUR PHENOAGE</p>
        <p className="ow__limit">
          PhenoAge (Levine et al., Aging, 2018) se calcule sur une prise de sang : il n’existe que les jours de prélèvement. Aucun modèle ne le prolonge ; valeurs sanguines simulées.
        </p>
      </div>
    </div>
  );
}

function OrganCentre({ organ, day }: { organ: OrganState; day: number }): JSX.Element {
  return (
    <div className="ow__centre sz-scroll">
      <Sect title="MÉTRIQUES DU JOUR" right={<span className="sz-label sz-dim">{organ.metrics.length} MESURE{organ.metrics.length > 1 ? 'S' : ''}</span>}>
        <MetricsTable organ={organ} day={day} />
      </Sect>
      <Synthesis organId={organ.id} day={day} />
    </div>
  );
}

function GlobalCentre({ result, organs, day }: { result: PhenoAgeResult | null; organs: OrganState[]; day: number }): JSX.Element {
  const openOrganWindow = useBody((s) => s.openOrganWindow);
  const tests = useMemo(() => (result ? getBloodTests().filter((t) => t.day === result.day) : []), [result]);
  const inputs = result ? Object.entries(result.inputs) : [];
  return (
    <div className="ow__centre sz-scroll">
      <Sect title={<>ÂGE BIOLOGIQUE GLOBAL — PHENOAGE <TagBadge tag="Publié" /></>} right={<span className="sz-label sz-dim">LEVINE ET AL., 2018</span>}>
        {result ? (
          <div className="ow__pheno">
            <div>
              <span className="sz-label sz-dim">PHENOAGE</span>
              <span className="ow__pheno-num">{fmt(result.phenoAge, 1)}<small>ANS</small></span>
            </div>
            <div>
              <span className="sz-label sz-dim">ÂGE RÉEL</span>
              <span className="ow__pheno-num ow__pheno-num--dim">{fmt(result.chronoAge, 1)}<small>ANS</small></span>
            </div>
            <div>
              <span className="sz-label sz-dim">ÉCART</span>
              <span className="ow__pheno-num">{signed(result.phenoAge - result.chronoAge)}<small>ANS</small></span>
            </div>
            <p className="sz-label sz-dim">
              CALCULÉ SUR LE PRÉLÈVEMENT DU {fmtDay(result.day)}{day !== result.day ? ` (DERNIER DISPONIBLE À ${fmtDay(day)})` : ''}
            </p>
          </div>
        ) : (
          <div className="ow__empty"><span className="sz-label">DONNÉES INSUFFISANTES — AUCUN PRÉLÈVEMENT</span></div>
        )}
      </Sect>
      {result ? (
        <Sect title="MARQUEURS UTILISÉS" right={<ProvenanceBadge value="SIMULÉ" />}>
          <table className="ow__table">
            <thead>
              <tr><th>MARQUEUR</th><th className="ow__num">VALEUR</th><th>RÉFÉRENCE</th><th>ÉTIQUETTE</th></tr>
            </thead>
            <tbody>
              {inputs.map(([key, value]) => {
                const meta = getAnalyteMeta(key);
                const test = tests.find((t) => t.analyte === key);
                const isAge = key === 'age';
                const out = test ? value < test.refLow || value > test.refHigh : false;
                return (
                  <tr key={key}>
                    <td><span className="ow__metric"><span>{isAge ? 'Âge réel' : meta?.label ?? key}</span></span></td>
                    <td className="ow__num">
                      <span className="ow__val" style={{ '--ow-status': out ? 'var(--sz-amber)' : 'var(--sz-text)' } as CSSProperties}>
                        {fmt(value, meta?.digits)}
                      </span>
                      <span className="ow__unit">{isAge ? 'ans' : test?.unit ?? meta?.unit ?? ''}</span>
                    </td>
                    <td>
                      <span className="ow__ref">
                        {test ? `${fmt(test.refLow)} – ${fmt(test.refHigh)}` : meta ? `${fmt(meta.refLow)} – ${fmt(meta.refHigh)}` : '—'}
                      </span>
                    </td>
                    <td><TagBadge tag={isAge ? 'Persona' : test?.tag ?? 'Persona'} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Sect>
      ) : null}
      <Sect title="ÉCART D’ÂGE PAR ORGANE" right={<TagBadge tag="H" />}>
        <div className="ow__chips">
          {organs.map((o) => (
            <button key={o.id} type="button" className="ow__chip sz-label" onClick={() => openOrganWindow(o.id)}>
              <StatusDot color={o.status} />
              <span>{o.name}</span>
              <span className="sz-dim">{o.status === 'grey' ? '—' : signed(o.bioAge - o.chronoAge)}</span>
            </button>
          ))}
        </div>
      </Sect>
      <Synthesis organId="global" day={day} />
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
  const sys = organ ? LAYER_META[organ.layer]?.sys ?? 'SYS-00' : 'SYS-00';
  const name = isGlobal ? 'CORPS ENTIER' : organ?.name ?? String(target);
  const gap = organ && organ.status !== 'grey' ? organ.bioAge - organ.chronoAge : null;

  return (
    <div className="ow" onMouseDown={(e) => { if (e.target === e.currentTarget) openOrganWindow(null); }}>
      <div
        ref={dialogRef} className="ow__win" role="dialog" aria-modal="true" tabIndex={-1}
        aria-label={`Fenêtre organe — ${name}`}
        style={{ '--ow-status': organ ? statusVar[organ.status] : 'var(--sz-text-dim)' } as CSSProperties}
      >
        <i className="ow__corner ow__corner--tl" /><i className="ow__corner ow__corner--tr" />
        <i className="ow__corner ow__corner--bl" /><i className="ow__corner ow__corner--br" />

        <header className="ow__head">
          <span className="sz-label sz-dim">{sys} / {isGlobal ? 'GLOBAL' : 'ORGANE'}</span>
          <h2 className="ow__name">{name}</h2>
          {organ ? <StatusChip color={organ.status} label={organ.status === 'grey' ? 'NON MODÉLISÉ' : undefined} /> : null}
          <span className="ow__fill" />
          <span className="sz-label">
            {fmtDay(day)} <span className="sz-dim">· {body.date || dayToDate(day)} ·</span>{' '}
            {body.projected ? <span className="ow__proj">PROJETÉ</span> : 'MESURÉ'}
          </span>
          <button type="button" className="sz-btn ow__close" onClick={() => openOrganWindow(null)} aria-label="Fermer la fenêtre">
            FERMER <span className="sz-dim">ÉCHAP</span> ✕
          </button>
        </header>

        <div className="ow__grid">
          <div className="ow__left">
            <div className="ow__view">
              <OrganViewer organId={target} />
            </div>
            <span className="ow__view-tl sz-label sz-dim">{isGlobal ? 'SILHOUETTE' : 'ORGANE ISOLÉ'}</span>
            <span className="ow__view-tr sz-label sz-dim">GLISSER POUR TOURNER</span>
            <div className="ow__view-foot">
              {organ ? (
                <div className="ow__gap">
                  <span className="sz-label sz-dim">ÉCART D’ÂGE ESTIMÉ <TagBadge tag="H" /> · {fmtDay(day)}</span>
                  <span className="ow__gap-num" data-unknown={gap === null}>
                    {gap === null ? '—' : signed(gap)}<small>ANS</small>
                  </span>
                </div>
              ) : null}
              <span className="sz-label sz-dim">MODÈLE DE SECOURS — PROCÉDURAL</span>
            </div>
          </div>

          {isGlobal ? <GlobalCentre result={pheno} organs={body.organs} day={day} /> : null}
          {!isGlobal && organ ? <OrganCentre organ={organ} day={day} /> : null}
          {!isGlobal && !organ ? (
            <div className="ow__centre"><div className="ow__empty"><span className="sz-label">ORGANE INCONNU — AUCUNE DONNÉE</span></div></div>
          ) : null}

          {isGlobal ? <GlobalRight result={pheno} /> : null}
          {!isGlobal && organ ? <OrganRight organ={organ} day={day} /> : null}
          {!isGlobal && !organ ? <div className="ow__right" /> : null}
        </div>
      </div>
    </div>
  );
}
