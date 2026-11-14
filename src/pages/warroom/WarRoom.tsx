// Propriétaire : Ahmed (ROADMAP §7).
// STUB — remplace l'implémentation sans changer la signature (export function WarRoom(): JSX.Element).
// Page minimale mais fonctionnelle sur les mocks : check-in du matin, MAINTENANT / ENSUITE, délai radio,
// to-do groupée avec cases à cocher et lien « Pourquoi ? » → /reasoning/:id.
// Données : uniquement via les modules §7. Styles : en ligne, à partir des variables CSS de src/ui/tokens.ts.
import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties, JSX } from 'react';
import { Link } from 'react-router-dom';
import type { CheckIn, TodoItem } from '../../types';
import { HatchBand, Label, Panel, StatusChip, TagBadge, dayToDate, fmt, fmtDay } from '../../ui';
import { levelColor } from '../../ui/tokens';
import { ASTRONAUT, DAY_TODAY } from '../../mocks/mission';
import { getCheckIn } from '../../sim/load';
import { triage } from '../../models/triage';
import { router } from '../../models/router';
import { planDay } from '../../models/planDay';
import { alertsForDay } from '../../models/alerts';
import { lightTimeMin } from '../../content/horizons';
import { saveCheckIn } from '../../ingest/checkin';
import { pullDone, pushTodo } from '../../ingest/todoSync';

const KINDS: { kind: TodoItem['kind']; sys: string; title: string }[] = [
  { kind: 'exercice', sys: 'TODO-01', title: 'EXERCICES' },
  { kind: 'repas', sys: 'TODO-02', title: 'REPAS' },
  { kind: 'test', sys: 'TODO-03', title: 'TESTS' },
  { kind: 'medical', sys: 'TODO-04', title: 'MÉDICAL' },
];
const DECIDEUR: Record<string, string> = { moi: 'MOI', CMO: 'CMO DE BORD', sol: 'MÉDECIN AU SOL', equipage: 'ÉQUIPAGE' };
const SENT_AT_MIN = 7 * 60 + 5; // télémétrie du matin envoyée à 07:05 [Persona]
const hhmm = (min: number) => `${String(Math.floor(min / 60) % 24).padStart(2, '0')}:${String(Math.round(min) % 60).padStart(2, '0')}`;

const S: Record<string, CSSProperties> = {
  page: { minHeight: '100vh', background: 'var(--sz-bg)', color: 'var(--sz-text)', fontFamily: 'var(--sz-font-text)', padding: 24, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 16 },
  top: { display: 'flex', alignItems: 'baseline', gap: 16, flexWrap: 'wrap', borderBottom: '1px solid var(--sz-border)', paddingBottom: 12 },
  h1: { fontFamily: 'var(--sz-font-mono)', letterSpacing: 'var(--sz-tracking)', fontSize: 22, fontWeight: 500, margin: 0, textTransform: 'uppercase' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, alignItems: 'start' },
  big: { fontSize: 20, lineHeight: 1.35, margin: '4px 0 12px' },
  row: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', padding: '6px 0' },
  item: { display: 'grid', gridTemplateColumns: '22px 48px 1fr', gap: 10, alignItems: 'start', padding: '10px 0', borderTop: '1px solid var(--sz-border)' },
  box: { width: 18, height: 18, border: '1px solid var(--sz-border-strong)', background: 'transparent', color: 'var(--sz-text)', cursor: 'pointer', padding: 0, lineHeight: '16px', fontFamily: 'var(--sz-font-mono)', fontSize: 12, borderRadius: 0 },
  link: { color: 'var(--sz-text)', fontFamily: 'var(--sz-font-mono)', letterSpacing: 'var(--sz-tracking)', fontSize: 10, textTransform: 'uppercase', textDecoration: 'underline', textUnderlineOffset: 3 },
  dim: { color: 'var(--sz-text-dim)', fontSize: 13, lineHeight: 1.45 },
  delay: { fontFamily: 'var(--sz-font-mono)', fontSize: 34, letterSpacing: '0.04em' },
};

function Scale(props: { label: string; values: number[]; value: number; onPick: (v: number) => void }): JSX.Element {
  return (
    <div style={S.row}>
      <span style={{ width: 150 }}><Label dim>{props.label}</Label></span>
      {props.values.map((v) => (
        <button
          key={v}
          type="button"
          className="sz-btn"
          aria-pressed={props.value === v}
          onClick={() => props.onPick(v)}
          style={{
            minWidth: 34, borderRadius: 0, color: 'var(--sz-text)',
            borderColor: props.value === v ? 'var(--sz-text)' : 'var(--sz-border)',
            background: props.value === v ? 'var(--sz-panel-hover)' : 'transparent',
          }}
        >
          {v}
        </button>
      ))}
    </div>
  );
}

export function WarRoom(): JSX.Element {
  const day = DAY_TODAY;
  const date = dayToDate(day);
  const [checkIn, setCheckIn] = useState<CheckIn | null>(() => getCheckIn(day));
  const [draft, setDraft] = useState<CheckIn>(() => getCheckIn(day) ?? { day, mood: 3, fatigue: 3, pain: 0, sleepFelt: 3, source: 'manual' });
  const [items, setItems] = useState<TodoItem[]>(() => planDay(day));

  // MAINTENANT est calculé à bord (triage) ; ENSUITE dépend du délai radio du jour.
  const delay = lightTimeMin(date);
  const t = useMemo(() => triage(day), [day, checkIn]); // eslint-disable-line react-hooks/exhaustive-deps
  const out = useMemo(() => router(t, 'MarsScenario', delay), [t, delay]);
  const alerts = useMemo(() => alertsForDay(day), [day]);
  const color = levelColor[t.level];

  useEffect(() => {
    let alive = true;
    void pullDone().then((ids) => {
      if (alive && ids.length) setItems((prev) => prev.map((i) => (ids.includes(i.id) ? { ...i, done: true } : i)));
    });
    return () => { alive = false; };
  }, []);

  const toggle = (id: string) => {
    setItems((prev) => {
      const next = prev.map((i) => (i.id === id ? { ...i, done: !i.done } : i));
      void pushTodo(next);
      return next;
    });
  };
  const validate = () => {
    const c: CheckIn = { ...draft, day, source: 'manual' };
    saveCheckIn(c);
    setCheckIn(getCheckIn(day) ?? c);
  };
  const doneCount = items.filter((i) => i.done).length;
  const manual = checkIn?.source === 'manual';

  return (
    <div style={S.page} className="sz-scroll">
      <header style={S.top}>
        <h1 style={S.h1}>War Room</h1>
        <Label>{fmtDay(day)} · {date}</Label>
        <Label dim>{ASTRONAUT.id} / {ASTRONAUT.role} {ASTRONAUT.name}</Label>
        <TagBadge tag="Persona" />
        <span style={{ flex: 1 }} />
        <Label dim>TO-DO {doneCount}/{items.length}</Label>
        <Link to="/body" style={S.link}>Body →</Link>
      </header>

      <div style={S.grid}>
        <Panel sys="WR-01" title="CONSIGNE DU JOUR" provenance="SIMULÉ" right={<StatusChip color={color} label={t.level.replace('_', ' ')} />}>
          {t.level === 'ROUGE' ? <HatchBand color="red" height={8} /> : null}
          <Label dim>MAINTENANT — calculé à bord</Label>
          <p style={S.big}>{out.maintenant}</p>
          <Label dim>ENSUITE — décideur : {DECIDEUR[out.ensuite.decideur]}</Label>
          <p style={{ ...S.dim, color: 'var(--sz-text)', margin: '4px 0 8px' }}>{out.ensuite.texte}</p>
          {out.ensuite.reponseMin !== undefined ? (
            <div style={S.row}>
              <Label>Envoyé à {hhmm(SENT_AT_MIN)} · réponse vers {hhmm(SENT_AT_MIN + out.ensuite.reponseMin)}</Label>
              <TagBadge tag="H" />
            </div>
          ) : null}
          <div style={{ borderTop: '1px solid var(--sz-border)', marginTop: 8, paddingTop: 8 }}>
            <Label dim>Motifs du triage</Label>
            <ul style={{ ...S.dim, margin: '6px 0 0', paddingLeft: 18 }}>
              {t.reasons.map((r) => <li key={r}>{r}</li>)}
            </ul>
          </div>
        </Panel>

        <Panel sys="WR-02" title="DÉLAI RADIO" provenance="RÉEL">
          <div style={S.row}>
            <span style={S.delay}>{fmt(delay, 2)}</span>
            <Label>MIN · ALLER SIMPLE</Label>
            <TagBadge tag="NASA" id="JPL HORIZONS" />
          </div>
          <p style={S.dim}>
            Terre–Mars le {date}. Aller-retour : {fmt(2 * delay, 1)} min. MAINTENANT n’attend jamais la Terre ;
            la synthèse IA et l’avis du médecin au sol arrivent dans ENSUITE.
          </p>
          <div style={{ borderTop: '1px solid var(--sz-border)', marginTop: 8, paddingTop: 8 }}>
            <Label dim>Alertes du jour ({alerts.length})</Label>
            {alerts.map((a) => (
              <div key={a.id} style={S.row}>
                <StatusChip color={levelColor[a.level]} />
                <Label>{a.title}</Label>
                <Label dim>[{a.rule}]</Label>
              </div>
            ))}
            {alerts.length === 0 ? <p style={S.dim}>Aucune alerte.</p> : null}
          </div>
        </Panel>

        <Panel sys="WR-03" title="CHECK-IN DU MATIN" provenance={manual ? 'RÉEL' : 'SIMULÉ'}>
          <Scale label="Humeur (1–5)" values={[1, 2, 3, 4, 5]} value={draft.mood} onPick={(v) => setDraft({ ...draft, mood: v as CheckIn['mood'] })} />
          <Scale label="Fatigue (1–5)" values={[1, 2, 3, 4, 5]} value={draft.fatigue} onPick={(v) => setDraft({ ...draft, fatigue: v as CheckIn['fatigue'] })} />
          <Scale label="Douleur (0–3)" values={[0, 1, 2, 3]} value={draft.pain} onPick={(v) => setDraft({ ...draft, pain: v as CheckIn['pain'] })} />
          <Scale label="Sommeil ressenti" values={[1, 2, 3, 4, 5]} value={draft.sleepFelt} onPick={(v) => setDraft({ ...draft, sleepFelt: v as CheckIn['sleepFelt'] })} />
          <div style={{ ...S.row, marginTop: 8 }}>
            <button type="button" className="sz-btn" onClick={validate}>Valider le check-in</button>
            <Label dim>{manual ? 'Saisi — remplace le simulé du jour' : 'Valeurs simulées tant que rien n’est saisi'}</Label>
          </div>
        </Panel>
      </div>

      <div style={S.grid}>
        {KINDS.map((k) => {
          const list = items.filter((i) => i.kind === k.kind);
          return (
            <Panel key={k.kind} sys={k.sys} title={k.title} provenance="SIMULÉ" right={<Label dim>{list.filter((i) => i.done).length}/{list.length}</Label>}>
              {list.length === 0 ? <p style={S.dim}>Rien à faire aujourd’hui dans cette famille.</p> : null}
              {list.map((i) => (
                <div key={i.id} style={{ ...S.item, opacity: i.done ? 0.5 : 1 }}>
                  <button type="button" role="checkbox" aria-checked={i.done} aria-label={i.title} style={S.box} onClick={() => toggle(i.id)}>
                    {i.done ? '×' : ''}
                  </button>
                  <Label dim>{i.time ?? '--:--'}</Label>
                  <div>
                    <div style={{ fontSize: 14, textDecoration: i.done ? 'line-through' : 'none' }}>{i.title}</div>
                    <div style={S.dim}>{i.detail}</div>
                    <div style={{ ...S.row, padding: '4px 0 0' }}>
                      <Label dim>P{i.priority}</Label>
                      <Link to={`/reasoning/${i.reasoningId}`} style={S.link}>Pourquoi ?</Link>
                    </div>
                  </div>
                </div>
              ))}
            </Panel>
          );
        })}
      </div>
      <Label dim>La to-do est fixée le matin : le protocole décide, pas le moi du soir. · STUB sur données factices</Label>
    </div>
  );
}
