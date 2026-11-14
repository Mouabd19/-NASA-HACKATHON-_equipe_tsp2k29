// Propriétaire : Ahmed (B). Check-in du matin : 4 lignes notées (humeur, fatigue, sommeil 1–5 ; douleur 0–3), un tap par ligne, ≤ 30 s (ROADMAP §1).
import { useState } from 'react';
import type { OrganId } from '../../types';
import { saveCheckIn, clearCheckIn, painZonesOf, type CheckInZones } from '../../ingest/checkin';
import { Btn, Dot, Panel, Prov, Segmented, T, num } from './ui';
import { NOW_TITLE_ID } from './NowNextCard';
import { ZonePicker } from './ZonePicker';

type Key = 'mood' | 'fatigue' | 'pain' | 'sleepFelt';
type Draft = Partial<Pick<CheckInZones, Key>> & { painZones?: OrganId[] };


// Échelles du contrat src/types.ts (CheckIn) : 1–5, douleur 0–3.
const ROWS: { key: Key; label: string; low: string; high: string; scale: readonly number[] }[] = [
  { key: 'mood', label: 'Humeur', low: 'très basse', high: 'excellente', scale: [1, 2, 3, 4, 5] },
  { key: 'fatigue', label: 'Fatigue', low: 'aucune', high: 'épuisé', scale: [1, 2, 3, 4, 5] },
  { key: 'pain', label: 'Douleur', low: 'aucune', high: 'maximale', scale: [0, 1, 2, 3] },
  { key: 'sleepFelt', label: 'Sommeil ressenti', low: 'très mauvais', high: 'excellent', scale: [1, 2, 3, 4, 5] },
];

const ZONES: { id: OrganId; label: string }[] = [
  { id: 'hanche', label: 'Hanche' }, { id: 'rachis', label: 'Dos' }, { id: 'cuisse', label: 'Cuisse' },
  { id: 'mollet', label: 'Mollet' }, { id: 'cerveau', label: 'Tête' }, { id: 'yeux', label: 'Yeux' },
];

/** Notes qui déclenchent le triage (mêmes seuils que triage / planDay, à confirmer par Mouad). */
const TRIGGERS: Record<Key, (v: number) => boolean> = {
  pain: (v) => v >= 2, fatigue: (v) => v >= 4, mood: (v) => v <= 2, sleepFelt: () => false,
};

/** Effacer le check-in sert aux répétitions de la démo : visible en dev ou avec ?demo dans l'URL. */
const DEMO = import.meta.env.DEV || (typeof location !== 'undefined' && new URLSearchParams(location.search).has('demo'));

export function CheckInCard({ day, done }: { day: number; done: CheckInZones | null }) {
  const [d, setD] = useState<Draft>({});
  const [open, setOpen] = useState(false);
  const filled = ROWS.filter((r) => d[r.key] !== undefined).length;
  const complete = filled === ROWS.length;

  if (done && !open) {
    const zones = painZonesOf(done).map((id) => ZONES.find((z) => z.id === id)?.label ?? id);
    const zone = zones.length ? zones.join(', ') : null;
    return (
      <Panel title="Check-in du matin" prov={<Prov p="RÉEL" />}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '16px 24px' }}>
          {ROWS.map((r) => (
            <Summary key={r.key} label={r.label} v={done[r.key]} max={r.scale[r.scale.length - 1]} alert={TRIGGERS[r.key](done[r.key])}
              extra={r.key === 'pain' && done.pain > 0 ? (zone ?? 'zone non précisée') : undefined} />
          ))}
        </div>
        <Btn kind="quiet" style={{ marginTop: 16, padding: 0 }} onClick={() => { setD({ ...done, painZones: painZonesOf(done) }); setOpen(true); }}>Modifier</Btn>
      </Panel>
    );
  }

  const set = (k: Key, v: number) => setD((p) => ({ ...p, [k]: v, ...(k === 'pain' && v === 0 ? { painZones: [] } : {}) }));

  const submit = () => {
    if (!complete) return;
    saveCheckIn({
      day,
      mood: d.mood!, fatigue: d.fatigue!, pain: d.pain!, sleepFelt: d.sleepFelt!,
      ...(d.pain! > 0 && d.painZones?.length ? { painZone: d.painZones[0], painZones: d.painZones } : {}),
      source: 'manual',
    } as CheckInZones);
    setOpen(false);
    // La carte se démonte : on renvoie le focus sur la consigne qui vient de changer.
    requestAnimationFrame(() => document.getElementById(NOW_TITLE_ID)?.focus());
  };

  return (
    <Panel title="Check-in du matin" prov={<Prov p="RÉEL" />} className="wr-checkin">
      <p className="sz-detail" style={{ color: T.textDim, margin: '-4px 0 24px', fontSize: T.fs.md }}>
        Avant toute séance · une note par ligne
      </p>
      <div style={{ display: 'grid', gap: 16 }}>
        {ROWS.map((r) => (
          <div key={r.key} className="wr-row">
            <div>
              <div id={`ci-${r.key}`} style={{ fontSize: T.fs.lg, fontWeight: 500, color: T.text }}>{r.label}</div>
              <div id={`ci-${r.key}-hint`} className="sz-detail" style={{ fontSize: T.fs.sm, color: T.textMuted, marginTop: 2 }}>{r.scale[0]} {r.low} · {r.scale[r.scale.length - 1]} {r.high}</div>
            </div>
            <Segmented ariaLabel={`${r.label}, de ${r.scale[0]} à ${r.scale[r.scale.length - 1]}`} describedBy={`ci-${r.key}-hint`} values={r.scale} value={d[r.key]} onChange={(v) => set(r.key, v)} />
          </div>
        ))}
        {d.pain !== undefined && d.pain > 0 && (
          <div className="wr-row">
            <div>
              <div style={{ fontSize: T.fs.md, color: T.textDim }}>Où as-tu mal&nbsp;?</div>
              <div className="sz-detail" style={{ fontSize: T.fs.sm, color: T.textMuted, marginTop: 2 }}>Plusieurs zones possibles</div>
            </div>
            <ZonePicker zones={ZONES} value={d.painZones ?? []}
              onToggle={(id) => setD((p) => {
                const cur = p.painZones ?? [];
                return { ...p, painZones: cur.includes(id) ? cur.filter((z) => z !== id) : [...cur, id] };
              })} />
          </div>
        )}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 24, alignItems: 'center', flexWrap: 'wrap' }}>
        <Btn kind="primary" disabled={!complete} onClick={submit}>Valider le check-in</Btn>
        {done && <Btn kind="secondary" onClick={() => setOpen(false)}>Annuler</Btn>}
        {done && DEMO && <Btn kind="quiet" onClick={() => { clearCheckIn(day); setD({}); setOpen(false); }}>Effacer le check-in</Btn>}
        <span aria-live="polite" style={{ marginLeft: 'auto', fontSize: T.fs.sm, color: T.textMuted, fontVariantNumeric: 'tabular-nums' }}>{filled} notes sur 4</span>
      </div>
    </Panel>
  );
}

function Summary({ label: l, v, max, extra, alert }: { label: string; v: number; max: number; extra?: string; alert: boolean }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: T.fs.sm, color: T.textMuted }}>
        {alert && <Dot color={T.status.amber} size={6} />}{l}
        {alert && <span className="wr-sr-only">, déclenche une alerte</span>}
      </div>
      <div style={{ ...num, fontSize: T.fs.xl, color: T.text, marginTop: 4 }}>
        {v}<span style={{ fontSize: T.fs.md, color: T.textMuted }}> / {max}</span>
        {extra && <span style={{ fontSize: T.fs.md, color: T.textDim, fontWeight: 400 }}> · {extra}</span>}
      </div>
    </div>
  );
}
