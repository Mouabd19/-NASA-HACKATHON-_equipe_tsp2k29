// Propriétaire : Steve (D). Page « Santé mentale » — prototype §11 (3 observateurs → 3 psychologues IA → psychologue humain).
// Présentation : socle commun (src/ui) + mental.css (préfixe mt-). Données figées : public/data/mental/.
// Ouverte par un double-clic sur le cerveau dans la page Corps.
import { useEffect, useMemo, useRef, useState } from 'react';
import type { JSX, RefObject } from 'react';
import { createPortal } from 'react-dom';
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
const SC_LABEL: Record<Sc, string> = { drift: `Disorder starting D${ONSET}`, control: 'Healthy control' };

const DATA: Record<Sc, DayFile[]> = { drift: [], control: [] };
for (const f of Object.values(files)) if (f.scenario in DATA) DATA[f.scenario].push(f);
for (const sc of SCENARIOS) DATA[sc].sort((a, b) => a.day - b.day);
const DAYS = [...new Set(SCENARIOS.flatMap((sc) => DATA[sc].map((d) => d.day)))].sort((a, b) => a - b);

const NIV_LABEL: Record<Niveau, string> = {
  rien: 'Nothing to report', a_surveiller: 'Monitor', proposer_un_echange: 'Offer a conversation', donnees_insuffisantes: 'Insufficient data',
};
/** Statut d'un niveau (gris = inconnu, jamais vert par défaut). */
const nivColor = (n?: Niveau): Color =>
  n === 'proposer_un_echange' ? 'red' : n === 'a_surveiller' ? 'amber' : n === 'rien' ? 'green' : 'grey';
const rank = (n?: Niveau): number => (n === 'proposer_un_echange' ? 2 : n === 'a_surveiller' ? 1 : 0);
const CONF: Record<string, string> = { elevee: 'high', moyenne: 'medium', faible: 'low' };
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
  { k: 'humeur', name: 'Self-reported mood', unit: '1 to 5' },
  { k: 'sommeilH', name: 'Sleep', unit: 'hours' },
  { k: 'vfcMs', name: 'Heart rate variability', unit: 'ms' },
  { k: 'equipageMin', name: 'Time with crew', unit: 'min/day' },
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

/**
 * Verdict = point de couleur (vert : rien à signaler, ambre : à surveiller, rouge : proposer un échange, gris creux : inconnu).
 * Un clic sur le point descend au dossier du jour.
 */
function VerdictMark({ cx, cy, color }: { cx: number; cy: number; color: Color }): JSX.Element {
  const c = statusVar[color];
  // contour de la couleur du panneau : le point « coupe » l'axe au lieu de s'y superposer
  return color === 'grey'
    ? <circle className="mt-verdict__pt" data-color={color} cx={cx} cy={cy} r={4} fill="var(--sz-panel)" stroke={c} strokeWidth={1.5} />
    : <circle className="mt-verdict__pt" data-color={color} cx={cx} cy={cy} r={4.5} fill={c} stroke="var(--sz-panel)" strokeWidth={2} paintOrder="stroke" />;
}

/** Point de légende, mêmes couleurs que la frise. */
function VerdictDot({ color }: { color: Color }): JSX.Element {
  const c = statusVar[color];
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
      {color === 'grey' ? <circle cx="5" cy="5" r="3.5" fill="none" stroke={c} strokeWidth="1.4" /> : <circle cx="5" cy="5" r="4" fill={c} />}
    </svg>
  );
}

/** Flèche vers le haut du bouton « Haut de page ». */
function ArrowUp(): JSX.Element {
  return (
    <svg width="12" height="14" viewBox="0 0 12 14" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 13 V2 M1.5 6.5 L6 2 L10.5 6.5" />
    </svg>
  );
}

/** Conteneur qui défile autour de la page (la coquille fait défiler .sz-main__scroll, pas la fenêtre). */
function scrollParent(el: HTMLElement | null): HTMLElement | null {
  for (let p = el?.parentElement ?? null; p; p = p.parentElement) {
    const o = getComputedStyle(p).overflowY;
    if ((o === 'auto' || o === 'scroll') && p.scrollHeight > p.clientHeight) return p;
  }
  return null;
}
const smoothOr = (): ScrollBehavior => (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth');

function Frise({ sel, onSel, mlAlert }: { sel: { sc: Sc; day: number }; onSel: (sc: Sc, day: number) => void; mlAlert: number | null }): JSX.Element {
  const [ref, measured] = useWidth(1000);
  const drift = SERIES.drift ?? [];
  const ctrl = SERIES.control ?? [];
  if (!drift.length) return <p className="mt-empty">Insufficient data: series missing.</p>;
  const d0 = drift[0].day, d1 = drift[drift.length - 1].day;
  const W = Math.max(520, measured), L = W < 720 ? 124 : 168, R = 16;
  const x = (d: number): number => L + ((d - d0) / (d1 - d0)) * (W - L - R);
  const TRACK = [{ sc: 'drift' as Sc, y: 36, name: 'Verdict · disorder' }, { sc: 'control' as Sc, y: 64, name: 'Verdict · control' }];
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
        <svg className="mt-frise" viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label={`Timeline D${d0} to D${d1}: mood, sleep, heart rate variability and time with crew, with and without the disorder; agent verdicts on analyzed days`}>
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
          <text x={x(ONSET) + 6} y={12}>Disorder onset D{ONSET}</text>
          {mlAlert !== null ? (
            <g>
              <line className="mt-frise__mark mt-frise__mark--dash" x1={x(mlAlert)} x2={x(mlAlert)} y1={80} y2={BOTTOM} />
              <text x={x(mlAlert) - 6} y={88} textAnchor="end">Mood signal: alert D{mlAlert}</text>
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
                  <g key={dd.day} className="mt-verdict" role="button" tabIndex={0} aria-pressed={on} aria-label={`${SC_LABEL[t.sc]}, D${dd.day}: ${NIV_LABEL[n]}. Go to the day's file`}
                    onClick={() => onSel(t.sc, dd.day)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSel(t.sc, dd.day); } }}>
                    {/* point de couleur ; survol et sélection = anneau fin autour */}
                    <title>{`D${dd.day} · ${NIV_LABEL[n]} — click to go to the file`}</title>
                    <rect className="mt-verdict__hit" x={x(dd.day) - 13} y={t.y - 13} width={26} height={26} />
                    <circle className="mt-verdict__ring" cx={x(dd.day)} cy={t.y} r={9} />
                    <VerdictMark cx={x(dd.day)} cy={t.y} color={color} />
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
            <text key={d} x={x(d)} y={H - 6} textAnchor="middle">D{d}</text>
          ))}
        </svg>
      </div></div>
      {measured < 520 ? <p className="mt-chart__hint">The timeline is wider than the screen: scroll →</p> : null}
      <ul className="mt-legend">
        <li><svg width="20" height="4" aria-hidden="true"><line className="mt-frise__line" x1="0" x2="20" y1="2" y2="2" /></svg>With disorder</li>
        <li><svg width="20" height="4" aria-hidden="true"><line className="mt-frise__line mt-frise__line--ctrl" x1="0" x2="20" y1="2" y2="2" /></svg>Control</li>
        {(['rien', 'a_surveiller', 'proposer_un_echange'] as Niveau[]).map((n) => (
          <li key={n}><VerdictDot color={nivColor(n)} />{NIV_LABEL[n]}</li>
        ))}
        <li className="mt-legend__note">3-day average</li>
      </ul>
    </div>
  );
}

const STEPS = [
  { n: '1', t: 'Glasses and watch', d: 'Capture the day: scenes, speaking time, meals, sleep, heart rate variability.' },
  { n: '2', t: '3 AI observers', d: 'Record facts without interpreting: actions, words, interactions with the crew.' },
  { n: '3', t: '3 AI psychologists', d: 'Each gives a level. The level kept is the one shared by at least 2 of 3.' },
  { n: '4', t: 'Human psychologist', d: 'Receives the file on the ground and decides. The astronaut cannot switch off the signal.' },
];

function HowItWorks(): JSX.Element {
  return (
    <Panel title="How it works">
      <ol className="mt-steps">
        {STEPS.map((s) => (
          <li key={s.n} className="mt-step">
            <Label>Step {s.n}</Label>
            <h3 className="sz-section-title">{s.t}</h3>
            <p className="mt-step__text">{s.d}</p>
          </li>
        ))}
      </ol>
    </Panel>
  );
}

function Dossier({ x }: { x: DayFile }): JSX.Element {
  const d = x.dossierPourLePsyHumain;
  const faits = x.observers.flatMap((o) => (o.output?.faits ?? []).slice(0, 3)).slice(0, 8);
  return (
    <Panel
      title={`Day file · D${x.day}`}
      className="mt-dossier"
      right={<StatusChip color={nivColor(d.niveau)} label={NIV_LABEL[d.niveau]} />}
      provenance="SIMULÉ"
    >
      <p className="mt-dossier__meta">
        {SC_LABEL[x.scenario]} · level kept by at least 2 of 3 psychologists · votes: {d.votes.map((v) => NIV_LABEL[v.niveau].toLowerCase()).join(', ')}
      </p>
      <div className="mt-psys">
        {x.psychologists.map((p) => {
          const o = p.output ?? {};
          const note = o.noteAuPsy ?? '';
          return (
            <section key={p.id} className="mt-psy">
              <h3 className="sz-section-title">{cap(p.label.replace(/^(?:Psychologue|Psychologist) — /, ''))}</h3>
              <div className="mt-psy__level">
                <StatusDot color={nivColor(o.niveau)} />
                <span>{o.niveau ? NIV_LABEL[o.niveau] : '—'}</span>
                {o.confiance ? <span className="mt-psy__conf">· {CONF[o.confiance] ?? o.confiance} confidence</span> : null}
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
          Facts recorded by the observers ({faits.length})
        </summary>
        <ul className="mt-facts">
          {faits.map((f, i) => (
            <li key={i}>
              <span className="mt-facts__time">{f.heure}</span>
              <span>{f.fait}{f.citation ? <span className="mt-facts__quote"> “{f.citation}”</span> : null}</span>
            </li>
          ))}
        </ul>
      </details>
      <p className="mt-dossier__foot">File sent to the human psychologist on the ground, who decides. The AI does not decide.</p>
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
  const pageRef = useRef<HTMLDivElement>(null);
  const [showTop, setShowTop] = useState(false);
  // un verdict cliqué : son dossier s'affiche, puis la page descend jusqu'aux blocs de texte
  const pick = (sc: Sc, day: number): void => {
    setSel({ sc, day });
    setTimeout(() => document.getElementById('mt-dossier')?.scrollIntoView({ behavior: smoothOr(), block: 'start' }), 0);
  };
  const toTop = (): void => {
    const sp = scrollParent(pageRef.current);
    if (sp) sp.scrollTo({ top: 0, behavior: smoothOr() });
    else window.scrollTo({ top: 0, behavior: smoothOr() });
  };
  // le bouton « Haut de page » n'apparaît qu'une fois la page descendue
  useEffect(() => {
    const sp = scrollParent(pageRef.current);
    const target: HTMLElement | Window = sp ?? window;
    const onScroll = (): void => setShowTop((sp ? sp.scrollTop : window.scrollY) > 240);
    onScroll();
    target.addEventListener('scroll', onScroll, { passive: true });
    return () => target.removeEventListener('scroll', onScroll);
  }, []);
  const engine = SUMMARY.model ? SUMMARY.model.replace(/^claude-(\w+)-(\d+)-(\d+)$/, (_m, n: string, a: string, b: string) => `Claude ${cap(n)} ${a}.${b}`) : 'language model';

  const back = <Link className="sz-link mt-back" to="/body">‹ Body</Link>;

  if (!DAYS.length) {
    return (
      <div className="sz-page mt-page">
        {back}
        <header className="sz-page__head"><h1 className="sz-page__title">Mental health</h1></header>
        <p className="mt-empty">Insufficient data: no results available.</p>
      </div>
    );
  }

  return (
    <div className="sz-page mt-page" ref={pageRef}>
      {back}
      <header className="sz-page__head mt-head">
        <div>
          <h1 className="sz-page__title">Mental health</h1>
          <p className="sz-page__sub">
            Spot early, let a human decide.
            <span className="sz-detail"> Agents: {engine}; target: onboard embedded model.</span>
          </p>
        </div>
        <div className="mt-head__right">
          <ProvenanceBadge value="SIMULÉ" />
        </div>
      </header>

      <div className="mt-grid">
        <Panel title="Result">
          <dl className="mt-stats">
            <Kpi
              label="Conversation offered"
              value={detected ? `D${detected.day}` : '—'}
              note={detected ? `${detected.day - ONSET} days after disorder onset (D${ONSET})` : 'No conversation offered'}
            />
            <Kpi label="Mood signal alert" value={mlAlert !== null ? `D${mlAlert}` : '—'} note="Mood signal model, independent method" />
            <Kpi label="False alerts" value={String(ctrlEsc)} note="In the control, without the disorder" />
          </dl>
        </Panel>

        <Panel title="Timeline" right="Click a point to go to the day’s file">
          <Frise sel={sel} onSel={pick} mlAlert={mlAlert} />
        </Panel>

        <div id="mt-dossier" className="mt-anchor">
          {current ? <Dossier key={`${sel.sc}${sel.day}`} x={current} /> : null}
        </div>

        <HowItWorks />
      </div>

      <p className="mt-honest">A signal to look at, never a diagnosis.</p>

      {/* rendu dans <body> : la page est animée à l'entrée (transform), ce qui casserait position: fixed */}
      {createPortal(
        <button type="button" className="sz-btn mt-totop" data-show={showTop} onClick={toTop} tabIndex={showTop ? 0 : -1} aria-hidden={!showTop}>
          <ArrowUp />
          Back to top
        </button>,
        document.body,
      )}
    </div>
  );
}
