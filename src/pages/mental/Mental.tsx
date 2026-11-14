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
interface Pt { day: number; humeur: number; sommeilH: number; vfcMs: number; equipageMin: number; paroleMin: number }
const seriesFiles = import.meta.glob<{ scenarios: Record<string, Pt[]> }>('../../../public/data/mental/series.json', { eager: true, import: 'default' });
const SERIES: Record<string, Pt[]> = Object.values(seriesFiles)[0]?.scenarios ?? {};

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

/** Moyenne glissante centrée sur 3 jours (lisibilité ; les points bruts restent dans les données). */
function smooth(v: number[]): number[] {
  return v.map((_, i) => { const w = v.slice(Math.max(0, i - 1), i + 2); return w.reduce((a, b) => a + b, 0) / w.length; });
}

const METRICS: { k: keyof Pt; name: string; unit: string }[] = [
  { k: 'humeur', name: 'Humeur déclarée', unit: '1 à 5' },
  { k: 'sommeilH', name: 'Sommeil', unit: 'heures' },
  { k: 'vfcMs', name: 'Variabilité cardiaque', unit: 'ms' },
  { k: 'equipageMin', name: "Temps avec l'équipage", unit: 'min/jour' },
];

function Frise({ sel, onSel, mlAlert }: { sel: { sc: Sc; day: number }; onSel: (sc: Sc, day: number) => void; mlAlert: number | null }): JSX.Element {
  const drift = SERIES.drift ?? [];
  const ctrl = SERIES.control ?? [];
  if (!drift.length) return <p style={{ color: T.textDim }}>Données insuffisantes : séries absentes.</p>;
  const d0 = drift[0].day, d1 = drift[drift.length - 1].day;
  const W = 1000, L = 190, R = 24;
  const x = (d: number): number => L + ((d - d0) / (d1 - d0)) * (W - L - R);
  const TRACK = [{ sc: 'drift' as Sc, y: 34, name: 'Verdict des agents · avec trouble' }, { sc: 'control' as Sc, y: 66, name: 'Verdict des agents · témoin' }];
  const CH = 64, GAP = 22, TOP = 100;
  const H = TOP + METRICS.length * (CH + GAP) + 24;
  const ticks: number[] = [];
  for (let d = d0; d <= d1; d += 4) ticks.push(d);
  const path = (pts: Pt[], k: keyof Pt, y: (v: number) => number): string => {
    const v = smooth(pts.map((p) => Number(p[k])));
    return pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.day).toFixed(1)},${y(v[i]).toFixed(1)}`).join(' ');
  };
  const txt = { fill: T.textDim, fontSize: 12, fontFamily: T.fontText } as const;
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`Frise J${d0} à J${d1} : humeur, sommeil, variabilité cardiaque et temps avec l'équipage, avec et sans trouble ; verdicts des agents aux jours analysés`} style={{ display: 'block', overflow: 'visible' }}>
        {/* zone du trouble */}
        <rect x={x(ONSET)} y={14} width={x(d1) - x(ONSET)} height={H - 38} fill={T.status.amber} opacity={0.07} />
        <text x={x(ONSET) + 6} y={10} {...txt} fill={T.status.amber}>trouble injecté à J{ONSET} (scénario « avec trouble »)</text>
        {mlAlert !== null ? (
          <g>
            <line x1={x(mlAlert)} x2={x(mlAlert)} y1={84} y2={H - 24} stroke={T.holo} strokeDasharray="4 4" />
            <text x={x(mlAlert) - 6} y={94} {...txt} fill={T.holo} textAnchor="end">modèle de Mouad : alerte J{mlAlert}</text>
          </g>
        ) : null}
        {/* pistes des verdicts */}
        {TRACK.map((t) => (
          <g key={t.sc}>
            <text x={0} y={t.y + 4} {...txt}>{t.name}</text>
            <line x1={L} x2={W - R} y1={t.y} y2={t.y} stroke={T.border} />
            {DATA[t.sc].map((dd) => {
              const n = dd.dossierPourLePsyHumain.niveau;
              const on = sel.sc === t.sc && sel.day === dd.day;
              return (
                <g key={dd.day} role="button" tabIndex={0} aria-label={`${SC_LABEL[t.sc]}, J${dd.day} : ${NIV_LABEL[n]}`} style={{ cursor: 'pointer' }}
                  onClick={() => onSel(t.sc, dd.day)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSel(t.sc, dd.day); } }}>
                  <circle cx={x(dd.day)} cy={t.y} r={14} fill="transparent" />
                  {on ? <circle cx={x(dd.day)} cy={t.y} r={11} fill="none" stroke={T.text} strokeWidth={1.5} /> : null}
                  <circle cx={x(dd.day)} cy={t.y} r={7} fill={nivColor(n)} />
                </g>
              );
            })}
          </g>
        ))}
        {/* courbes */}
        {METRICS.map((m, i) => {
          const top = TOP + i * (CH + GAP);
          const all = [...drift, ...ctrl].map((p) => Number(p[m.k]));
          let lo = Math.min(...all), hi = Math.max(...all);
          const pad = (hi - lo) * 0.1 || 1; lo -= pad; hi += pad;
          const y = (v: number): number => top + CH - ((v - lo) / (hi - lo)) * CH;
          return (
            <g key={m.k}>
              <text x={0} y={top + CH / 2 - 2} fill={T.text} fontSize={13} fontFamily={T.fontText}>{m.name}</text>
              <text x={0} y={top + CH / 2 + 15} {...txt}>{m.unit}</text>
              <line x1={L} x2={W - R} y1={top + CH} y2={top + CH} stroke={T.border} />
              {ctrl.length ? <path d={path(ctrl, m.k, y)} fill="none" stroke={T.textDim} strokeWidth={1.5} strokeDasharray="5 4" /> : null}
              <path d={path(drift, m.k, y)} fill="none" stroke={T.text} strokeWidth={2} />
            </g>
          );
        })}
        {/* axe */}
        {ticks.map((d) => (
          <text key={d} x={x(d)} y={H - 6} {...txt} textAnchor="middle" style={{ fontVariantNumeric: 'tabular-nums' }}>J{d}</text>
        ))}
      </svg>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, marginTop: 12, fontSize: T.fs.sm, color: T.textDim }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><svg width="24" height="4" aria-hidden><line x1="0" x2="24" y1="2" y2="2" stroke={T.text} strokeWidth="2" /></svg>Avec trouble</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><svg width="24" height="4" aria-hidden><line x1="0" x2="24" y1="2" y2="2" stroke={T.textDim} strokeWidth="1.5" strokeDasharray="5 4" /></svg>Témoin (sans trouble)</span>
        {(['rien', 'a_surveiller', 'proposer_un_echange'] as Niveau[]).map((n) => (
          <span key={n} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Dot color={nivColor(n)} />{NIV_LABEL[n]}</span>
        ))}
        <span>Courbes : moyenne sur 3 jours</span>
      </div>
    </div>
  );
}

const STEPS = [
  { n: '1', t: 'Lunettes et montre', d: 'Captent la journée : scènes, temps de parole, repas, sommeil, variabilité cardiaque.' },
  { n: '2', t: '3 observateurs IA', d: "Relèvent des faits, sans interpréter : actions, paroles, liens avec l'équipage." },
  { n: '3', t: '3 psychologues IA', d: 'Chacun donne un niveau. On retient celui d’au moins 2 sur 3.' },
  { n: '4', t: 'Psychologue humain', d: "Reçoit le dossier au sol et décide. L'astronaute ne peut pas couper le signal." },
];

function HowItWorks(): JSX.Element {
  return (
    <Panel title="Comment ça marche">
      <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        {STEPS.map((s, i) => (
          <li key={s.n} style={{ position: 'relative', background: T.panelRaised, border: `1px solid ${s.n === '4' ? T.holo : T.border}`, borderRadius: T.radius.inset, padding: 16 }}>
            <div style={{ ...label, marginBottom: 6 }}>Étape {s.n}{i < STEPS.length - 1 ? ' →' : ''}</div>
            <div style={{ fontSize: T.fs.lg, fontWeight: 600, marginBottom: 6 }}>{s.t}</div>
            <div style={{ fontSize: T.fs.sm, color: T.textDim, lineHeight: 1.45 }}>{s.d}</div>
          </li>
        ))}
      </ol>
      <div style={{ marginTop: 16, padding: 16, borderRadius: T.radius.inset, border: `1px dashed ${T.borderStrong}` }}>
        <div style={{ ...label, marginBottom: 8 }}>Ce qu'on simule ici</div>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: T.fs.md, color: T.textDim, lineHeight: 1.6 }}>
          <li><strong style={{ color: T.text, fontWeight: 500 }}>Haddad, astronaute fictif</strong> : 49 jours de vie à bord simulés (J46 → J94), aucune personne réelle.</li>
          <li><strong style={{ color: T.text, fontWeight: 500 }}>Un trouble injecté à J{ONSET}</strong> : il s'isole, dort moins, saute des repas, de plus en plus. Les agents ne le savent pas.</li>
          <li><strong style={{ color: T.text, fontWeight: 500 }}>Un témoin</strong> : les mêmes journées sans trouble, pour vérifier que l'IA ne donne pas de fausse alerte.</li>
          <li><strong style={{ color: T.text, fontWeight: 500 }}>Les agents analysent 5 jours</strong> (J65, J74, J78, J85, J94), chacun avec les 7 jours précédents. Biomarqueurs : simulation de Mouad.</li>
        </ul>
      </div>
    </Panel>
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

        <HowItWorks />

        <Panel title="Résultat">
          <div style={{ display: 'grid', gap: 32, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
            <Kpi value={detected ? `J${detected.day}` : '—'} text={detected ? `nos agents proposent un échange, ${detected.day - ONSET} jours après le début du trouble (J${ONSET})` : 'aucune proposition d’échange'} />
            <Kpi value={mlAlert !== null ? `J${mlAlert}` : '—'} text="le modèle d'IA de Mouad (signal d'humeur, méthode indépendante) alerte" />
            <Kpi value={String(ctrlEsc)} text="fausse alerte chez le témoin, sans trouble" />
          </div>
        </Panel>

        <Panel title="La frise · cliquez un verdict pour ouvrir le dossier du jour">
          <Frise sel={sel} onSel={(sc, day) => setSel({ sc, day })} mlAlert={mlAlert} />
        </Panel>

        {current ? <Dossier key={`${sel.sc}${sel.day}`} x={current} /> : null}

        <p style={{ margin: '8px 0 0', fontSize: T.fs.sm, color: T.textDim }}>
          Données entièrement simulées (biomarqueurs : simulation de Mouad) · aucune personne réelle · signal à regarder, jamais un diagnostic.
        </p>
      </div>
    </main>
  );
}
