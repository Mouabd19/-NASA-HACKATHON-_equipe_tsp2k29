// Widget SpO₂ (montre) — ROADMAP §1 « Widget SpO₂ ».
// La provenance est DÉRIVÉE de Measurement.source : dès que l'export réel de la montre
// remplace la série simulée, le badge passe à RÉEL sans toucher à ce fichier.
import { useMemo } from 'react';
import type { JSX } from 'react';
import { Area, AreaChart, ReferenceLine, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import type { Color, Measurement, Provenance } from '../../../types';
import { DAY_TODAY, MISSION_START_DATE } from '../../../mocks/mission';
import { getWatchSeries } from '../../../sim/load';
import { Panel, TagBadge, fmt, fmtDay, statusColor, tokens } from '../../../ui';
import { useBody } from '../store';
import './Spo2Widget.css';

const DAY_MS = 86_400_000;
const T0 = Date.parse(`${MISSION_START_DATE}T00:00:00Z`);
const SPO2_REF = 95;      // seuil d'attention usuel [Publié]
const SPO2_RED = 92;
const WINDOW = 30;

interface DayPoint { day: number; value: number }
interface Series { points: DayPoint[]; unit: string; real: boolean; empty: boolean }

/**
 * Série → une valeur par jour de mission (moyenne si plusieurs mesures par jour).
 * Si les dates sont hors mission (export réel du présentateur), la série est recalée
 * pour que sa dernière mesure tombe sur DAY_TODAY.
 */
function toDaily(list: Measurement[]): Series {
  if (list.length === 0) return { points: [], unit: '', real: false, empty: true };
  const raw = list
    .map((m) => ({ d: Math.floor((Date.parse(m.date) - T0) / DAY_MS), v: m.value }))
    .filter((p) => Number.isFinite(p.d) && Number.isFinite(p.v));
  const maxD = raw.reduce((m, p) => Math.max(m, p.d), Number.NEGATIVE_INFINITY);
  const inMission = raw.some((p) => p.d >= 0 && p.d <= DAY_TODAY);
  const shift = inMission ? 0 : DAY_TODAY - maxD;
  const acc = new Map<number, { s: number; n: number }>();
  for (const p of raw) {
    const d = p.d + shift;
    if (d < 0 || d > DAY_TODAY) continue;
    const a = acc.get(d) ?? { s: 0, n: 0 };
    a.s += p.v; a.n += 1;
    acc.set(d, a);
  }
  const points = [...acc.entries()].map(([day, a]) => ({ day, value: a.s / a.n })).sort((a, b) => a.day - b.day);
  const real = list.some((m) => m.source === 'apple-watch-export' || m.source === 'apple-watch-live');
  return { points, unit: list[0].unit, real, empty: points.length === 0 };
}

function lastAtOrBefore(points: DayPoint[], day: number): DayPoint | null {
  let hit: DayPoint | null = null;
  for (const p of points) { if (p.day <= day) hit = p; else break; }
  return hit;
}

function spo2Color(v: number): Color {
  return v < SPO2_RED ? 'red' : v < SPO2_REF ? 'amber' : 'green';
}

const VITALS: { type: Measurement['type']; label: string; digits: number }[] = [
  { type: 'RestingHeartRate', label: 'FC repos', digits: 0 },
  { type: 'HeartRateVariabilitySDNN', label: 'VFC', digits: 0 },
  { type: 'AppleSleepingWristTemperature', label: 'T° poignet', digits: 1 },
  { type: 'SleepAnalysis', label: 'Sommeil', digits: 1 },
];

export function Spo2Widget(): JSX.Element {
  const day = useBody((s) => s.day);

  const spo2 = useMemo(() => toDaily(getWatchSeries('OxygenSaturation')), []);
  const vitals = useMemo(() => VITALS.map((v) => ({ ...v, series: toDaily(getWatchSeries(v.type)) })), []);

  const cur = lastAtOrBefore(spo2.points, day);
  const stale = cur !== null && cur.day < day;
  const provenance: Provenance = spo2.real ? 'RÉEL' : 'SIMULÉ';

  const win = cur ? spo2.points.filter((p) => p.day <= cur.day && p.day > cur.day - WINDOW) : [];
  const week = cur ? spo2.points.filter((p) => p.day <= cur.day && p.day > cur.day - 7) : [];
  const wMin = week.length ? Math.min(...week.map((p) => p.value)) : NaN;
  const wMax = week.length ? Math.max(...week.map((p) => p.value)) : NaN;
  const color: Color = cur ? spo2Color(cur.value) : 'grey';
  const valueColor = color === 'green' ? 'var(--sz-text)' : statusColor[color];

  const yLow = Math.min(93, Math.floor(Math.min(...win.map((p) => p.value), 100)) - 1);
  const mono = { fontFamily: tokens.font.mono, fontSize: 9, fill: tokens.color.textDim } as const;
  const x0 = cur ? Math.max(0, cur.day - WINDOW + 1) : 0;
  const x1 = cur ? Math.max(cur.day, x0 + 6) : WINDOW;

  return (
    <Panel sys="WATCH-01" title="SpO₂" provenance={provenance} className="sw">
      {!cur ? (
        <div className="sw-none">DONNÉES INSUFFISANTES</div>
      ) : (
        <>
          <div className="sw-head">
            <div className="sw-big" style={{ color: valueColor }}>
              <span className="sw-big__num">{fmt(cur.value, 0)}</span>
              <span className="sw-big__unit">%</span>
            </div>
            <div className="sw-side">
              <div className="sw-side__line">
                <span className="sw-status" style={{ background: statusColor[color] }} />
                <span>{stale ? `DERNIÈRE MESURE ${fmtDay(cur.day)}` : `MESURE ${fmtDay(cur.day)}`}</span>
              </div>
              <div className="sw-side__line sw-side__line--dim">
                <span>7 J</span>
                <span className="sw-side__val">{fmt(wMin, 0)} – {fmt(wMax, 0)} %</span>
              </div>
              <div className="sw-side__line sw-side__line--dim">
                <span>O₂ SANG</span>
                {spo2.real ? <span className="sw-side__val">MONTRE</span> : <TagBadge tag="Persona" />}
              </div>
            </div>
          </div>

          <div className="sw-chart">
            <ResponsiveContainer width="100%" height={76}>
              <AreaChart data={win} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <XAxis
                  dataKey="day"
                  type="number"
                  domain={[x0, x1]}
                  ticks={[x0, Math.round((x0 + x1) / 2), x1]}
                  tick={mono}
                  tickFormatter={(d: number) => fmtDay(d)}
                  stroke={tokens.color.border}
                  tickLine={false}
                  height={16}
                />
                <YAxis
                  type="number"
                  domain={[yLow, 100]}
                  ticks={[SPO2_REF, 100]}
                  tick={mono}
                  stroke={tokens.color.border}
                  tickLine={false}
                  width={26}
                />
                <ReferenceLine y={SPO2_REF} stroke={tokens.color.textDim} strokeDasharray="3 3" />
                <Area
                  dataKey="value"
                  type="linear"
                  stroke={color === 'green' ? tokens.color.text : statusColor[color]}
                  strokeWidth={1.25}
                  fill={tokens.color.text}
                  fillOpacity={0.06}
                  baseValue={yLow}
                  dot={false}
                  activeDot={false}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="sw-caption">
            <span>{WINDOW} J → {fmtDay(cur.day)}</span>
            <span>- - RÉF. {SPO2_REF} % <TagBadge tag="Publié" /></span>
          </div>

          <div className="sw-vitals">
            {vitals.map((v) => {
              const p = lastAtOrBefore(v.series.points, day);
              return (
                <div className="sw-vital" key={v.type} title={p ? `${v.label} — ${fmtDay(p.day)} (${v.series.real ? 'réel' : 'simulé'})` : v.label}>
                  <span className="sw-vital__label">{v.label}</span>
                  {p ? (
                    <span className="sw-vital__val">
                      {fmt(p.value, v.digits)}
                      <span className="sw-vital__unit">{v.series.unit}</span>
                    </span>
                  ) : (
                    <span className="sw-vital__val sw-vital__val--none">—</span>
                  )}
                </div>
              );
            })}
          </div>
          {stale ? <div className="sw-stale">AUTRES CONSTANTES : DERNIÈRE MESURE {fmtDay(cur.day)} — PAS DE PROJECTION</div> : null}
        </>
      )}
    </Panel>
  );
}
