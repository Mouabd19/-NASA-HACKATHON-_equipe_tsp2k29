// Panneau gauche — analyses biologiques du jour affiché (ROADMAP §1 « Panneau gauche »).
// Capillaire hebdomadaire + calcium urinaire quotidien. Aucune valeur n'est inventée :
// au-delà du dernier prélèvement on affiche le dernier résultat réel, daté.
import { useEffect, useMemo, useRef } from 'react';
import type { CSSProperties, JSX } from 'react';
import { Line, LineChart, ReferenceArea, ReferenceLine, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import type { BloodTest, Color, Tag } from '../../../types';
import { DAY_TODAY } from '../../../mocks/mission';
import { getAnalyteMeta, getBloodTests } from '../../../sim/load';
import { Panel, Sparkline, TagBadge, fmt, fmtDay, statusColor, statusVar, tokens } from '../../../ui';
import { useBody, useRowClip } from '../store';
import './BloodPanel.css';

/** Recueil urinaire quotidien : cadence lue dans les données de Mouad (`getAnalyteMeta`), calcium urinaire par défaut. */
const isUrine = (analyte: string): boolean => (getAnalyteMeta(analyte)?.cadence ?? (analyte === 'calcium_urinaire' ? 'quotidien' : 'hebdo')) === 'quotidien';
/** Analytes mis en avant : anémie spatiale et fuite calcique (os). */
const WATCHED: Record<string, string> = {
  hemoglobine: 'À surveiller : anémie spatiale',
  calcium_urinaire: 'À surveiller : fuite calcique (os)',
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
/** null = dans l'intervalle (aucune décoration) ; ambre = légèrement hors ; rouge = nettement hors. */
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

/** Étiquette de provenance commune à tout un groupe (sinon null : elle reste lisible dans la ligne dépliée). */
function tagOf(rows: Row[]): Tag | null {
  const tags = new Set(rows.flatMap((r) => (r.last ? [r.last.tag] : [])));
  return tags.size === 1 ? [...tags][0] : null;
}

const refText = (t: BloodTest): string => `${fmt(t.refLow)} – ${fmt(t.refHigh)} ${t.unit}`;

/** Position de la valeur dans l'intervalle de référence (zone centrale de la piste). */
function RangeBar({ t }: { t: BloodTest }): JSX.Element {
  const span = Math.max(t.refHigh - t.refLow, 1e-9);
  const pos = Math.max(0, Math.min(1, 0.25 + ((t.value - t.refLow) / span) * 0.5));
  const out = outOfRange(t);
  const style = { '--bp-pos': `${(pos * 100).toFixed(1)}%`, '--bp-mark': out ? statusVar[out] : 'var(--sz-text)' } as CSSProperties;
  return (
    <span className="bp-range" style={style} title={`Référence ${refText(t)}`}>
      <span className="bp-range__ref" />
      <span className="bp-range__mark" />
    </span>
  );
}

function Detail({ row, day }: { row: Row; day: number }): JSX.Element {
  const last = row.last as BloodTest;
  const data = row.history.map((h) => ({ day: h.day, value: h.value }));
  const values = data.map((d) => d.value);
  // Domaine : l'intervalle de référence (étendu aux valeurs qui en sortent) plus 30 % de marge de chaque
  // côté, pour que la bande de référence se lise comme une bande et non comme le fond du tracé.
  const lo = Math.min(last.refLow, ...values);
  const hi = Math.max(last.refHigh, ...values);
  const pad = (hi - lo) * 0.3 || 1;
  const xMax = Math.max(Math.min(day, DAY_TODAY), last.day, 7);
  const tick = { fontFamily: tokens.font.text, fontSize: tokens.size.xs, fill: tokens.color.textMuted } as const;
  const out = outOfRange(last);
  const sample = row.daily ? 'recueil' : 'prélèvement';
  return (
    <div className="bp-detail" data-row>
      <div className="bp-detail__line">
        <span className="bp-detail__key">Référence</span>
        <span className="bp-detail__val">{refText(last)}</span>
      </div>
      <div className="bp-detail__chart">
        <ResponsiveContainer width="100%" height={112}>
          <LineChart data={data} margin={{ top: 4, right: 4, bottom: 2, left: 0 }}>
            <XAxis
              dataKey="day"
              type="number"
              domain={[0, xMax]}
              tick={tick}
              tickFormatter={(d: number) => fmtDay(d)}
              tickCount={5}
              stroke={tokens.color.border}
              tickLine={false}
              height={18}
            />
            <YAxis
              type="number"
              domain={[lo - pad, hi + pad]}
              // Recharts cale le domaine sur les graduations : les deux bornes y figurent, sans libellé.
              ticks={[lo - pad, last.refLow, last.refHigh, hi + pad]}
              interval={0}
              tick={tick}
              tickFormatter={(v: number) => (v === last.refLow || v === last.refHigh ? fmt(v) : '')}
              stroke={tokens.color.border}
              tickLine={false}
              width={36}
            />
            <ReferenceArea y1={last.refLow} y2={last.refHigh} fill={tokens.color.text} fillOpacity={0.06} stroke="none" />
            <ReferenceLine y={last.refLow} stroke={tokens.color.border} />
            <ReferenceLine y={last.refHigh} stroke={tokens.color.border} />
            {day < xMax ? <ReferenceLine x={day} stroke={tokens.color.borderStrong} strokeWidth={1} /> : null}
            <Line
              dataKey="value"
              type="linear"
              stroke={out ? statusColor[out] : tokens.color.text}
              strokeWidth={1.5}
              dot={false}
              activeDot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      {WATCHED[row.analyte] ? (
        <p className="bp-detail__note">{WATCHED[row.analyte]} <TagBadge tag="H" /></p>
      ) : null}
      <div className="bp-detail__line sz-detail">
        <span className="bp-detail__key">{day > last.day ? `Dernier ${sample}` : sample.charAt(0).toUpperCase() + sample.slice(1)}</span>
        <span className="bp-detail__val">{fmtDay(last.day)} · {data.length} {data.length > 1 ? 'résultats' : 'résultat'} · <TagBadge tag={last.tag} /></span>
      </div>
    </div>
  );
}

function RowView({ row, day, open, onToggle }: { row: Row; day: number; open: boolean; onToggle: () => void }): JSX.Element {
  const { last } = row;
  const label = labelOf(row.analyte);
  // Ligne ouverte (clic ou paramètre d'URL) : amenée dans la zone visible de la liste.
  const ref = useRef<HTMLLIElement>(null);
  useEffect(() => {
    if (open) ref.current?.scrollIntoView({ block: 'nearest' });
  }, [open]);
  if (!last) {
    return (
      <li className="bp-item">
        <div className="bp-row bp-row--empty" data-row>
          <span className="bp-row__label">{label}</span>
          <span className="bp-row__empty">Aucun résultat</span>
        </div>
      </li>
    );
  }
  const out = outOfRange(last);
  const trend = trendOf(row.history, row.daily);
  const digits = digitsOf(row.analyte, last.value);
  const spark = row.history.slice(row.daily ? -42 : -14).map((h) => h.value);
  const stale = day > last.day && (row.daily || day > DAY_TODAY);
  const below = last.value < last.refLow;
  const trendText = trend.dir > 0 ? 'en hausse' : trend.dir < 0 ? 'en baisse' : 'stable';
  // Trait coloré seulement si la valeur est hors intervalle ou si la tendance la rapproche d'une borne.
  const sparkStatus = out ?? trend.color;
  return (
    <li className="bp-item" data-open={open} ref={ref}>
      <button
        type="button"
        className="bp-row"
        data-row
        aria-expanded={open}
        onClick={onToggle}
        title={`${getAnalyteMeta(row.analyte)?.label ?? label} · ${fmtDay(last.day)}${stale ? ' (dernier résultat)' : ''} · référence ${refText(last)}`}
      >
        <span className="bp-row__label">{label}</span>
        <span className="bp-row__value" style={out ? { color: statusVar[out] } : undefined}>
          {out ? <span className="bp-row__flag" role="img" aria-label={below ? 'sous l’intervalle' : 'au-dessus de l’intervalle'}>{below ? '↓' : '↑'}</span> : null}
          {fmt(last.value, digits)}
        </span>
        <span className="bp-row__unit">{last.unit}</span>
        <RangeBar t={last} />
        <Sparkline
          values={spark}
          width={56}
          height={16}
          color={sparkStatus ? statusVar[sparkStatus] : undefined}
          label={`Tendance : ${trendText}`}
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
  // Jamais de demi-ligne en bas de liste ; un bloc déplié (plus haut qu'une ligne) reste visible.
  const scrollRef = useRef<HTMLDivElement>(null);
  useRowClip(scrollRef, 40);

  const group = (name: string, when: number | null, rows: Row[]): JSX.Element | null => (rows.length === 0 ? null : (
    <section className="bp-group" aria-label={name}>
      <h3 className="bp-group__head sz-section-title">
        {name}
        {when !== null ? <span className="bp-group__day"> · {fmtDay(when)}</span> : null}
        {tagOf(rows) ? <span className="bp-group__tag"><TagBadge tag={tagOf(rows) as Tag} /></span> : null}
      </h3>
      <ul className="bp-list">
        {rows.map((r) => (
          <RowView key={r.analyte} row={r} day={day} open={openAnalyte === r.analyte} onToggle={() => toggle(r.analyte)} />
        ))}
      </ul>
    </section>
  ));

  return (
    <Panel title="Analyses" provenance="SIMULÉ" className="bp">
      {all.length === 0 || lastAny < 0 ? (
        <p className="bp-none">Aucun résultat à cette date.</p>
      ) : (
        <>
          {projected ? <p className="bp-banner">Derniers résultats mesurés : {fmtDay(drawDay ?? lastAny)}</p> : null}
          <div className="bp-cols" aria-hidden="true">
            <span>Analyte</span>
            <span className="bp-cols__num">Valeur</span>
            <span />
            <span>Réf.</span>
            <span>Tendance</span>
          </div>
          <div className="bp-scroll sz-scroll" ref={scrollRef}>
            {group('Sang', drawDay, capillary)}
            {group('Urine', urineDay, urine)}
            <p className="bp-legend sz-detail">
              Réf. : position dans l’intervalle de référence (<TagBadge tag="Publié" />). Tendance : 14 derniers prélèvements, 42 derniers jours pour l’urine.
            </p>
          </div>
        </>
      )}
    </Panel>
  );
}
