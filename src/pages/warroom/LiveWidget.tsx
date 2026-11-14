// Propriétaire : Ahmed (B). Dernière mesure (pouls / oxygène) vs référence 30 j du présentateur.
// Repli 1 : dernière mesure enregistrée (export). Repli 2 : saisie manuelle. Jamais de vert par défaut.
// Référence simulée → aucun écart affiché. Mesure de plus de 10 min → jamais « en direct », chiffre en gris.
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { Measurement } from '../../types';
import { latestLive, postManual } from '../../ingest/live';
import { getPresenterSeries, getRealBaseline, getRealSeries, simulatedSeries } from '../../ingest/realData';
import { baseline30d, zScore } from '../../ingest/baseline30d';
import { parseHealthExport } from '../../ingest/healthExport';
import { setRealData } from '../../ingest/realData';
import { Btn, Panel, Prov, Segmented, T, fr, num } from './ui';

type LiveType = 'HeartRate' | 'OxygenSaturation';
const TYPES = ['HeartRate', 'OxygenSaturation'] as const;
const LABEL: Record<LiveType, string> = { HeartRate: 'Pouls', OxygenSaturation: 'Oxygène sanguin (SpO₂)' };
const SHORT: Record<LiveType, string> = { HeartRate: 'Pouls', OxygenSaturation: 'Oxygène' };
const UNIT: Record<LiveType, string> = { HeartRate: 'bpm', OxygenSaturation: '%' };
const DIGITS: Record<LiveType, number> = { HeartRate: 0, OxygenSaturation: 1 };
const RANGE: Record<LiveType, [number, number]> = { HeartRate: [20, 250], OxygenSaturation: [50, 100] };
const POLL_MS = 3000;
const FRESH_MS = 10 * 60 * 1000;
const CLOCK_MS = 30 * 1000;

function baselineFor(type: LiveType) {
  if (getRealSeries(type).length) return { b: getRealBaseline(type), simulated: false };
  return { b: baseline30d(simulatedSeries(type), type), simulated: true };
}

/** « il y a 4 min », « il y a 3 h », « il y a 2 j ». */
function ago(ms: number): string {
  const min = Math.max(0, Math.floor(ms / 60000));
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 48) return `il y a ${h} h`;
  return `il y a ${Math.floor(h / 24)} j`;
}

const keyOf = (m: Measurement | null | undefined) => (m ? `${m.value}@${m.date}` : '');

export function LiveWidget({ dataVersion }: { dataVersion: number }) {
  const [live, setLive] = useState<Partial<Record<LiveType, Measurement>>>({});
  const [manual, setManual] = useState<Partial<Record<LiveType, Measurement>>>({});
  const [now, setNow] = useState(() => Date.now());
  const lastKey = useRef('');

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
    return () => {
      stop = true;
      clearInterval(id);
      clearInterval(clock);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  return (
    <Panel title="Dernière mesure" prov={<Prov p="RÉEL — NON NASA" />}>
      <div style={{ display: 'grid', gap: 20 }}>
        {TYPES.map((t) => (
          <LiveRow key={t} type={t} dataVersion={dataVersion} now={now} live={live[t] ?? null} manual={manual[t] ?? null} />
        ))}
      </div>
      <ManualEntry onSave={(m) => { setNow(Date.now()); setManual((s) => ({ ...s, [m.type as LiveType]: m })); }} />
    </Panel>
  );
}

function LiveRow({ type, dataVersion, now, live, manual }: {
  type: LiveType; dataVersion: number; now: number; live: Measurement | null; manual: Measurement | null;
}) {
  const { b, simulated } = useMemo(() => baselineFor(type), [type, dataVersion]);
  const recorded = useMemo(() => getPresenterSeries(type).at(-1) ?? null, [type, dataVersion]);
  // Priorité : la plus récente entre direct (montre) et saisie manuelle, sinon dernière mesure enregistrée.
  const newest = [live, manual].filter((x): x is Measurement => !!x).sort((x, y) => Date.parse(y.date) - Date.parse(x.date))[0] ?? null;
  const m = newest ?? recorded;

  const age = m ? now - Date.parse(m.date) : Infinity;
  const fresh = age < FRESH_MS;
  // Pas d'écart calculé contre une référence simulée : ce serait une fausse précision.
  const z = m && !simulated && b.n > 0 ? zScore(m.value, b) : null;
  const zc = z == null ? T.status.grey : Math.abs(z) >= 3 ? T.status.red : Math.abs(z) >= 2 ? T.status.amber : T.text;

  let origin: string;
  if (!m) origin = 'Aucune mesure';
  else if (m.source === 'apple-watch-live') {
    origin = fresh ? 'En direct · montre' : `Dernière mesure ${ago(age)}`;
  } else {
    const base = m.source === 'manual' ? 'Saisie manuelle' : m.source === 'simulated' ? 'Simulée' : "Dernière mesure de l'export";
    const when = fresh
      ? new Date(m.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
      : ago(age);
    origin = `${base} · ${when}`;
  }

  const unit = UNIT[type];
  const d = DIGITS[type];
  const ref = simulated
    ? 'Pas de référence personnelle'
    : b.n > 0
      ? `Habituel (30 j) : ${fr(b.mean, d)} ± ${fr(b.sd, d)} ${unit} · ${fr(b.n, 0)} mesures`
      : 'Pas assez de mesures pour comparer';

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 4, alignItems: 'end' }}>
      <div>
        <div style={{ fontSize: 15, fontWeight: 500, color: T.text }}>{LABEL[type]}</div>
        <div style={{ fontSize: 13, color: T.textMuted, marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>{origin}</div>
        <div style={{ ...num, fontSize: 'clamp(28px, 2.6vw, 36px)', color: m && fresh ? T.text : T.status.grey, lineHeight: 1.1, marginTop: 8, letterSpacing: '-0.01em' }}>
          {m ? fr(m.value, d) : '—'} <span style={{ fontSize: 15, color: T.textMuted, fontWeight: 400 }}>{unit}</span>
        </div>
        <div style={{ fontSize: 13, color: T.textDim, marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>
          {ref}
          {z != null && <span style={{ color: zc }}> · {z > 0 ? '+' : ''}{fr(z, 1)} écarts-types</span>}
        </div>
      </div>
      {m && <Prov p={m.source === 'simulated' ? 'SIMULÉ' : 'RÉEL'} />}
    </div>
  );
}

function ManualEntry({ onSave }: { onSave: (m: Measurement) => void }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<LiveType>('HeartRate');
  const [value, setValue] = useState('');
  const helpId = useId();
  const v = Number(value.replace(',', '.'));
  const [lo, hi] = RANGE[type];
  const ok = value.trim() !== '' && Number.isFinite(v) && v >= lo && v <= hi;
  const outOfRange = value.trim() !== '' && !ok;

  if (!open) return <Btn kind="secondary" style={{ marginTop: 20 }} onClick={() => setOpen(true)}>Saisie manuelle</Btn>;
  const save = async () => {
    if (!ok) return;
    const m: Measurement = { type, value: v, unit: UNIT[type], date: new Date().toISOString(), source: 'manual' };
    onSave(m); // fonctionne même sans serveur (démo en mode avion)
    await postManual({ type, value: v, unit: UNIT[type], date: m.date });
    setValue('');
    setOpen(false);
  };
  return (
    <div style={{ display: 'flex', gap: 8, marginTop: 20, flexWrap: 'wrap', alignItems: 'flex-start' }}>
      <div style={{ minWidth: 200 }}>
        <Segmented values={TYPES} value={type} onChange={setType} ariaLabel="Type de mesure" render={(t) => SHORT[t]} />
      </div>
      <div style={{ display: 'grid', gap: 4 }}>
        <input
          inputMode="decimal"
          aria-label={`Valeur (${UNIT[type]})`}
          aria-describedby={helpId}
          aria-invalid={outOfRange || undefined}
          placeholder={UNIT[type]}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && save()}
          style={{ width: 96, minHeight: 44, boxSizing: 'border-box', background: T.panelRaised, color: T.text, border: `1px solid ${T.borderStrong}`, padding: '0 12px', fontFamily: T.fontText, fontSize: 15, fontVariantNumeric: 'tabular-nums', borderRadius: T.radius.control }}
        />
        <span id={helpId} style={{ fontSize: 13, color: outOfRange ? T.status.amber : T.textMuted, fontVariantNumeric: 'tabular-nums' }}>
          Plage {lo}–{hi} {UNIT[type]}
        </span>
      </div>
      <Btn kind="primary" disabled={!ok} onClick={save}>Enregistrer</Btn>
      <Btn kind="quiet" onClick={() => setOpen(false)}>Annuler</Btn>
    </div>
  );
}

/** Import d'export.zip / export.xml dans l'app (secours si presenter.json n'a pas été généré). */
export function WatchImport({ onImported, hasData }: { onImported: () => void; hasData: boolean }) {
  const [pct, setPct] = useState<number | null>(null);
  const [msg, setMsg] = useState<{ text: string; warn: boolean } | null>(null);
  const [focusRing, setFocusRing] = useState(false);
  const busy = useRef(false);
  const running = pct !== null;

  const onFile = async (input: HTMLInputElement) => {
    const f = input.files?.[0];
    input.value = ''; // permet de réimporter le même fichier
    if (!f || busy.current) return;
    busy.current = true;
    setPct(0);
    setMsg(null);
    const t0 = performance.now();
    try {
      const ms = await parseHealthExport(f, setPct);
      if (ms.length === 0) {
        setMsg({ text: 'Aucune mesure Apple Watch trouvée dans ce fichier', warn: true });
        return;
      }
      setRealData(ms);
      const count = (t: Measurement['type']) => fr(ms.filter((m) => m.type === t).length, 0);
      const secs = fr((performance.now() - t0) / 1000, 1);
      setMsg({
        text: `${fr(ms.length, 0)} mesures en ${secs} s — pouls au repos ${count('RestingHeartRate')} · variabilité cardiaque ${count('HeartRateVariabilitySDNN')} · VO₂max ${count('VO2Max')} · oxygène ${count('OxygenSaturation')} · pouls ${count('HeartRate')}`,
        warn: false,
      });
      onImported();
    } catch (e) {
      setMsg({ text: `Import impossible : ${(e as Error).message}`, warn: true });
    } finally {
      busy.current = false;
      setPct(null);
    }
  };

  return (
    <Panel title="Données Apple Watch" prov={<Prov p="RÉEL" />}>
      <p style={{ margin: '0 0 16px', fontSize: 15, color: T.textDim }}>
        {hasData ? 'Export du présentateur chargé' : 'Aucun export chargé, les valeurs affichées sont simulées'}
      </p>
      <label
        className="wr-btn"
        aria-busy={running}
        style={{
          position: 'relative', fontFamily: T.fontText, fontSize: 15, fontWeight: 500, color: T.text, background: T.panelRaised,
          border: `1px solid ${T.border}`, borderRadius: T.radius.control, padding: '0 16px', minHeight: 44,
          display: 'inline-flex', alignItems: 'center', cursor: running ? 'default' : 'pointer', opacity: running ? 0.35 : 1,
          outline: focusRing ? `2px solid ${T.text}` : undefined, outlineOffset: 2,
        }}
      >
        {running ? 'Import en cours…' : "Importer l'export Santé (.zip ou .xml)"}
        <input
          type="file"
          className="wr-sr-only"
          accept=".zip,.xml,application/zip,text/xml"
          disabled={running}
          onFocus={(e) => setFocusRing(e.currentTarget.matches(':focus-visible'))}
          onBlur={() => setFocusRing(false)}
          onChange={(e) => onFile(e.currentTarget)}
        />
      </label>
      {running && (
        <div style={{ marginTop: 16, height: 4, borderRadius: T.radius.pill, overflow: 'hidden', background: T.border }} role="progressbar" aria-label="Progression de l'import" aria-valuenow={pct ?? 0} aria-valuemin={0} aria-valuemax={100}>
          <div style={{ width: '100%', height: '100%', background: T.text, transform: `scaleX(${(pct ?? 0) / 100})`, transformOrigin: 'left', transition: 'transform 120ms linear' }} />
        </div>
      )}
      {msg && (
        <p role="status" style={{ margin: '16px 0 0', fontSize: 13, color: msg.warn ? T.status.amber : T.textDim, lineHeight: 1.45, fontVariantNumeric: 'tabular-nums' }}>
          {msg.text}
        </p>
      )}
    </Panel>
  );
}
