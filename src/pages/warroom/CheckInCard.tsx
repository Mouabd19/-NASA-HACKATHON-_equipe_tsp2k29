// Propriétaire : Ahmed (B). Check-in du matin : 4 lignes notées (humeur, fatigue, sommeil 1–5 ; douleur 0–3), un tap par ligne, ≤ 30 s (ROADMAP §1).
import { useState } from 'react';
import type { OrganId } from '../../types';
import { clearCheckIn, painZonesOf, type CheckInZones } from '../../ingest/checkin';
import { ANALYSIS_STEPS, analyzeCheckIn, useAnalysis } from '../../ingest/analysis';
import { Panel } from '../../ui';
import { Btn, Dot, Segmented } from './ui';
import { NOW_TITLE_ID } from './NowNextCard';
import { ZonePicker } from './ZonePicker';

type Key = 'mood' | 'fatigue' | 'pain' | 'sleepFelt';
type Draft = Partial<Pick<CheckInZones, Key>> & { painZones?: OrganId[] };


// Échelles du contrat src/types.ts (CheckIn) : 1–5, douleur 0–3.
const ROWS: { key: Key; label: string; low: string; high: string; scale: readonly number[] }[] = [
  { key: 'mood', label: 'Mood', low: 'very low', high: 'excellent', scale: [1, 2, 3, 4, 5] },
  { key: 'fatigue', label: 'Fatigue', low: 'none', high: 'exhausted', scale: [1, 2, 3, 4, 5] },
  { key: 'pain', label: 'Pain', low: 'none', high: 'severe', scale: [0, 1, 2, 3] },
  { key: 'sleepFelt', label: 'Sleep', low: 'very poor', high: 'excellent', scale: [1, 2, 3, 4, 5] },
];

const ZONES: { id: OrganId; label: string }[] = [
  { id: 'hanche', label: 'Hip' }, { id: 'rachis', label: 'Back' }, { id: 'cuisse', label: 'Thigh' },
  { id: 'mollet', label: 'Calf' }, { id: 'cerveau', label: 'Head' }, { id: 'yeux', label: 'Eyes' },
];

/** Notes qui déclenchent le triage (mêmes seuils que triage / planDay, à confirmer par Mouad). */
const TRIGGERS: Record<Key, (v: number) => boolean> = {
  pain: (v) => v >= 2, fatigue: (v) => v >= 4, mood: (v) => v <= 2, sleepFelt: () => false,
};

/** Effacer le check-in sert aux répétitions de la démo : visible seulement avec ?demo dans l'URL. */
const DEMO = (typeof location !== 'undefined' && new URLSearchParams(location.search).has('demo'));

export function CheckInCard({ day, done }: { day: number; done: CheckInZones | null }) {
  const [d, setD] = useState<Draft>({});
  const [open, setOpen] = useState(false);
  const analysis = useAnalysis();
  const filled = ROWS.filter((r) => d[r.key] !== undefined).length;
  const complete = filled === ROWS.length;

  if (analysis.running) return <Analyzing step={analysis.step} />;

  if (done && !open) {
    const zones = painZonesOf(done).map((id) => ZONES.find((z) => z.id === id)?.label ?? id);
    const zone = zones.length ? zones.join(', ') : null;
    return (
      <Panel
        title="Morning check-in"
        provenance="RÉEL"
        right={<Btn kind="quiet" size="sm" onClick={() => { setD({ ...done, painZones: painZonesOf(done) }); setOpen(true); }}>Edit</Btn>}
      >
        <div className="wr-kv">
          {ROWS.map((r) => (
            <Summary key={r.key} label={r.label} v={done[r.key]} max={r.scale[r.scale.length - 1]} alert={TRIGGERS[r.key](done[r.key])} red={r.key === 'pain' && done.pain >= 3}
              extra={r.key === 'pain' && done.pain > 0 ? (zone ?? 'location not specified') : undefined} />
          ))}
        </div>
      </Panel>
    );
  }

  const set = (k: Key, v: number) => setD((p) => ({ ...p, [k]: v, ...(k === 'pain' && v === 0 ? { painZones: [] } : {}) }));

  const submit = () => {
    if (!complete) return;
    const c = {
      day,
      mood: d.mood!, fatigue: d.fatigue!, pain: d.pain!, sleepFelt: d.sleepFelt!,
      ...(d.pain! > 0 && d.painZones?.length ? { painZone: d.painZones[0], painZones: d.painZones } : {}),
      source: 'manual',
    } as CheckInZones;
    setOpen(false);
    // Le check-in n'est appliqué qu'à la fin de l'analyse ; le focus va ensuite sur la consigne qui a changé.
    void analyzeCheckIn(c).then(() => requestAnimationFrame(() => document.getElementById(NOW_TITLE_ID)?.focus()));
  };

  return (
    <Panel title="Morning check-in" provenance="RÉEL" className="wr-checkin">
      <div className="wr-ci">
        {ROWS.map((r) => (
          <div key={r.key} className="wr-row">
            <div id={`ci-${r.key}`} className="wr-row__label">{r.label}</div>
            <Segmented ariaLabel={`${r.label}, ${r.scale[0]} to ${r.scale[r.scale.length - 1]}`} describedBy={`ci-${r.key}-hint`} values={r.scale} value={d[r.key]} onChange={(v) => set(r.key, v)} />
            <div id={`ci-${r.key}-hint`} className="wr-row__hint"><span>{r.scale[0]} {r.low}</span><span>{r.scale[r.scale.length - 1]} {r.high}</span></div>
          </div>
        ))}
        {d.pain !== undefined && d.pain > 0 && (
          <div className="wr-row">
            <div className="wr-row__label">Locations</div>
            <ZonePicker zones={ZONES} value={d.painZones ?? []}
              onToggle={(id) => setD((p) => {
                const cur = p.painZones ?? [];
                return { ...p, painZones: cur.includes(id) ? cur.filter((z) => z !== id) : [...cur, id] };
              })} />
          </div>
        )}
      </div>
      <div className="wr-actions">
        <Btn kind="primary" disabled={!complete} onClick={submit}>Submit check-in</Btn>
        {done && <Btn onClick={() => setOpen(false)}>Cancel</Btn>}
        {done && DEMO && <Btn kind="quiet" onClick={() => { clearCheckIn(day); setD({}); setOpen(false); }}>Clear</Btn>}
        <span aria-live="polite" className="wr-sr-only">{filled} of {ROWS.length} {ROWS.length > 1 ? 'ratings' : 'rating'}</span>
      </div>
    </Panel>
  );
}

// Le déclencheur d'une alerte rouge (douleur 3/3, règle R13) porte le rouge ; les autres déclencheurs restent en jaune.
function Summary({ label: l, v, max, extra, alert, red = false }: { label: string; v: number; max: number; extra?: string; alert: boolean; red?: boolean }) {
  return (
    <div className="wr-kv__row">
      <span className="wr-kv__label">
        {l}
        {alert && <span className="wr-sr-only">{red ? ', triggers the red alarm' : ', triggers an alert'}</span>}
      </span>
      {extra && <span className="wr-kv__extra" title={extra}>{extra}</span>}
      <span className="wr-kv__value">{alert && <Dot color={red ? 'red' : 'amber'} />}{v}<span className="sz-unit"> / {max}</span></span>
    </div>
  );
}

/** Pendant l'analyse : les étapes, faites / en cours / à venir, et une barre d'avancement. */
function Analyzing({ step }: { step: number }) {
  const pct = Math.round(((step + 0.5) / ANALYSIS_STEPS.length) * 100);
  return (
    <Panel title="Morning check-in" className="wr-checkin">
      <div className="wr-analysis" role="status" aria-live="polite">
        <p className="wr-analysis__title">Onboard AI is analyzing your check-in</p>
        <div className="wr-progress wr-analysis__bar" aria-hidden><div style={{ width: `${pct}%` }} /></div>
        <ol className="wr-analysis__steps">
          {ANALYSIS_STEPS.map((s, i) => (
            <li key={s.label} data-state={i < step ? 'done' : i === step ? 'current' : 'next'}>
              <span className="wr-analysis__mark" aria-hidden>{i < step ? '✓' : i === step ? '•' : ''}</span>
              {s.label}
            </li>
          ))}
        </ol>
      </div>
    </Panel>
  );
}
