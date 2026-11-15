// Propriétaire : Ahmed (B). Dernière mesure (FC / SpO₂) vs référence 30 j du présentateur.
// Repli 1 : dernière mesure enregistrée (export). Repli 2 : montre simulée du jour, la même série que la page Corps.
// Jamais de vert par défaut. Référence simulée → aucun écart affiché. Mesure de plus de 10 min → chiffre en gris.
// « En direct » (pastille verte) seulement si la montre a envoyé la mesure il y a moins de 15 s, comme sur la montre.
// Le pied du panneau alimente les mesures : saisie manuelle ou import d'un export Santé.
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { Measurement } from '../../types';
import { latestLive, postManual } from '../../ingest/live';
import { onServerChange } from '../../ingest/events';
import { MISSION_TODAY } from '../../ingest/checkin';
import { getRealBaseline, getRealSeries } from '../../ingest/realData';
import { zScore } from '../../ingest/baseline30d';
import { getWatchSeries } from '../../sim/load';
import { Panel, ProvenanceBadge, fmt } from '../../ui';
import { Btn, Dot, Segmented } from './ui';

type LiveType = 'HeartRate' | 'OxygenSaturation';
const TYPES = ['HeartRate', 'OxygenSaturation'] as const;
// Mêmes libellés et mêmes arrondis que la page Corps.
const LABEL: Record<LiveType, string> = { HeartRate: 'HR', OxygenSaturation: 'SpO₂' };
const UNIT: Record<LiveType, string> = { HeartRate: 'bpm', OxygenSaturation: '%' };
const DIGITS: Record<LiveType, number> = { HeartRate: 0, OxygenSaturation: 0 };
const RANGE: Record<LiveType, [number, number]> = { HeartRate: [20, 250], OxygenSaturation: [50, 100] };
const POLL_MS = 3000;
const FRESH_MS = 10 * 60 * 1000; // au-delà, le chiffre passe en gris
const LIVE_MS = 15 * 1000;        // « En direct » : pas de faux direct
const CLOCK_MS = 3000;            // fait vieillir « En direct » et « il y a … »
const TRACE_MAX = 60;             // points de la séance en cours (≈ 2 min à un envoi / 2 s)

/** « il y a 40 s », « il y a 4 min », « il y a 3 h », « il y a 2 j ». */
function ago(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  if (s < 60) return `${s} s ago`;
  const min = Math.floor(s / 60);
  if (min < 60) return `${min} min ago`;
  const h = Math.floor(min / 60);
  if (h < 48) return `${h} h ago`;
  return `${Math.floor(h / 24)} d ago`;
}

const keyOf = (m: Measurement | null | undefined) => (m ? `${m.value}@${m.date}` : '');

interface Shown { m: Measurement | null; simulated: boolean }

/** Mesure affichée : la plus récente entre direct et saisie, sinon le dernier export, sinon la montre simulée du jour (= Corps). */
function pick(type: LiveType, live: Measurement | null, manual: Measurement | null): Shown {
  const newest = [live, manual].filter((x): x is Measurement => !!x).sort((x, y) => Date.parse(y.date) - Date.parse(x.date))[0] ?? null;
  if (newest) return { m: newest, simulated: newest.source === 'simulated' };
  const real = getRealSeries(type).at(-1);
  if (real) return { m: real, simulated: real.source === 'simulated' };
  const sim = getWatchSeries(type);
  return { m: sim[MISSION_TODAY] ?? sim.at(-1) ?? null, simulated: true };
}

export function LiveWidget({ dataVersion }: { dataVersion: number }) {
  const [live, setLive] = useState<Partial<Record<LiveType, Measurement>>>({});
  const [manual, setManual] = useState<Partial<Record<LiveType, Measurement>>>({});
  const [now, setNow] = useState(() => Date.now());
  // Pouls reçus de la montre pendant que la page est ouverte : de vraies mesures, rien d'interpolé.
  const [trace, setTrace] = useState<number[]>([]);
  const lastKey = useRef('');
  const lastHr = useRef('');

  useEffect(() => {
    let stop = false;
    let running = false;
    const tick = async () => {
      if (document.hidden || running) return;
      running = true;
      try {
        const [hr, spo2] = await Promise.all([latestLive('HeartRate'), latestLive('OxygenSaturation')]);
        if (stop) return;
        const k = keyOf(hr) + '|' + keyOf(spo2);
        if (k !== lastKey.current) {
          lastKey.current = k;
          setLive({ ...(hr ? { HeartRate: hr } : {}), ...(spo2 ? { OxygenSaturation: spo2 } : {}) });
          setNow(Date.now());
        }
        if (hr && hr.source === 'apple-watch-live' && hr.date !== lastHr.current) {
          lastHr.current = hr.date;
          setTrace((t) => [...t, hr.value].slice(-TRACE_MAX));
        }
      } finally {
        running = false;
      }
    };
    const onVisible = () => { if (!document.hidden) { setNow(Date.now()); tick(); } };
    tick();
    const id = setInterval(tick, POLL_MS);
    // Horloge lente : fait vieillir « il y a … » et bascule en gris sans re-rendu toutes les 3 s.
    const clock = setInterval(() => { if (!document.hidden) setNow(Date.now()); }, CLOCK_MS);
    document.addEventListener('visibilitychange', onVisible);
    const offLive = onServerChange(['live'], tick); // pouls reçu de la montre → affiché tout de suite
    return () => {
      stop = true;
      offLive();
      clearInterval(id);
      clearInterval(clock);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  const shown = useMemo(
    () => TYPES.map((t) => ({ type: t, ...pick(t, live[t] ?? null, manual[t] ?? null) })),
    [live, manual, dataVersion],
  );
  const anyReal = shown.some((x) => x.m && !x.simulated);

  return (
    <Panel title="Latest reading" provenance={anyReal ? 'RÉEL' : 'SIMULÉ'}>
      {shown.map((x) => (
        <LiveRow key={x.type} type={x.type} m={x.m} simulated={x.simulated} flag={anyReal && x.simulated} dataVersion={dataVersion} now={now}
          trace={x.type === 'HeartRate' ? trace : undefined} />
      ))}
      <WatchSnapshot now={now} />
      <Feed onSave={(m) => { setNow(Date.now()); setManual((s) => ({ ...s, [m.type as LiveType]: m })); }} />
    </Panel>
  );
}

function LiveRow({ type, m, simulated, flag, dataVersion, now, trace }: {
  type: LiveType; m: Measurement | null; simulated: boolean; flag: boolean; dataVersion: number; now: number; trace?: number[];
}) {
  // Référence personnelle : seulement sur des mesures réelles (pas d'écart contre du simulé : fausse précision).
  const b = useMemo(() => (getRealSeries(type).length ? getRealBaseline(type) : null), [type, dataVersion]);

  if (!m) {
    return (
      <div className="wr-metric">
        <span className="sz-label">{LABEL[type]}</span>
        <span className="wr-note wr-metric__side">{type === 'HeartRate' ? 'No reading · start heart rate on the watch' : 'No reading'}</span>
      </div>
    );
  }

  const age = now - Date.parse(m.date);
  const fresh = age < FRESH_MS;
  const watch = m.source === 'apple-watch-live';
  const isLive = watch && age < LIVE_MS;
  const z = !simulated && b && b.n > 0 ? zScore(m.value, b) : null;
  const zLevel = z == null ? undefined : Math.abs(z) >= 3 ? 'red' : Math.abs(z) >= 2 ? 'amber' : undefined;
  const when = fresh ? new Date(m.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }) : ago(age);
  const origin = watch ? (isLive ? 'Live' : `Watch · ${ago(age)}`)
    : m.source === 'manual' ? `Manual entry · ${when}`
    // série simulée : pas d'heure (elle serait calculée contre l'horloge réelle, donc fausse) et la mention reste visible
    : simulated ? 'Daily reading'
    : `Export · ${when}`;

  const unit = UNIT[type];
  const d = DIGITS[type];
  // L'absence de référence personnelle n'est expliquée qu'en mode Détails.
  const ref = b && b.n > 0 && !simulated
    ? { real: true, text: `30-d usual: ${fmt(b.mean, d)} ± ${fmt(b.sd, d)} ${unit}` }
    : { real: false, text: simulated ? 'No personal baseline' : 'Not enough readings to compare' };

  return (
    <div className="wr-metric">
      <span className="sz-label">{LABEL[type]}</span>
      <span className="wr-note wr-metric__side" role={watch ? 'status' : undefined}>
        {isLive && <Dot color="green" />}
        {origin}
        {flag && <ProvenanceBadge value="SIMULÉ" />}
      </span>
      <span className={`sz-value wr-readout${watch ? ' sz-readout' : ''}`} data-stale={!fresh}>
        {fmt(m.value, d)} <span className="sz-unit">{unit}</span>
      </span>
      <span className={`wr-note wr-metric__side${ref.real ? '' : ' sz-detail'}`}>
        {ref.text}
        {z != null && <span className="wr-z" data-z={zLevel}> · {z > 0 ? '+' : ''}{fmt(z, 1)} σ</span>}
      </span>
      {watch && trace && trace.length >= 3 && <Trace values={trace} stale={!isLive} />}
    </div>
  );
}

// Instantané santé envoyé par l'app montre (« Envoyer mes données ») : dernière valeur de chaque mesure dans Santé.
// N'apparaît que si de vraies mesures sont arrivées ; une mesure absente n'est pas affichée (rien d'inventé).
const SNAPSHOT: { type: Measurement['type']; label: string; digits: number }[] = [
  { type: 'RestingHeartRate', label: 'Resting HR', digits: 0 },
  { type: 'HeartRateVariabilitySDNN', label: 'HRV', digits: 0 },
  { type: 'VO2Max', label: 'VO₂max', digits: 1 },
  { type: 'SleepAnalysis', label: 'Sleep', digits: 1 },
  { type: 'AppleSleepingWristTemperature', label: 'Wrist temp.', digits: 2 },
];
const SNAPSHOT_POLL_MS = 5000;

function WatchSnapshot({ now }: { now: number }) {
  const [ms, setMs] = useState<Measurement[]>([]);
  const lastKey = useRef('');

  useEffect(() => {
    let stop = false;
    const tick = async () => {
      if (document.hidden) return;
      const got = await Promise.all(SNAPSHOT.map((s) => latestLive(s.type)));
      if (stop) return;
      const real = got.filter((m): m is Measurement => !!m && m.source !== 'simulated');
      const k = real.map(keyOf).join('|');
      if (k !== lastKey.current) { lastKey.current = k; setMs(real); }
    };
    tick();
    const id = setInterval(tick, SNAPSHOT_POLL_MS);
    return () => { stop = true; clearInterval(id); };
  }, []);

  if (ms.length === 0) return null;
  return (
    <div className="wr-metric">
      <span className="sz-label">Sent by the watch</span>
      <span className="wr-note wr-metric__side">Latest values from Health</span>
      <dl className="wr-snapshot wr-metric__full">
        {SNAPSHOT.map((s) => {
          const m = ms.find((x) => x.type === s.type);
          if (!m) return null;
          return (
            <div key={s.type} className="wr-snapshot__row">
              <dt className="wr-note">{s.label}</dt>
              <dd className="wr-snapshot__value">{fmt(m.value, s.digits)} <span className="sz-unit">{m.unit}</span></dd>
              <dd className="wr-note">{ago(now - Date.parse(m.date))}</dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}

/** Tracé de la séance en cours : les pouls reçus de la montre, à l'échelle de leurs propres min et max. */
function Trace({ values, stale }: { values: number[]; stale: boolean }) {
  const W = 320;
  const H = 32;
  const lo = Math.min(...values) - 2;
  const hi = Math.max(...values) + 2;
  const x = (i: number) => (i / (values.length - 1)) * W;
  const y = (v: number) => 2 + (1 - (v - lo) / (hi - lo)) * (H - 4);
  const pts = values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  return (
    <svg className="wr-trace wr-metric__full" data-stale={stale} viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none"
      role="img" aria-label={`${values.length} heart-rate readings from the watch, ${fmt(Math.min(...values), 0)} to ${fmt(Math.max(...values), 0)} bpm`}>
      <polyline points={pts} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/** Saisie manuelle de secours pour la présentation : visible seulement avec ?demo dans l'URL. Jamais marquée « Live ». */
const DEMO = typeof location !== 'undefined' && new URLSearchParams(location.search).has('demo');

function Feed({ onSave }: { onSave: (m: Measurement) => void }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<LiveType>('HeartRate');
  const [value, setValue] = useState('');
  const helpId = useId();
  const v = Number(value.replace(',', '.'));
  const [lo, hi] = RANGE[type];
  const ok = value.trim() !== '' && Number.isFinite(v) && v >= lo && v <= hi;
  const outOfRange = value.trim() !== '' && !ok;

  const save = async () => {
    if (!ok) return;
    const m: Measurement = { type, value: v, unit: UNIT[type], date: new Date().toISOString(), source: 'manual' };
    onSave(m); // fonctionne même sans serveur
    await postManual({ type, value: v, unit: UNIT[type], date: m.date });
    setValue('');
    setOpen(false);
  };

  if (!DEMO) return null;
  return (
    <div className="wr-manual">
      {open ? (
        <>
          <Segmented values={TYPES} value={type} onChange={setType} ariaLabel="Reading type" render={(t) => LABEL[t]} />
          <input
            className="sz-input"
            inputMode="decimal"
            aria-label={`Value (${UNIT[type]})`}
            aria-describedby={helpId}
            aria-invalid={outOfRange || undefined}
            placeholder={UNIT[type]}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && save()}
          />
          <span id={helpId} className={`wr-note${outOfRange ? ' wr-warn' : ''}`}>Range {lo}–{hi} {UNIT[type]}</span>
          <Btn disabled={!ok} onClick={save}>Save</Btn>
          <Btn kind="quiet" onClick={() => setOpen(false)}>Cancel</Btn>
        </>
      ) : (
        <Btn onClick={() => setOpen(true)}>Manual entry</Btn>
      )}
    </div>
  );
}
