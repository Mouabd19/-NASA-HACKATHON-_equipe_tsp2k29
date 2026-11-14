// Panneau gauche — analyses biologiques du jour affiché (ROADMAP §1 « Panneau gauche »).
// Capillaire hebdomadaire + calcium urinaire quotidien. Aucune valeur n'est inventée :
// au-delà du dernier prélèvement on affiche le dernier résultat réel, daté.
import { useMemo } from 'react';
import type { CSSProperties, JSX } from 'react';
import { Line, LineChart, ReferenceArea, ReferenceLine, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import type { BloodTest, Color } from '../../../types';
import { DAY_TODAY } from '../../../mocks/mission';
import { getAnalyteMeta, getBloodTests } from '../../../sim/load';
import { Panel, Sparkline, TagBadge, fmt, fmtDay, statusColor, tokens } from '../../../ui';
import { useBody } from '../store';
import './BloodPanel.css';

/** Recueil urinaire quotidien : cadence lue dans les données de Mouad (`getAnalyteMeta`), calcium urinaire par défaut. */
const isUrine = (analyte: string): boolean => (getAnalyteMeta(analyte)?.cadence ?? (analyte === 'calcium_urinaire' ? 'quotidien' : 'hebdo')) === 'quotidien';
/** Analytes mis en avant : anémie spatiale et fuite calcique (os). */
const WATCHED: Record<string, string> = {
  hemoglobine: 'Anémie spatiale — à surveiller',
  calcium_urinaire: 'Fuite calcique (os) — à surveiller',
};

const LABELS: Record<string, { short: string; digits: number }> = {
  hemoglobine: { short: 'Hémoglobine', digits: 1 },
  hematocrite: { short: 'Hématocrite', digits: 1 },
  leucocytes: { short: 'Leucocytes', digits: 1 },
  lymphocytes_pct: { short: 'Lymphocytes', digits: 1 },
  vgm: { short: 'VGM', digits: 1 },
  idr: { short: 'IDR', digits: 1 },
  crp: { short: 'CRP', digits: 1 },
  calcium: { short: 'Calcium', digits: 2 },
  vitamine_d: { short: 'Vitamine D', digits: 0 },
  creatinine: { short: 'Créatinine', digits: 0 },
  albumine: { short: 'Albumine', digits: 1 },
  phosphatases_alcalines: { short: 'Phosph. alc.', digits: 0 },
  glucose: { short: 'Glucose', digits: 1 },
  cortisol: { short: 'Cortisol', digits: 0 },
  calcium_urinaire: { short: 'Calcium urin.', digits: 0 },
  urine_ctx: { short: 'CTX urin.', digits: 0 },
};

function labelOf(analyte: string): string {
  return LABELS[analyte]?.short ?? getAnalyteMeta(analyte)?.label ?? analyte.replace(/_/g, ' ');
}
function digitsOf(analyte: string, sample: number): number {
  return LABELS[analyte]?.digits ?? getAnalyteMeta(analyte)?.digits ?? (Math.abs(sample) >= 100 ? 0 : Math.abs(sample) >= 10 ? 1 : 2);
}

/** Écart à l'intervalle de référence, en fraction de sa largeur (0 = dedans). */
function excess(t: BloodTest): number {
  const span = Math.max(t.refHigh - t.refLow, 1e-9);
  if (t.value < t.refLow) return (t.refLow - t.value) / span;
  if (t.value > t.refHigh) return (t.value - t.refHigh) / span;
  return 0;
}
/** null = dans l'intervalle (blanc atténué) ; ambre = légèrement hors ; rouge = nettement hors. */
function outOfRange(t: BloodTest): Color | null {
  const e = excess(t);
  return e === 0 ? null : e <= 0.15 ? 'amber' : 'red';
}

interface Trend { dir: 1 | -1 | 0; color: Color | null }

/** Tendance récente (≈ 4 semaines) ; colorée seulement si elle rapproche d'une borne. */
function trendOf(history: BloodTest[], daily: boolean): Trend {
  const last = history[history.length - 1];
  if (!last || history.length < 3) return { dir: 0, color: null };
  const mean = (xs: BloodTest[]): number => xs.reduce((s, x) => s + x.value, 0) / Math.max(xs.length, 1);
  const recent = history.filter((h) => h.day > last.day - (daily ? 7 : 14));
  const before = history.filter((h) => h.day <= last.day - 21 && h.day > last.day - 21 - (daily ? 7 : 14));
  if (recent.length === 0 || before.length === 0) return { dir: 0, color: null };
  const span = Math.max(last.refHigh - last.refLow, 1e-9);
  const delta = (mean(recent) - mean(before)) / span;
  if (Math.abs(delta) < 0.03) return { dir: 0, color: null };
  const dir = delta > 0 ? 1 : -1;
  const out = outOfRange(last);
  if (out) return { dir, color: out };
  const margin = dir > 0 ? (last.refHigh - last.value) / span : (last.value - last.refLow) / span;
  return { dir, color: margin < 0.2 ? 'amber' : null };
}

interface Row {
  analyte: string;
  history: BloodTest[];       // prélèvements ≤ jour affiché
  last: BloodTest | null;
  daily: boolean;
}

function RangeBar({ t }: { t: BloodTest }): JSX.Element {
  // L'intervalle de référence occupe la zone centrale (25 %..75 %) de la piste.
  const span = Math.max(t.refHigh - t.refLow, 1e-9);
  const pos = Math.max(0, Math.min(1, 0.25 + ((t.value - t.refLow) / span) * 0.5));
  const out = outOfRange(t);
  const style = { '--bp-pos': `${(pos * 100).toFixed(1)}%`, '--bp-mark': out ? statusColor[out] : 'var(--sz-text-dim)' } as CSSProperties;
  return (
    <span
      className="bp-range"
      style={style}
      title={`Référence ${fmt(t.refLow)} – ${fmt(t.refHigh)} ${t.unit}`}
      data-out={out ?? 'in'}
    >
      <span className="bp-range__ref" />
      <span className="bp-range__mark" />
    </span>
  );
}

function Detail({ row, day }: { row: Row; day: number }): JSX.Element {
  const last = row.last as BloodTest;
  const digits = digitsOf(row.analyte, last.value);
  const data = row.history.map((h) => ({ day: h.day, value: h.value }));
  const values = data.map((d) => d.value);
  const lo = Math.min(last.refLow, ...values);
  const hi = Math.max(last.refHigh, ...values);
  const pad = (hi - lo) * 0.12 || 1;
  const xMax = Math.max(Math.min(day, DAY_TODAY), last.day, 7);
  const mono = { fontFamily: tokens.font.mono, fontSize: 10, fill: tokens.color.textDim } as const;
  const out = outOfRange(last);
  return (
    <div className="bp-detail">
      <div className="bp-detail__meta">
        <span>Réf. {fmt(last.refLow)} – {fmt(last.refHigh)} {last.unit}</span>
        <span className="bp-detail__n">N = {data.length}</span>
      </div>
      <div className="bp-detail__chart">
        <ResponsiveContainer width="100%" height={120}>
          <LineChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: 0 }}>
            <XAxis
              dataKey="day"
              type="number"
              domain={[0, xMax]}
              tick={mono}
              tickFormatter={(d: number) => fmtDay(d)}
              tickCount={5}
              stroke={tokens.color.border}
              tickLine={false}
              height={16}
            />
            <YAxis
              type="number"
              domain={[lo - pad, hi + pad]}
              ticks={[last.refLow, last.refHigh]}
              tick={mono}
              tickFormatter={(v: number) => fmt(v)}
              stroke={tokens.color.border}
              tickLine={false}
              width={34}
            />
            <ReferenceArea y1={last.refLow} y2={last.refHigh} fill={tokens.color.text} fillOpacity={0.05} stroke="none" />
            <ReferenceLine y={last.refLow} stroke={tokens.color.borderStrong} strokeDasharray="2 3" />
            <ReferenceLine y={last.refHigh} stroke={tokens.color.borderStrong} strokeDasharray="2 3" />
            <ReferenceLine x={Math.min(day, xMax)} stroke={tokens.color.holo} strokeWidth={1} />
            <Line
              dataKey="value"
              type="linear"
              stroke={out ? statusColor[out] : tokens.color.text}
              strokeWidth={1.25}
              dot={row.daily ? false : { r: 1.5, fill: tokens.color.bg, strokeWidth: 1 }}
              activeDot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="bp-detail__foot">
        <span>
          {day > last.day ? 'Dernier ' : ''}{row.daily ? 'Recueil' : 'Prélèv.'} {fmtDay(last.day)} · {fmt(last.value, digits)} {last.unit}
        </span>
        <TagBadge tag={last.tag} />
      </div>
      {WATCHED[row.analyte] ? <div className="bp-detail__note">{WATCHED[row.analyte]} <TagBadge tag="H" /></div> : null}
    </div>
  );
}

function RowView({ row, day, open, onToggle }: { row: Row; day: number; open: boolean; onToggle: () => void }): JSX.Element {
  const { last } = row;
  const label = labelOf(row.analyte);
  if (!last) {
    return (
      <li className="bp-item">
        <div className="bp-row bp-row--empty">
          <span className="bp-row__name"><span className="bp-row__label">{label}</span></span>
          <span className="bp-row__empty">Données insuffisantes</span>
        </div>
      </li>
    );
  }
  const out = outOfRange(last);
  const trend = trendOf(row.history, row.daily);
  const digits = digitsOf(row.analyte, last.value);
  const watched = row.analyte in WATCHED;
  const spark = row.history.slice(row.daily ? -42 : -14).map((h) => h.value);
  const stale = day > last.day && (row.daily || day > DAY_TODAY);
  return (
    <li className="bp-item" data-open={open} data-watched={watched}>
      <button
        type="button"
        className="bp-row"
        aria-expanded={open}
        onClick={onToggle}
        title={`${label} — ${fmtDay(last.day)}${stale ? ' (dernier résultat)' : ''}`}
      >
        <span className="bp-row__name">
          <span className="bp-row__label">{label}</span>
          <span className="bp-row__sub sz-detail">
            <span className="bp-row__unit">{last.unit}</span>
            <TagBadge tag={last.tag} />
          </span>
        </span>
        <span className="bp-row__value" style={out ? { color: statusColor[out] } : undefined}>
          {fmt(last.value, digits)}
        </span>
        <span
          className="bp-row__trend"
          style={{ color: trend.color ? statusColor[trend.color] : 'var(--sz-text-dim)' }}
          aria-label={trend.dir > 0 ? 'en hausse' : trend.dir < 0 ? 'en baisse' : 'stable'}
        >
          {trend.dir > 0 ? '▲' : trend.dir < 0 ? '▼' : '·'}
        </span>
        <RangeBar t={last} />
        <Sparkline
          values={spark}
          width={46}
          height={18}
          color={out ? statusColor[out] : trend.color ? statusColor[trend.color] : 'var(--sz-text-dim)'}
        />
      </button>
      {open ? <Detail row={row} day={day} /> : null}
    </li>
  );
}

export function BloodPanel(): JSX.Element {
  const day = useBody((s) => s.day);
  const openAnalyte = useBody((s) => s.bloodAnalyte);
  const setBloodAnalyte = useBody((s) => s.setBloodAnalyte);

  const all = useMemo(() => getBloodTests(), []);
  const { capillary, urine, drawDay, urineDay } = useMemo(() => {
    const order: string[] = [];
    const by = new Map<string, BloodTest[]>();
    for (const t of all) {
      let list = by.get(t.analyte);
      if (!list) { list = []; by.set(t.analyte, list); order.push(t.analyte); }
      if (t.day <= day) list.push(t);
    }
    const rows: Row[] = order.map((analyte) => {
      const history = (by.get(analyte) ?? []).slice().sort((a, b) => a.day - b.day);
      return { analyte, history, last: history[history.length - 1] ?? null, daily: isUrine(analyte) };
    });
    const cap = rows.filter((r) => !r.daily);
    const uri = rows.filter((r) => r.daily);
    const maxDay = (rs: Row[]): number | null => rs.reduce<number | null>((m, r) => (r.last && (m === null || r.last.day > m) ? r.last.day : m), null);
    return { capillary: cap, urine: uri, drawDay: maxDay(cap), urineDay: maxDay(uri) };
  }, [all, day]);

  const projected = day > DAY_TODAY;
  const lastAny = Math.max(drawDay ?? -1, urineDay ?? -1);
  const toggle = (a: string): void => setBloodAnalyte(openAnalyte === a ? null : a);

  const group = (title: string, rows: Row[]): JSX.Element | null => (rows.length === 0 ? null : (
    <>
      <div className="bp-group">
        <span>{title}</span>
        <span className="bp-group__n">{rows.length}</span>
      </div>
      <ul className="bp-list">
        {rows.map((r) => (
          <RowView key={r.analyte} row={r} day={day} open={openAnalyte === r.analyte} onToggle={() => toggle(r.analyte)} />
        ))}
      </ul>
    </>
  ));

  return (
    <Panel
      sys="BIO-01"
      title="Analyses"
      provenance="SIMULÉ"
      className="bp"
      right={<span className="bp-day sz-detail">{fmtDay(day)}</span>}
    >
      {projected && lastAny >= 0 ? (
        <div className="bp-banner">
          Dernier prélèvement {fmtDay(drawDay ?? lastAny)} — pas de donnée projetée
        </div>
      ) : null}
      {all.length === 0 || lastAny < 0 ? (
        <div className="bp-none">Données insuffisantes</div>
      ) : (
        <div className="bp-scroll sz-scroll">
          {group(`Sang · ${drawDay === null ? '—' : fmtDay(drawDay)}`, capillary)}
          {group(`Urine${urineDay !== null && urineDay !== day ? ` · ${fmtDay(urineDay)}` : ''}`, urine)}
          <div className="bp-legend sz-detail">
            <span className="bp-legend__key"><i className="bp-legend__ref" /> INTERVALLE DE RÉF. <TagBadge tag="Publié" /></span>
            <span className="bp-legend__key">▲▼ tendance 4 sem.</span>
          </div>
        </div>
      )}
    </Panel>
  );
}
