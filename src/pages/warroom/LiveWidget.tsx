// Propriétaire : Ahmed (B). Dernière mesure (FC / SpO₂) vs référence 30 j du présentateur.
// Repli 1 : dernière mesure enregistrée (export). Repli 2 : montre simulée du jour, la même série que la page Corps.
// Jamais de vert par défaut. Référence simulée → aucun écart affiché. Mesure de plus de 10 min → chiffre en gris.
// Le pied du panneau alimente les mesures : saisie manuelle ou import d'un export Santé.
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { Measurement } from '../../types';
import { latestLive, postManual } from '../../ingest/live';
import { MISSION_TODAY } from '../../ingest/checkin';
import { getRealBaseline, getRealSeries, setRealData } from '../../ingest/realData';
import { zScore } from '../../ingest/baseline30d';
import { parseHealthExport } from '../../ingest/healthExport';
import { getWatchSeries } from '../../sim/load';
import { Panel, ProvenanceBadge, fmt } from '../../ui';
import { Btn, Segmented } from './ui';

type LiveType = 'HeartRate' | 'OxygenSaturation';
const TYPES = ['HeartRate', 'OxygenSaturation'] as const;
// Mêmes libellés et mêmes arrondis que la page Corps.
const LABEL: Record<LiveType, string> = { HeartRate: 'FC', OxygenSaturation: 'SpO₂' };
const UNIT: Record<LiveType, string> = { HeartRate: 'bpm', OxygenSaturation: '%' };
const DIGITS: Record<LiveType, number> = { HeartRate: 0, OxygenSaturation: 0 };
const RANGE: Record<LiveType, [number, number]> = { HeartRate: [20, 250], OxygenSaturation: [50, 100] };
const POLL_MS = 3000;
const FRESH_MS = 10 * 60 * 1000;
const CLOCK_MS = 30 * 1000;

/** « il y a 4 min », « il y a 3 h », « il y a 2 j ». */
function ago(ms: number): string {
  const min = Math.max(0, Math.floor(ms / 60000));
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 48) return `il y a ${h} h`;
  return `il y a ${Math.floor(h / 24)} j`;
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

export function LiveWidget({ dataVersion, onImported }: { dataVersion: number; onImported: () => void }) {
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

  const shown = useMemo(
    () => TYPES.map((t) => ({ type: t, ...pick(t, live[t] ?? null, manual[t] ?? null) })),
    [live, manual, dataVersion],
  );
  const anyReal = shown.some((x) => x.m && !x.simulated);

  return (
    <Panel title="Dernière mesure" provenance={anyReal ? 'RÉEL' : 'SIMULÉ'}>
      {shown.map((x) => (
        <LiveRow key={x.type} type={x.type} m={x.m} simulated={x.simulated} flag={anyReal && x.simulated} dataVersion={dataVersion} now={now} />
      ))}
      <Feed
        onSave={(m) => { setNow(Date.now()); setManual((s) => ({ ...s, [m.type as LiveType]: m })); }}
        onImported={onImported}
      />
    </Panel>
  );
}

function LiveRow({ type, m, simulated, flag, dataVersion, now }: {
  type: LiveType; m: Measurement | null; simulated: boolean; flag: boolean; dataVersion: number; now: number;
}) {
  // Référence personnelle : seulement sur des mesures réelles (pas d'écart contre du simulé : fausse précision).
  const b = useMemo(() => (getRealSeries(type).length ? getRealBaseline(type) : null), [type, dataVersion]);

  if (!m) {
    return (
      <div className="wr-metric">
        <span className="sz-label">{LABEL[type]}</span>
        <span className="wr-metric__side sz-muted" aria-label="Aucune mesure">—</span>
      </div>
    );
  }

  const age = now - Date.parse(m.date);
  const fresh = age < FRESH_MS;
  const z = !simulated && b && b.n > 0 ? zScore(m.value, b) : null;
  const zLevel = z == null ? undefined : Math.abs(z) >= 3 ? 'red' : Math.abs(z) >= 2 ? 'amber' : undefined;
  const when = fresh ? new Date(m.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ago(age);
  const origin = m.source === 'apple-watch-live' ? (fresh ? 'En direct' : `Montre · ${ago(age)}`)
    : m.source === 'manual' ? `Saisie manuelle · ${when}`
    : simulated ? when
    : `Export · ${when}`;

  const unit = UNIT[type];
  const d = DIGITS[type];
  // L'absence de référence personnelle n'est expliquée qu'en mode Détails.
  const ref = b && b.n > 0 && !simulated
    ? { real: true, text: `Habituel 30 j : ${fmt(b.mean, d)} ± ${fmt(b.sd, d)} ${unit}` }
    : { real: false, text: simulated ? 'Pas de référence personnelle' : 'Pas assez de mesures pour comparer' };

  return (
    <div className="wr-metric">
      <span className="sz-label">{LABEL[type]}</span>
      <span className="wr-note wr-metric__side">
        {origin}
        {flag && <ProvenanceBadge value="SIMULÉ" />}
      </span>
      <span className="sz-value" data-stale={!fresh}>
        {fmt(m.value, d)} <span className="sz-unit">{unit}</span>
      </span>
      <span className={`wr-note wr-metric__side${ref.real ? '' : ' sz-detail'}`}>
        {ref.text}
        {z != null && <span className="wr-z" data-z={zLevel}> · {z > 0 ? '+' : ''}{fmt(z, 1)} σ</span>}
      </span>
    </div>
  );
}

/** Pied du panneau : saisie manuelle et import d'export.zip / export.xml (secours si presenter.json n'a pas été généré). */
function Feed({ onSave, onImported }: { onSave: (m: Measurement) => void; onImported: () => void }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<LiveType>('HeartRate');
  const [value, setValue] = useState('');
  const helpId = useId();
  const v = Number(value.replace(',', '.'));
  const [lo, hi] = RANGE[type];
  const ok = value.trim() !== '' && Number.isFinite(v) && v >= lo && v <= hi;
  const outOfRange = value.trim() !== '' && !ok;

  const [pct, setPct] = useState<number | null>(null);
  const [msg, setMsg] = useState<{ text: string; warn: boolean } | null>(null);
  const busy = useRef(false);
  const running = pct !== null;

  const save = async () => {
    if (!ok) return;
    const m: Measurement = { type, value: v, unit: UNIT[type], date: new Date().toISOString(), source: 'manual' };
    onSave(m); // fonctionne même sans serveur (démo en mode avion)
    await postManual({ type, value: v, unit: UNIT[type], date: m.date });
    setValue('');
    setOpen(false);
  };

  const onFile = async (input: HTMLInputElement) => {
    const f = input.files?.[0];
    input.value = ''; // permet de réimporter le même fichier
    if (!f || busy.current) return;
    busy.current = true;
    setPct(0);
    setMsg(null);
    try {
      const ms = await parseHealthExport(f, setPct);
      if (ms.length === 0) {
        setMsg({ text: 'Aucune mesure de montre trouvée dans ce fichier', warn: true });
        return;
      }
      setRealData(ms);
      const count = (t: Measurement['type']) => fmt(ms.filter((m) => m.type === t).length, 0);
      setMsg({
        text: `${fmt(ms.length, 0)} mesures importées : FC repos ${count('RestingHeartRate')} · VFC ${count('HeartRateVariabilitySDNN')} · VO₂max ${count('VO2Max')} · SpO₂ ${count('OxygenSaturation')} · FC ${count('HeartRate')}`,
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
    <div className="wr-manual">
      {open ? (
        <>
          <Segmented values={TYPES} value={type} onChange={setType} ariaLabel="Type de mesure" render={(t) => LABEL[t]} />
          <input
            className="sz-input"
            inputMode="decimal"
            aria-label={`Valeur (${UNIT[type]})`}
            aria-describedby={helpId}
            aria-invalid={outOfRange || undefined}
            placeholder={UNIT[type]}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && save()}
          />
          <span id={helpId} className={`wr-note${outOfRange ? ' wr-warn' : ''}`}>Plage {lo}–{hi} {UNIT[type]}</span>
          <Btn disabled={!ok} onClick={save}>Enregistrer</Btn>
          <Btn kind="quiet" onClick={() => setOpen(false)}>Annuler</Btn>
        </>
      ) : (
        <>
          <Btn onClick={() => setOpen(true)}>Saisie manuelle</Btn>
          <label className="sz-btn wr-file" aria-busy={running} title="Export Santé de la montre, au format .zip ou .xml">
            {running ? 'Import en cours…' : 'Importer un export'}
            <input
              type="file"
              className="wr-sr-only"
              accept=".zip,.xml,application/zip,text/xml"
              disabled={running}
              onChange={(e) => onFile(e.currentTarget)}
            />
          </label>
        </>
      )}
      {running && (
        <div className="wr-progress" role="progressbar" aria-label="Progression de l'import" aria-valuenow={pct ?? 0} aria-valuemin={0} aria-valuemax={100}>
          <div style={{ width: `${pct ?? 0}%` }} />
        </div>
      )}
      {msg && <p role="status" className={`wr-note${msg.warn ? ' wr-warn' : ''}`}>{msg.text}</p>}
    </div>
  );
}
