// Panneau « Constantes » (montre) : SpO₂ et sa courbe, puis FC de repos, VFC, température, sommeil.
// La provenance est DÉRIVÉE de Measurement.source : dès que l'export réel de la montre
// remplace la série simulée, le badge passe à « Réel » sans toucher à ce fichier.
import { useMemo } from 'react';
import type { JSX } from 'react';
import { Line, LineChart, ReferenceLine, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import type { Color, Measurement, Provenance } from '../../../types';
import { DAY_TODAY, MISSION_START_DATE } from '../../../mocks/mission';
import { getWatchSeries } from '../../../sim/load';
import { baseline30d } from '../../../ingest/baseline30d';
import { Panel, StatusChip, TagBadge, fmt, fmtDay, statusColor, statusVar, tokens } from '../../../ui';
import { useBody } from '../store';
import './Spo2Widget.css';

const DAY_MS = 86_400_000;
const T0 = Date.parse(`${MISSION_START_DATE}T00:00:00Z`);
const SPO2_REF = 95;      // repère d'attention de l'équipe [H] (aucune source citée dans content/standards)
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

const VITALS: { type: Measurement['type']; label: string; full: string; digits: number }[] = [
  { type: 'RestingHeartRate', label: 'FC repos', full: 'Fréquence cardiaque de repos', digits: 0 },
  { type: 'HeartRateVariabilitySDNN', label: 'VFC', full: 'Variabilité de la fréquence cardiaque', digits: 0 },
  { type: 'AppleSleepingWristTemperature', label: 'Temp.', full: 'Température au poignet pendant le sommeil', digits: 1 },
  { type: 'SleepAnalysis', label: 'Sommeil', full: 'Durée de sommeil', digits: 1 },
];

/** Unités d'export Apple Santé → affichage. */
const UNIT_LABEL: Record<string, string> = { 'count/min': 'bpm', degC: '°C', hr: 'h' };

export function Spo2Widget(): JSX.Element {
  const day = useBody((s) => s.day);

  const spo2 = useMemo(() => toDaily(getWatchSeries('OxygenSaturation')), []);
  // référence personnelle 30 j (§7 baseline30d) : même appel quand l'export réel de la montre sera branché
  const base = useMemo(() => baseline30d(getWatchSeries('OxygenSaturation'), 'OxygenSaturation'), []);
  const vitals = useMemo(() => VITALS.map((v) => ({ ...v, series: toDaily(getWatchSeries(v.type)) })), []);

  const cur = lastAtOrBefore(spo2.points, day);
  const stale = cur !== null && cur.day < day;
  const provenance: Provenance = spo2.real ? 'RÉEL' : 'SIMULÉ';

  const win = cur ? spo2.points.filter((p) => p.day <= cur.day && p.day > cur.day - WINDOW) : [];
  const week = cur ? spo2.points.filter((p) => p.day <= cur.day && p.day > cur.day - 7) : [];
  const wMin = week.length ? Math.min(...week.map((p) => p.value)) : NaN;
  const wMax = week.length ? Math.max(...week.map((p) => p.value)) : NaN;
  const color: Color = cur ? spo2Color(cur.value) : 'grey';
  const low = color === 'amber' || color === 'red';

  const yLow = Math.min(93, Math.floor(Math.min(...win.map((p) => p.value), 100)) - 1);
  const tick = { fontFamily: tokens.font.mono, fontSize: tokens.size.xs, fill: tokens.color.textMuted } as const;
  const x0 = cur ? Math.max(0, cur.day - WINDOW + 1) : 0;
  const x1 = cur ? Math.max(cur.day, x0 + 1) : WINDOW;
  // Une seule mesure : ni courbe ni intervalle sur 7 jours, la valeur suffit.
  const hasTrend = win.length >= 2;
  const baseText = base.n > 0 && Number.isFinite(base.mean) ? `${fmt(base.mean, 1)} ± ${fmt(base.sd, 1)} %` : 'indisponible';

  return (
    <Panel title="Constantes" provenance={provenance} className="sw">
      {!cur ? (
        <p className="sw-none">Aucune mesure à cette date.</p>
      ) : (
        <>
          <div className="sw-head">
            <div className="sw-main">
              <span className="sz-label">SpO₂</span>
              <div className="sw-big">
                <span className="sz-readout" style={low ? { color: statusVar[color] } : undefined}>{fmt(cur.value, 0)}</span>
                <span className="sz-unit">%</span>
                {low ? <StatusChip color={color} label={color === 'red' ? 'Basse' : 'Attention'} /> : null}
              </div>
            </div>
            {hasTrend ? (
              <div className="sw-week">
                <span className="sz-label">7 j</span>
                <span className="sw-week__val">{fmt(wMin, 0) === fmt(wMax, 0) ? fmt(wMin, 0) : `${fmt(wMin, 0)} – ${fmt(wMax, 0)}`} <span className="sz-unit">%</span></span>
              </div>
            ) : null}
          </div>
          {stale ? <p className="sw-stale">Dernière mesure : {fmtDay(cur.day)}</p> : null}

          {hasTrend ? (
            <div
              className="sw-chart sz-ecg"
              role="img"
              aria-label={`SpO₂ sur ${WINDOW} jours, jusqu’à ${fmtDay(cur.day)}`}
              title={`Repère d’attention ${SPO2_REF} % (hypothèse de l’équipe) · référence personnelle 30 j : ${baseText}`}
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={win} margin={{ top: 8, right: 16, bottom: 2, left: 2 }}>
                  <XAxis
                    dataKey="day"
                    type="number"
                    domain={[x0, x1]}
                    ticks={[...new Set([x0, Math.round((x0 + x1) / 2), x1])]}
                    tick={tick}
                    tickFormatter={(d: number) => fmtDay(d)}
                    stroke={tokens.color.border}
                    tickLine={false}
                    height={18}
                  />
                  <YAxis
                    type="number"
                    domain={[yLow, 100]}
                    ticks={[SPO2_REF, 100]}
                    interval={0}
                    tick={tick}
                    stroke={tokens.color.border}
                    tickLine={false}
                    width={30}
                  />
                  <ReferenceLine y={SPO2_REF} stroke={tokens.color.borderStrong} strokeDasharray="3 3" />
                  <Line
                    dataKey="value"
                    type="linear"
                    stroke={low ? statusColor[color] : tokens.color.text}
                    strokeWidth={1.5}
                    dot={false}
                    activeDot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : null}

          {/* Mode Détails : une seule ligne (le détail complet est dans l'infobulle du graphique) */}
          <p className="sw-meta sz-detail" title={spo2.real ? 'Source : export de la montre' : 'Source : série du scénario de mission (fictive)'}>
            <span>Repère {SPO2_REF} % <TagBadge tag="H" /></span>
            <span>Réf. 30 j <span className="sw-meta__val">{baseText}</span></span>
          </p>

          <dl className="sw-vitals">
            {vitals.map((v) => {
              const p = lastAtOrBefore(v.series.points, day);
              return (
                <div className="sw-vital" key={v.type} title={p ? `${v.full} · ${fmtDay(p.day)} (${v.series.real ? 'réel' : 'simulé'})` : v.full}>
                  <dt className="sz-label">{v.label}</dt>
                  {p ? (
                    <dd className="sw-vital__val">
                      {fmt(p.value, v.digits)} <span className="sz-unit">{UNIT_LABEL[v.series.unit] ?? v.series.unit}</span>
                    </dd>
                  ) : (
                    <dd className="sw-vital__val sw-vital__val--none">—</dd>
                  )}
                </div>
              );
            })}
          </dl>
        </>
      )}
    </Panel>
  );
}
