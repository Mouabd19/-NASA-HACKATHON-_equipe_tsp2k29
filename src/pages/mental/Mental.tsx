// Propriétaire : Steve (D). Page « Santé mentale » — prototype §11 (3 observateurs → 3 psychologues IA → psychologue humain).
// Présentation : socle commun (src/ui) + mental.css (préfixe mt-). Données figées : public/data/mental/.
// Ouverte par un double-clic sur le cerveau dans la page Corps.
import { useEffect, useMemo, useRef, useState } from 'react';
import type { JSX, RefObject } from 'react';
import { Link } from 'react-router-dom';
import type { Color } from '../../types';
import { moodSignals } from '../../models/ml';
import { Label, Panel, ProvenanceBadge, StatusChip, StatusDot, statusVar } from '../../ui';
import './mental.css';

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
/** Statut d'un niveau (gris = inconnu, jamais vert par défaut). */
const nivColor = (n?: Niveau): Color =>
  n === 'proposer_un_echange' ? 'red' : n === 'a_surveiller' ? 'amber' : n === 'rien' ? 'green' : 'grey';
const rank = (n?: Niveau): number => (n === 'proposer_un_echange' ? 2 : n === 'a_surveiller' ? 1 : 0);
const CONF: Record<string, string> = { elevee: 'élevée', moyenne: 'moyenne', faible: 'faible' };
const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

function Kpi({ label, value, note }: { label: string; value: string; note: string }): JSX.Element {
  return (
    <div className="mt-stat">
      <dt><Label>{label}</Label></dt>
      <dd>
        <span className="sz-value">{value}</span>
        <span className="mt-stat__note">{note}</span>
      </dd>
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

/** Largeur réelle du conteneur : le SVG est dessiné à l'échelle 1, les textes gardent leur taille (11 px). */
function useWidth(fallback: number): [RefObject<HTMLDivElement | null>, number] {
  const ref = useRef<HTMLDivElement | null>(null);
  const [w, setW] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => { const cw = Math.round(el.clientWidth); if (cw > 0) setW(cw); });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

function Frise({ sel, onSel, mlAlert }: { sel: { sc: Sc; day: number }; onSel: (sc: Sc, day: number) => void; mlAlert: number | null }): JSX.Element {
  const [ref, measured] = useWidth(1000);
  const drift = SERIES.drift ?? [];
  const ctrl = SERIES.control ?? [];
  if (!drift.length) return <p className="mt-empty">Données insuffisantes : séries absentes.</p>;
  const d0 = drift[0].day, d1 = drift[drift.length - 1].day;
  const W = Math.max(520, measured), L = W < 720 ? 124 : 168, R = 16;
  const x = (d: number): number => L + ((d - d0) / (d1 - d0)) * (W - L - R);
  const TRACK = [{ sc: 'drift' as Sc, y: 36, name: 'Verdict · avec trouble' }, { sc: 'control' as Sc, y: 64, name: 'Verdict · témoin' }];
  const CH = 56, GAP = 20, TOP = 96;
  const BOTTOM = TOP + METRICS.length * (CH + GAP) - GAP;
  const H = BOTTOM + 24;
  const ticks: number[] = [];
  for (let d = d0; d <= d1; d += 4) ticks.push(d);
  const path = (pts: Pt[], k: keyof Pt, y: (v: number) => number): string => {
    const v = smooth(pts.map((p) => Number(p[k])));
    return pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.day).toFixed(1)},${y(v[i]).toFixed(1)}`).join(' ');
  };
  return (
    <div>
      <div className="mt-chart"><div className="mt-chart__in" ref={ref}>
        <svg className="mt-frise" viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label={`Frise J${d0} à J${d1} : humeur, sommeil, variabilité cardiaque et temps avec l'équipage, avec et sans trouble ; verdicts des agents aux jours analysés`}>
          {/* papier d'ECG : seulement derrière les quatre voies de courbes, pas derrière les verdicts */}
          <defs>
            <pattern id="mt-ecg" width="25" height="25" patternUnits="userSpaceOnUse" x={L} y={TOP}>
              <path className="mt-ecg__minor" d="M5 0V25M10 0V25M15 0V25M20 0V25M0 5H25M0 10H25M0 15H25M0 20H25" />
              <path className="mt-ecg__major" d="M0.5 0V25M0 0.5H25" />
            </pattern>
          </defs>
          {METRICS.map((m, i) => (
            <rect key={m.k} x={L} y={TOP + i * (CH + GAP)} width={W - L - R} height={CH} fill="url(#mt-ecg)" />
          ))}
          {/* période du trouble : aplat neutre */}
          <rect className="mt-frise__zone" x={x(ONSET)} y={20} width={x(d1) - x(ONSET)} height={BOTTOM - 20} />
          {/* grille */}
          {ticks.map((d) => <line key={d} className="mt-frise__grid" x1={x(d)} x2={x(d)} y1={20} y2={BOTTOM} />)}
          <line className="mt-frise__mark" x1={x(ONSET)} x2={x(ONSET)} y1={20} y2={BOTTOM} />
          <text x={x(ONSET) + 6} y={12}>Trouble simulé à partir de J{ONSET}</text>
          {mlAlert !== null ? (
            <g>
              <line className="mt-frise__mark mt-frise__mark--dash" x1={x(mlAlert)} x2={x(mlAlert)} y1={80} y2={BOTTOM} />
              <text x={x(mlAlert) - 6} y={88} textAnchor="end">Signal d'humeur : alerte J{mlAlert}</text>
            </g>
          ) : null}
          {/* pistes des verdicts */}
          {TRACK.map((t) => (
            <g key={t.sc}>
              <text className="mt-frise__name" x={0} y={t.y + 4}>{t.name}</text>
              <line className="mt-frise__axis" x1={L} x2={W - R} y1={t.y} y2={t.y} />
              {DATA[t.sc].map((dd) => {
                const n = dd.dossierPourLePsyHumain.niveau;
                const color = nivColor(n);
                const on = sel.sc === t.sc && sel.day === dd.day;
                return (
                  <g key={dd.day} className="mt-verdict" role="button" tabIndex={0} aria-pressed={on} aria-label={`${SC_LABEL[t.sc]}, J${dd.day} : ${NIV_LABEL[n]}`}
                    onClick={() => onSel(t.sc, dd.day)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSel(t.sc, dd.day); } }}>
                    <circle className="mt-verdict__hit" cx={x(dd.day)} cy={t.y} r={13} />
                    <circle className="mt-verdict__ring" cx={x(dd.day)} cy={t.y} r={9} />
                    <circle className="mt-verdict__dot" data-color={color} cx={x(dd.day)} cy={t.y} r={5} fill={statusVar[color]} stroke={statusVar[color]} />
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
                <text className="mt-frise__name" x={0} y={top + CH / 2 - 2}>{m.name}</text>
                <text x={0} y={top + CH / 2 + 13}>{m.unit}</text>
                <line className="mt-frise__axis" x1={L} x2={W - R} y1={top + CH} y2={top + CH} />
                {ctrl.length ? <path className="mt-frise__line mt-frise__line--ctrl" d={path(ctrl, m.k, y)} /> : null}
                <path className="mt-frise__line" d={path(drift, m.k, y)} />
              </g>
            );
          })}
          {/* axe */}
          {ticks.map((d) => (
            <text key={d} x={x(d)} y={H - 6} textAnchor="middle">J{d}</text>
          ))}
        </svg>
      </div></div>
      <ul className="mt-legend">
        <li><svg width="20" height="4" aria-hidden="true"><line className="mt-frise__line" x1="0" x2="20" y1="2" y2="2" /></svg>Avec trouble</li>
        <li><svg width="20" height="4" aria-hidden="true"><line className="mt-frise__line mt-frise__line--ctrl" x1="0" x2="20" y1="2" y2="2" /></svg>Témoin</li>
        {(['rien', 'a_surveiller', 'proposer_un_echange'] as Niveau[]).map((n) => (
          <li key={n}><StatusDot color={nivColor(n)} />{NIV_LABEL[n]}</li>
        ))}
        <li className="mt-legend__note">Moyenne sur 3 jours</li>
      </ul>
    </div>
  );
}

const STEPS = [
  { n: '1', t: 'Lunettes et montre', d: 'Captent la journée : scènes, temps de parole, repas, sommeil, variabilité cardiaque.' },
  { n: '2', t: '3 observateurs IA', d: "Relèvent des faits, sans interpréter : actions, paroles, liens avec l'équipage." },
  { n: '3', t: '3 psychologues IA', d: 'Chacun donne un niveau. Le niveau retenu est celui d’au moins 2 sur 3.' },
  { n: '4', t: 'Psychologue humain', d: "Reçoit le dossier au sol et décide. L'astronaute ne peut pas couper le signal." },
];

function HowItWorks(): JSX.Element {
  return (
    <Panel title="Fonctionnement">
      <ol className="mt-steps">
        {STEPS.map((s) => (
          <li key={s.n} className="mt-step">
            <Label>Étape {s.n}</Label>
            <h3 className="sz-section-title">{s.t}</h3>
            <p className="mt-step__text">{s.d}</p>
          </li>
        ))}
      </ol>
      <div className="mt-sim">
        <h3 className="sz-section-title">Ce qui est simulé</h3>
        <ul className="mt-list">
          <li><strong>Haddad, astronaute fictif.</strong> 49 jours de vie à bord (J46 à J94), aucune personne réelle.</li>
          <li><strong>Un trouble à partir de J{ONSET}.</strong> Il s'isole, dort moins, saute des repas. Les agents ne le savent pas.</li>
          <li><strong>Un témoin.</strong> Les mêmes journées sans trouble, pour vérifier l'absence de fausse alerte.</li>
          <li><strong>{DAYS.length} jours analysés</strong> ({DAYS.map((d) => `J${d}`).join(', ')}), chacun avec les 7 jours précédents. Biomarqueurs simulés.</li>
        </ul>
      </div>
    </Panel>
  );
}

function Dossier({ x }: { x: DayFile }): JSX.Element {
  const d = x.dossierPourLePsyHumain;
  const faits = x.observers.flatMap((o) => (o.output?.faits ?? []).slice(0, 3)).slice(0, 8);
  return (
    <Panel
      title={`Dossier du jour · J${x.day}`}
      className="mt-dossier"
      right={<StatusChip color={nivColor(d.niveau)} label={NIV_LABEL[d.niveau]} />}
      provenance="SIMULÉ"
    >
      <p className="mt-dossier__meta">
        {SC_LABEL[x.scenario]} · niveau retenu par au moins 2 psychologues sur 3 · votes : {d.votes.map((v) => NIV_LABEL[v.niveau].toLowerCase()).join(', ')}
      </p>
      <div className="mt-psys">
        {x.psychologists.map((p) => {
          const o = p.output ?? {};
          const note = o.noteAuPsy ?? '';
          return (
            <section key={p.id} className="mt-psy">
              <h3 className="sz-section-title">{cap(p.label.replace('Psychologue — ', ''))}</h3>
              <div className="mt-psy__level">
                <StatusDot color={nivColor(o.niveau)} />
                <span>{o.niveau ? NIV_LABEL[o.niveau] : '—'}</span>
                {o.confiance ? <span className="mt-psy__conf">· confiance {CONF[o.confiance] ?? o.confiance}</span> : null}
              </div>
              {o.hypotheses?.[0]?.schema ? <p className="mt-psy__hyp">{o.hypotheses[0].schema}</p> : null}
              <p className="mt-psy__note">{note.length > 260 ? note.slice(0, 257) + '…' : note}</p>
            </section>
          );
        })}
      </div>
      <details className="mt-more">
        <summary className="sz-btn sz-btn--ghost sz-btn--sm">
          <svg className="mt-more__chev" viewBox="0 0 8 8" aria-hidden="true"><path d="M2.5 1l3 3-3 3" fill="none" stroke="currentColor" strokeWidth="1.3" /></svg>
          Faits relevés par les observateurs ({faits.length})
        </summary>
        <ul className="mt-facts">
          {faits.map((f, i) => (
            <li key={i}>
              <span className="mt-facts__time">{f.heure}</span>
              <span>{f.fait}{f.citation ? <span className="mt-facts__quote"> « {f.citation} »</span> : null}</span>
            </li>
          ))}
        </ul>
      </details>
      <p className="mt-dossier__foot">Dossier transmis au psychologue humain au sol, qui décide. L'IA ne décide pas.</p>
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

  const back = <Link className="sz-link mt-back" to="/body">‹ Corps</Link>;

  if (!DAYS.length) {
    return (
      <div className="sz-page mt-page">
        {back}
        <header className="sz-page__head"><h1 className="sz-page__title">Santé mentale</h1></header>
        <p className="mt-empty">Données insuffisantes : aucun résultat disponible.</p>
      </div>
    );
  }

  return (
    <div className="sz-page mt-page">
      {back}
      <header className="sz-page__head mt-head">
        <div>
          <h1 className="sz-page__title">Santé mentale</h1>
          <p className="sz-page__sub">
            Repérer tôt, laisser l'humain décider.
            <span className="sz-detail"> Agents : {engine} ; cible : modèle embarqué à bord.</span>
          </p>
        </div>
        <div className="mt-head__right">
          <span className="mt-pill">Prototype</span>
          <ProvenanceBadge value="SIMULÉ" />
        </div>
      </header>

      <div className="mt-grid">
        <Panel title="Résultat">
          <dl className="mt-stats">
            <Kpi
              label="Échange proposé"
              value={detected ? `J${detected.day}` : '—'}
              note={detected ? `${detected.day - ONSET} jours après le début du trouble (J${ONSET})` : 'Aucune proposition d’échange'}
            />
            <Kpi label="Alerte du signal d'humeur" value={mlAlert !== null ? `J${mlAlert}` : '—'} note="Modèle de signal d'humeur, méthode indépendante" />
            <Kpi label="Fausses alertes" value={String(ctrlEsc)} note="Chez le témoin, sans trouble" />
          </dl>
        </Panel>

        <Panel title="Frise" right="Cliquer un verdict ouvre le dossier du jour">
          <Frise sel={sel} onSel={(sc, day) => setSel({ sc, day })} mlAlert={mlAlert} />
        </Panel>

        {current ? <Dossier key={`${sel.sc}${sel.day}`} x={current} /> : null}

        <HowItWorks />
      </div>

      <p className="mt-honest">Données entièrement simulées · aucune personne réelle · un signal à regarder, jamais un diagnostic.</p>
    </div>
  );
}
