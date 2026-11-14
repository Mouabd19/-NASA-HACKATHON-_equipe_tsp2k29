// Propriétaire : Steve (D). Page « Santé mentale » — prototype §11 (3 observateurs → 3 psychologues IA → psychologue humain).
// Même DA que la War Room (briques de src/pages/warroom/ui.tsx, tokens de Walid). Données figées : public/data/mental/.
// Ouverte par un double-clic sur le cerveau dans la page Body.
import { useMemo, useState } from 'react';
import type { JSX } from 'react';
import { Link } from 'react-router-dom';
import { moodSignals } from '../../models/ml';
import { Btn, Dot, Panel, Prov, T, label } from '../warroom/ui';
import '../warroom/warroom.css';

type Niveau = 'rien' | 'a_surveiller' | 'proposer_un_echange' | 'donnees_insuffisantes';
interface Fait { heure?: string; fait?: string; citation?: string | null }
interface Hyp { schema?: string; preuves?: string[] }
interface PsyOut { niveau?: Niveau; confiance?: string; hypotheses?: Hyp[]; pointsRassurants?: string[]; noteAuPsy?: string }
interface DayFile {
  day: number; scenario: 'drift' | 'control';
  observers: { id: string; label: string; output?: { faits?: Fait[]; resume?: string } }[];
  psychologists: { id: string; label: string; output?: PsyOut }[];
  dossierPourLePsyHumain: { niveau: Niveau; regle?: string; votes: { psy: string; niveau: Niveau }[] };
}
interface Summary { engine?: string; model?: string }

const files = import.meta.glob<DayFile>('../../../public/data/mental/*/J*.json', { eager: true, import: 'default' });
const summaries = import.meta.glob<Summary>('../../../public/data/mental/summary.json', { eager: true, import: 'default' });
const SUMMARY: Summary = Object.values(summaries)[0] ?? {};

const ONSET = 75;
const SCENARIOS = ['drift', 'control'] as const;
type Sc = (typeof SCENARIOS)[number];
const SC_LABEL: Record<Sc, string> = { drift: `Trouble débutant à J${ONSET}`, control: 'Témoin en bonne santé' };

const DATA: Record<Sc, DayFile[]> = { drift: [], control: [] };
for (const f of Object.values(files)) if (f.scenario in DATA) DATA[f.scenario].push(f);
for (const sc of SCENARIOS) DATA[sc].sort((a, b) => a.day - b.day);
const DAYS = [...new Set(SCENARIOS.flatMap((sc) => DATA[sc].map((d) => d.day)))].sort((a, b) => a - b);

const NIV_LABEL: Record<Niveau, string> = {
  rien: 'Rien à signaler', a_surveiller: 'À surveiller', proposer_un_echange: 'Proposer un échange', donnees_insuffisantes: 'Données insuffisantes',
};
const nivColor = (n?: Niveau): string =>
  n === 'proposer_un_echange' ? T.status.red : n === 'a_surveiller' ? T.status.amber : n === 'rien' ? T.status.green : T.status.grey;
const rank = (n?: Niveau): number => (n === 'proposer_un_echange' ? 2 : n === 'a_surveiller' ? 1 : 0);
const CONF: Record<string, string> = { elevee: 'élevée', moyenne: 'moyenne', faible: 'faible' };
const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

function Kpi({ value, text }: { value: string; text: string }): JSX.Element {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 40, fontWeight: 500, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: T.fs.md, color: T.textDim, marginTop: 8, lineHeight: 1.4 }}>{text}</div>
    </div>
  );
}

function Timeline({ sel, onSel }: { sel: { sc: Sc; day: number }; onSel: (sc: Sc, day: number) => void }): JSX.Element {
  const iOnset = DAYS.findIndex((d) => d >= ONSET);
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {SCENARIOS.map((sc) => (
        <div key={sc} style={{ display: 'grid', gridTemplateColumns: 'minmax(140px, 220px) 1fr', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: T.fs.md, color: T.textDim }}>{SC_LABEL[sc]}</span>
          <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: `repeat(${DAYS.length}, 1fr)` }}>
            {sc === 'drift' && iOnset > 0 ? (
              <span aria-hidden style={{ position: 'absolute', top: -4, bottom: -4, left: `${((iOnset) / DAYS.length) * 100}%`, borderLeft: `1px dashed ${T.borderStrong}` }} />
            ) : null}
            {DAYS.map((d) => {
              const x = DATA[sc].find((y) => y.day === d);
              const on = sel.sc === sc && sel.day === d;
              const n = x?.dossierPourLePsyHumain.niveau;
              return (
                <button key={d} type="button" className="wr-btn" onClick={() => onSel(sc, d)} aria-pressed={on}
                  aria-label={`${SC_LABEL[sc]}, jour ${d} : ${n ? NIV_LABEL[n] : 'pas de donnée'}`}
                  style={{ display: 'grid', justifyItems: 'center', gap: 6, padding: '10px 0', minHeight: 44, background: on ? T.panelRaised : 'transparent', border: `1px solid ${on ? T.borderStrong : 'transparent'}`, borderRadius: T.radius.control, color: T.textDim, cursor: 'pointer', fontFamily: T.fontText }}>
                  <Dot color={nivColor(n)} size={12} />
                  <span style={{ fontSize: T.fs.sm, fontVariantNumeric: 'tabular-nums' }}>J{d}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, marginTop: 8, fontSize: T.fs.sm, color: T.textDim }}>
        {(['rien', 'a_surveiller', 'proposer_un_echange'] as Niveau[]).map((n) => (
          <span key={n} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Dot color={nivColor(n)} />{NIV_LABEL[n]}</span>
        ))}
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><span aria-hidden style={{ width: 0, height: 12, borderLeft: `1px dashed ${T.borderStrong}` }} />début du trouble (J{ONSET})</span>
      </div>
    </div>
  );
}

function Dossier({ x }: { x: DayFile }): JSX.Element {
  const [open, setOpen] = useState(false);
  const d = x.dossierPourLePsyHumain;
  const faits = x.observers.flatMap((o) => (o.output?.faits ?? []).slice(0, 3)).slice(0, 8);
  return (
    <Panel title={`Dossier du jour · ${SC_LABEL[x.scenario]}`} accent={nivColor(d.niveau)} prov={<Prov p="SIMULÉ" />}>
      <h2 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 600, letterSpacing: '-0.01em' }}>
        J{x.day} · <span style={{ color: nivColor(d.niveau) }}>{NIV_LABEL[d.niveau]}</span>
      </h2>
      <div style={{ fontSize: T.fs.md, color: T.textDim, marginBottom: 24 }}>
        Règle : niveau retenu par au moins 2 psychologues sur 3 · votes {d.votes.map((v) => NIV_LABEL[v.niveau].toLowerCase()).join(' / ')}
      </div>
      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
        {x.psychologists.map((p) => {
          const o = p.output ?? {};
          const note = o.noteAuPsy ?? '';
          return (
            <section key={p.id} style={{ background: T.panelRaised, border: `1px solid ${T.border}`, borderRadius: T.radius.inset, padding: 20, minWidth: 0 }}>
              <h3 style={{ margin: 0, fontSize: T.fs.md, fontWeight: 600 }}>{cap(p.label.replace('Psychologue — ', ''))}</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '8px 0 12px', fontSize: T.fs.sm, color: nivColor(o.niveau) }}>
                <Dot color={nivColor(o.niveau)} />{o.niveau ? NIV_LABEL[o.niveau] : '—'}
                {o.confiance ? <span style={{ color: T.textDim }}>· confiance {CONF[o.confiance] ?? o.confiance}</span> : null}
              </div>
              {o.hypotheses?.[0]?.schema ? <p style={{ margin: '0 0 8px', fontSize: T.fs.md, lineHeight: 1.45 }}>{o.hypotheses[0].schema}</p> : null}
              <p style={{ margin: 0, fontSize: T.fs.sm, color: T.textDim, lineHeight: 1.45 }}>{note.length > 260 ? note.slice(0, 257) + '…' : note}</p>
            </section>
          );
        })}
      </div>
      <div style={{ marginTop: 20 }}>
        <Btn kind="quiet" onClick={() => setOpen(!open)}>{open ? '▾' : '▸'} Faits relevés par les 3 observateurs ({faits.length})</Btn>
        {open ? (
          <ul style={{ margin: '8px 0 0', paddingLeft: 20, fontSize: T.fs.md, color: T.textDim, lineHeight: 1.5 }}>
            {faits.map((f, i) => (
              <li key={i}><span style={{ fontVariantNumeric: 'tabular-nums', color: T.text }}>{f.heure}</span> · {f.fait}{f.citation ? <> — « {f.citation} »</> : null}</li>
            ))}
          </ul>
        ) : null}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 20, paddingTop: 16, borderTop: `1px solid ${T.border}`, fontSize: T.fs.md, color: T.textDim }}>
        <Dot color={T.holo} />
        <span><strong style={{ color: T.text, fontWeight: 600 }}>Psychologue humain au sol</strong> : reçoit ce dossier et décide. L'IA ne décide pas, et l'astronaute ne peut pas couper le signal.</span>
      </div>
    </Panel>
  );
}

export function Mental(): JSX.Element {
  const drift = DATA.drift;
  const ctrl = DATA.control;
  const detected = drift.find((d) => d.day >= ONSET && rank(d.dossierPourLePsyHumain.niveau) >= 2);
  const ctrlEsc = ctrl.filter((d) => rank(d.dossierPourLePsyHumain.niveau) >= 2).length;
  const mlAlert = useMemo(() => moodSignals().find((s) => s.alert)?.day ?? null, []);
  const [sel, setSel] = useState<{ sc: Sc; day: number }>(() => ({ sc: 'drift', day: detected?.day ?? DAYS[DAYS.length - 1] }));
  const current = DATA[sel.sc].find((d) => d.day === sel.day);
  const engine = SUMMARY.model ? SUMMARY.model.replace(/^claude-(\w+)-(\d+)-(\d+)$/, (_m, n: string, a: string, b: string) => `Claude ${cap(n)} ${a}.${b}`) : 'modèle de langage';

  if (!DAYS.length) {
    return <main style={{ padding: 32, color: T.textDim }}>Données insuffisantes : aucun résultat figé dans public/data/mental/.</main>;
  }

  return (
    <main style={{ background: T.bg, color: T.text, fontFamily: T.fontText, minHeight: '100vh', WebkitFontSmoothing: 'antialiased' }}>
      <div style={{ maxWidth: 1440, margin: '0 auto', padding: '32px clamp(16px, 3vw, 32px) 48px', boxSizing: 'border-box', display: 'grid', gap: 16 }}>
        <header style={{ display: 'flex', flexWrap: 'wrap', gap: '16px 32px', alignItems: 'flex-end', marginBottom: 16 }}>
          <div>
            <div style={{ ...label, marginBottom: 8 }}>Santé mentale · prototype · vision</div>
            <h1 style={{ fontSize: 'clamp(24px, 2.4vw, 30px)', fontWeight: 600, letterSpacing: '-0.015em', lineHeight: 1.1, margin: 0 }}>
              Repérer tôt. Laisser l'humain décider.
            </h1>
            <div style={{ fontSize: T.fs.md, color: T.textDim, marginTop: 8 }}>
              3 observateurs → 3 psychologues IA → 1 psychologue humain · prototype : {engine} · vision : modèle embarqué à bord
            </div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
            <Prov p="SIMULÉ" />
            <Link to="/body" className="wr-link" style={{ padding: '0 8px' }}>← Retour au corps</Link>
          </div>
        </header>

        <Panel title="En bref">
          <div style={{ display: 'grid', gap: 32, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
            <Kpi value={detected ? `J${detected.day}` : '—'} text={detected ? `nos agents proposent un échange, ${detected.day - ONSET} jours après le début du trouble (J${ONSET})` : 'aucune proposition d’échange'} />
            <Kpi value={mlAlert !== null ? `J${mlAlert}` : '—'} text="le modèle d'IA de Mouad (signal d'humeur, méthode indépendante) alerte" />
            <Kpi value={String(ctrlEsc)} text="proposition d’échange chez le témoin en bonne santé" />
          </div>
        </Panel>

        <Panel title="Frise · cliquez un jour">
          <Timeline sel={sel} onSel={(sc, day) => setSel({ sc, day })} />
        </Panel>

        {current ? <Dossier key={`${sel.sc}${sel.day}`} x={current} /> : null}

        <p style={{ margin: '8px 0 0', fontSize: T.fs.sm, color: T.textDim }}>
          Données entièrement simulées (biomarqueurs : simulation de Mouad) · aucune personne réelle · signal à regarder, jamais un diagnostic.
        </p>
      </div>
    </main>
  );
}
