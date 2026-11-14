// Timeline de la page Body (ROADMAP §1 « Timeline en bas ») : règle graduée J0 → J860.
// J0 → J94 = corps MESURÉS (plein) ; au-delà = corps PROJETÉ (hachuré, [H]).
// Le ruban au-dessus de la règle montre le pire niveau d'alerte par tranche de 5 jours
// (rien n'est tracé quand il n'y a pas d'alerte : l'absence de donnée n'est jamais du vert).
import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { JSX, PointerEvent as ReactPointerEvent } from 'react';
import type { Color, Level } from '../../../types';
import { CHRONO_AGE_J0, DAY_END, DAY_SOL0, DAY_TODAY } from '../../../mocks/mission';
import { alertsForDay } from '../../../models/alerts';
import { bioAgeSeries } from '../../../models/bioAge';
import { ProvenanceBadge, TagBadge, dayToDate, fmt, levelColor, statusColor, statusLabel } from '../../../ui';
import { useBody } from '../store';
import './Timeline.css';

// ── Réglages (tout ce qui s'ajuste à l'œil est ici) ─────────────────────────
const H = 84;                 // hauteur de la bande (px)
const PAD = 16;               // marge gauche/droite de la règle dans la piste (px)
const PLAY_SECONDS = 20;      // durée d'une lecture J0 → J860
const RIBBON_STEP = 5;        // échantillonnage du ruban d'alertes (jours)
const READOUT_W = 228;        // largeur de l'afficheur flottant (px)
/** Vitesse de vieillissement terrestre de la hanche, ROADMAP §« Écart d'âge » : ≈ 1 %/an [H]. */
const HIP_AGING_PCT_PER_YEAR = 1;

// Géométrie verticale de la piste (px depuis le haut)
const Y = {
  markText: 29,   // ligne de base des repères (J0 DÉPART, J94 AUJOURD'HUI…)
  markTop: 21,    // haut des mâts de repère
  ribbon: 35,     // axe du ruban d'alertes
  bandTop: 41,
  bandBottom: 53, // = ligne de base de la règle
  tickLabel: 74,
} as const;
const RIBBON_H = 4;
const MARK_CHAR = 6.3; // largeur approx. d'un caractère de repère (mono 9 px + interlettrage)

const clampDay = (d: number): number => Math.max(0, Math.min(DAY_END, Math.round(d)));

// ── Ruban d'alertes ─────────────────────────────────────────────────────────
const SEVERITY: Record<Level, number> = { VERT: 0, DONNEES_INSUFFISANTES: 1, AMBRE: 2, ORANGE: 3, ROUGE: 4 };

interface Run { from: number; to: number; color: Color }

/** Pire niveau d'alerte par tranche de RIBBON_STEP jours, fusionné en segments de même couleur. */
function computeRuns(): Run[] {
  const runs: Run[] = [];
  for (let d = 0; d <= DAY_END; d += RIBBON_STEP) {
    let worst: Level | null = null;
    for (const a of alertsForDay(d)) {
      if (SEVERITY[a.level] > 0 && (worst === null || SEVERITY[a.level] > SEVERITY[worst])) worst = a.level;
    }
    if (worst === null) continue; // aucune alerte : rien à tracer (pas de vert par défaut)
    const color = levelColor[worst];
    const from = Math.max(0, d - RIBBON_STEP / 2);
    const to = Math.min(DAY_END, d + RIBBON_STEP / 2);
    const last = runs[runs.length - 1];
    if (last && last.color === color && Math.abs(last.to - from) < 1e-6) last.to = to;
    else runs.push({ from, to, color });
  }
  return runs;
}

/** Coupe les segments à J94 pour tracer le mesuré en plein et le projeté en tirets. */
function splitAtToday(runs: Run[]): (Run & { projected: boolean })[] {
  const out: (Run & { projected: boolean })[] = [];
  for (const r of runs) {
    if (r.to <= DAY_TODAY) out.push({ ...r, projected: false });
    else if (r.from >= DAY_TODAY) out.push({ ...r, projected: true });
    else {
      out.push({ ...r, to: DAY_TODAY, projected: false });
      out.push({ ...r, from: DAY_TODAY, projected: true });
    }
  }
  return out;
}

// ── Repères ─────────────────────────────────────────────────────────────────
interface Landmark { day: number; key: string; labels: string[]; strong?: boolean; alignEnd?: boolean }

const LANDMARKS: Landmark[] = [
  { day: 0, key: 'depart', labels: ['J0 DÉPART', 'J0'] },
  { day: DAY_TODAY, key: 'today', labels: [`J${DAY_TODAY} AUJOURD'HUI`, `J${DAY_TODAY} AUJ.`, `J${DAY_TODAY}`], strong: true },
  { day: DAY_SOL0, key: 'sol0', labels: ['SOL 0 · ARRIVÉE MARS', 'SOL 0 · ARRIVÉE', 'SOL 0'] },
  { day: DAY_END, key: 'fin', labels: [`J${DAY_END} FIN DE MISSION`, `J${DAY_END} FIN`, `J${DAY_END}`], alignEnd: true },
];

/** Choisit, pour chaque repère, le libellé le plus long qui tient avant le repère suivant. */
function fitLandmarks(x: (d: number) => number): { lm: Landmark; x: number; text: string }[] {
  const res: { lm: Landmark; x: number; text: string }[] = [];
  const endLm = LANDMARKS[LANDMARKS.length - 1];
  let endText = endLm.labels[0];
  // Le repère de fin (aligné à droite) partage l'espace avec l'avant-dernier.
  const prevX = x(LANDMARKS[LANDMARKS.length - 2].day);
  const span = x(endLm.day) - prevX - 12;
  const need = (s: string): number => s.length * MARK_CHAR + 8;
  const prevLabels = LANDMARKS[LANDMARKS.length - 2].labels;
  let prevPick = prevLabels[prevLabels.length - 1];
  search: for (const p of prevLabels) {
    for (const e of endLm.labels) {
      if (need(p) + need(e) <= span) { prevPick = p; endText = e; break search; }
    }
  }
  for (let i = 0; i < LANDMARKS.length; i++) {
    const lm = LANDMARKS[i];
    const px = x(lm.day);
    if (i === LANDMARKS.length - 1) { res.push({ lm, x: px, text: endText }); continue; }
    if (i === LANDMARKS.length - 2) { res.push({ lm, x: px, text: prevPick }); continue; }
    const room = x(LANDMARKS[i + 1].day) - px - 4;
    const text = lm.labels.find((s) => need(s) <= room) ?? lm.labels[lm.labels.length - 1];
    res.push({ lm, x: px, text });
  }
  return res;
}

// ── Règle statique (ne se redessine que si la largeur change) ───────────────
const Ruler = memo(function Ruler({ width, runs }: { width: number; runs: Run[] }): JSX.Element {
  const inner = Math.max(1, width - 2 * PAD);
  const x = (d: number): number => PAD + (d / DAY_END) * inner;
  const px = (v: number): number => Math.round(v) + 0.5; // traits nets de 1 px
  const pxPerDay = inner / DAY_END;
  const minorStep = pxPerDay * 10 >= 4 ? 10 : 50;
  const labelStep = pxPerDay * 100 >= 38 ? 100 : 200;

  const ticks: JSX.Element[] = [];
  const labels: JSX.Element[] = [];
  for (let d = 0; d <= DAY_END; d += minorStep) {
    const major = d % 100 === 0;
    const mid = !major && d % 50 === 0;
    const len = major ? 10 : mid ? 7 : 4;
    ticks.push(
      <line
        key={d}
        className={major ? 'tl__tick tl__tick--major' : mid ? 'tl__tick tl__tick--mid' : 'tl__tick'}
        data-proj={d > DAY_TODAY}
        x1={px(x(d))} x2={px(x(d))} y1={Y.bandBottom} y2={Y.bandBottom + len}
      />,
    );
    if (d % labelStep === 0) {
      labels.push(
        <text key={d} className="tl__ticklabel" data-proj={d > DAY_TODAY} x={x(d)} y={Y.tickLabel} textAnchor="middle">
          {d === 0 ? 'J0' : d}
        </text>,
      );
    }
  }

  const xToday = x(DAY_TODAY);
  const xEnd = x(DAY_END);
  const marks = fitLandmarks(x);
  const segs = splitAtToday(runs);
  const bandH = Y.bandBottom - Y.bandTop;
  const measuredW = xToday - x(0);
  const projectedW = xEnd - xToday;

  return (
    <svg className="tl__svg" width={width} height={H} viewBox={`0 0 ${width} ${H}`} aria-hidden="true">
      <defs>
        <pattern id="tl-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
          <line className="tl__hatchline" x1="0" y1="0.5" x2="6" y2="0.5" />
        </pattern>
      </defs>

      {/* Zones : mesuré (plein) / projeté (hachuré) */}
      <rect className="tl__zone tl__zone--measured" x={x(0)} y={Y.bandTop} width={measuredW} height={bandH} />
      <rect className="tl__zone tl__zone--projected" x={xToday} y={Y.bandTop} width={projectedW} height={bandH} fill="url(#tl-hatch)" />
      <line className="tl__edge" x1={x(0)} x2={xToday} y1={Y.bandTop + 0.5} y2={Y.bandTop + 0.5} />
      <line className="tl__edge tl__edge--proj" x1={xToday} x2={xEnd} y1={Y.bandTop + 0.5} y2={Y.bandTop + 0.5} />
      {measuredW > 46 && (
        <text className="tl__zonelabel" x={x(0) + 5} y={Y.bandBottom - 3.5}>MESURÉ</text>
      )}
      {projectedW > 120 && (
        <g>
          <rect className="tl__zonelabel-bg" x={xToday + 6} y={Y.bandTop + 1} width={88} height={bandH - 2} />
          <text className="tl__zonelabel tl__zonelabel--proj" x={xToday + 10} y={Y.bandBottom - 3.5}>PROJETÉ [H]</text>
        </g>
      )}

      {/* Ligne de base + graduations */}
      <line className="tl__base" x1={x(0)} x2={xToday} y1={Y.bandBottom + 0.5} y2={Y.bandBottom + 0.5} />
      <line className="tl__base tl__base--proj" x1={xToday} x2={xEnd} y1={Y.bandBottom + 0.5} y2={Y.bandBottom + 0.5} />
      {ticks}
      {labels}

      {/* Ruban d'alertes (pire niveau par tranche de 5 j) */}
      <line className="tl__ribbon-rail" x1={x(0)} x2={xEnd} y1={Y.ribbon + 0.5} y2={Y.ribbon + 0.5} />
      {segs.map((s) => (
        <line
          key={`${s.from}-${s.projected ? 'p' : 'm'}`}
          className="tl__ribbon"
          data-proj={s.projected}
          x1={x(s.from)} x2={x(s.to)} y1={Y.ribbon} y2={Y.ribbon}
          stroke={statusColor[s.color]} strokeWidth={RIBBON_H}
        >
          <title>{`ALERTES J${Math.ceil(s.from)}–J${Math.floor(s.to)} : ${statusLabel[s.color]}${s.projected ? ' (projeté)' : ''}`}</title>
        </line>
      ))}

      {/* Repères de mission */}
      {marks.map(({ lm, x: mx, text }) => (
        <g key={lm.key} className={lm.strong ? 'tl__mark tl__mark--strong' : 'tl__mark'}>
          <line x1={px(mx)} x2={px(mx)} y1={Y.markTop} y2={Y.bandBottom + (lm.strong ? 14 : 10)} />
          {lm.strong && (
            <path d={`M${px(mx) - 4} ${Y.markTop} h8 l-4 5 z`} />
          )}
          <text x={lm.alignEnd ? mx - 5 : mx + 6} y={Y.markText} textAnchor={lm.alignEnd ? 'end' : 'start'}>{text}</text>
        </g>
      ))}
    </svg>
  );
});

// ── Glyphes (SVG, pas d'émoji) ──────────────────────────────────────────────
function PlayGlyph({ playing }: { playing: boolean }): JSX.Element {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true" fill="currentColor">
      {playing ? <path d="M1 0h3v10H1zM6 0h3v10H6z" /> : <path d="M1 0l9 5-9 5z" />}
    </svg>
  );
}

/** Écart hanche à J860 (bioAge − âge réel, en années [H]) converti en perte (%) au taux de 1 %/an [H]. */
function hipLossAtEnd(adherence: 0 | 1): number | null {
  const series = bioAgeSeries('hanche', adherence);
  const last = series[series.length - 1];
  if (!last) return null;
  const chrono = CHRONO_AGE_J0 + last.day / 365.25;
  return (last.bioAge - chrono) * HIP_AGING_PCT_PER_YEAR;
}

function isTypingTarget(t: EventTarget | null): boolean {
  if (!(t instanceof HTMLElement)) return false;
  return t.isContentEditable || t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT';
}

// ── Composant ───────────────────────────────────────────────────────────────
export function Timeline(): JSX.Element {
  const day = useBody((s) => s.day);
  const playing = useBody((s) => s.playing);
  const adherence = useBody((s) => s.adherence);
  const setDay = useBody((s) => s.setDay);
  const setPlaying = useBody((s) => s.setPlaying);
  const setAdherence = useBody((s) => s.setAdherence);

  const trackRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const drag = useRef<{ left: number; id: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  useLayoutEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    setWidth(Math.round(el.clientWidth));
    const ro = new ResizeObserver((entries) => {
      const w = Math.round(entries[0].contentRect.width);
      setWidth((prev) => (prev === w ? prev : w));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const runs = useMemo(computeRuns, []);
  const impact = useMemo(() => ({ rythme: hipLossAtEnd(0), plan: hipLossAtEnd(1) }), []);

  // Lecture : J0 → J860 en ~PLAY_SECONDS s, arrêt en fin de mission.
  useEffect(() => {
    if (!playing) return;
    const st = useBody.getState();
    let pos = st.day >= DAY_END ? 0 : st.day;
    let lastSet = pos;
    if (pos !== st.day) st.setDay(pos);
    let prev = performance.now();
    let raf = 0;
    const speed = DAY_END / PLAY_SECONDS; // jours par seconde
    const frame = (now: number): void => {
      const s = useBody.getState();
      if (s.day !== lastSet) pos = s.day; // quelqu'un d'autre a déplacé le jour : on repart de là
      pos = Math.min(DAY_END, pos + (Math.min(100, now - prev) / 1000) * speed);
      prev = now;
      const d = Math.floor(pos);
      if (d !== s.day) s.setDay(d);
      lastSet = d;
      if (pos >= DAY_END) { s.setPlaying(false); return; }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  // Clavier (global à la page, hors champs de saisie) : ←/→ ±1 j, ⇧ ±10 j, Début, Fin, T.
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || isTypingTarget(e.target)) return;
      const s = useBody.getState();
      let next: number | null = null;
      if (e.key === 'ArrowLeft') next = s.day - (e.shiftKey ? 10 : 1);
      else if (e.key === 'ArrowRight') next = s.day + (e.shiftKey ? 10 : 1);
      else if (e.key === 'Home') next = 0;
      else if (e.key === 'End') next = DAY_END;
      else if (e.key === 't' || e.key === 'T') next = DAY_TODAY;
      if (next === null) return;
      e.preventDefault();
      if (s.playing) s.setPlaying(false);
      s.setDay(clampDay(next));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const inner = Math.max(1, width - 2 * PAD);
  const dayFromClientX = useCallback(
    (clientX: number, left: number): number => clampDay(((clientX - left - PAD) / inner) * DAY_END),
    [inner],
  );

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>): void => {
    if (e.button !== 0) return;
    const el = e.currentTarget;
    const left = el.getBoundingClientRect().left; // lu une seule fois par geste
    drag.current = { left, id: e.pointerId };
    el.setPointerCapture(e.pointerId);
    el.focus({ preventScroll: true });
    setDragging(true);
    if (playing) setPlaying(false);
    setDay(dayFromClientX(e.clientX, left));
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>): void => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const next = dayFromClientX(e.clientX, d.left);
    if (next !== useBody.getState().day) setDay(next);
  };
  const endDrag = (e: ReactPointerEvent<HTMLDivElement>): void => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    setDragging(false);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const projected = day > DAY_TODAY;
  const headX = PAD + (day / DAY_END) * inner;
  const readoutX = Math.max(0, Math.min(Math.max(0, width - READOUT_W), headX - READOUT_W / 2));
  const dayText = `J${String(day).padStart(3, '0')}`;
  const date = dayToDate(day);

  const jump = (d: number): void => {
    if (playing) setPlaying(false);
    setDay(d);
  };

  return (
    <div className="tl" data-projected={projected} data-playing={playing} role="group" aria-label="Chronologie de la mission">
      {/* ── Commandes de gauche ── */}
      <div className="tl__left">
        <div className="tl__cap">
          <span className="sz-label sz-dim">SYS-T</span>
          <span className="sz-label">CHRONOLOGIE</span>
          <span className="tl__fill" />
          <ProvenanceBadge value="SIMULÉ" />
        </div>
        <div className="tl__buttons">
          <button
            type="button"
            className="sz-btn tl__play"
            aria-pressed={playing}
            aria-label={playing ? 'Pause' : 'Lecture'}
            title={playing ? 'Pause' : `Lecture (J0 → J${DAY_END} en ${PLAY_SECONDS} s)`}
            onClick={() => setPlaying(!playing)}
          >
            <PlayGlyph playing={playing} />
          </button>
          <button type="button" className="sz-btn" data-active={day === DAY_TODAY} onClick={() => jump(DAY_TODAY)} title="Revenir au dernier corps mesuré (T)">
            AUJOURD'HUI
          </button>
          <button type="button" className="sz-btn" data-active={day === DAY_SOL0} onClick={() => jump(DAY_SOL0)} title={`Arrivée sur Mars — J${DAY_SOL0} [Persona]`}>
            SOL 0
          </button>
          <button type="button" className="sz-btn" data-active={day === DAY_END} onClick={() => jump(DAY_END)} title="Fin de mission [Persona]">
            J{DAY_END}
          </button>
        </div>
        <div className="tl__hint sz-label sz-dim" aria-hidden="true">
          <Key>←</Key><Key>→</Key> ±1 J <span className="tl__sep" /> <Key>MAJ</Key> ±10 J <span className="tl__sep" /> <Key>T</Key> AUJ.
        </div>
      </div>

      {/* ── Piste ── */}
      <div
        ref={trackRef}
        className="tl__track"
        data-dragging={dragging}
        role="slider"
        tabIndex={0}
        aria-label="Jour de mission"
        aria-orientation="horizontal"
        aria-valuemin={0}
        aria-valuemax={DAY_END}
        aria-valuenow={day}
        aria-valuetext={`${dayText}, ${date}, ${projected ? 'projeté' : 'mesuré'}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        {width > 0 && <Ruler width={width} runs={runs} />}
        {width > 0 && (
          <>
            <div className="tl__head" style={{ transform: `translate3d(${headX}px,0,0)` }}>
              <svg className="tl__head-svg" width="11" height={H} viewBox={`0 0 11 ${H}`} aria-hidden="true">
                <line x1="5.5" x2="5.5" y1="17" y2={Y.bandBottom + 13} />
                <path d={`M1 ${Y.bandTop - 5} h9 l-4.5 5 z`} />
                <path d={`M1 ${Y.bandBottom + 14} h9 l-4.5 -5 z`} />
              </svg>
            </div>
            <div className="tl__readout sz-mono" style={{ transform: `translate3d(${readoutX}px,0,0)`, width: READOUT_W }}>
              <span className="tl__readout-day">{dayText}</span>
              <span className="tl__readout-dash">—</span>
              <span>{date}</span>
              <span className="tl__readout-dash">—</span>
              <span className="tl__readout-mode">{projected ? 'PROJETÉ' : 'MESURÉ'}</span>
            </div>
          </>
        )}
      </div>

      {/* ── Commandes de droite : adhérence + métrique d'impact ── */}
      <div className="tl__right">
        <div className="tl__cap">
          <span className="sz-label sz-dim">PROJECTION</span>
          <span className="tl__fill" />
          <ProvenanceBadge value="H" />
        </div>
        <div className="tl__toggle" role="radiogroup" aria-label="Scénario de projection">
          <button type="button" role="radio" aria-checked={adherence === 0} className="sz-btn" data-active={adherence === 0} onClick={() => setAdherence(0)}>
            RYTHME ACTUEL
          </button>
          <button type="button" role="radio" aria-checked={adherence === 1} className="sz-btn" data-active={adherence === 1} onClick={() => setAdherence(1)}>
            AVEC LE PLAN
          </button>
        </div>
        <div
          className="tl__impact sz-label"
          title={`Perte osseuse estimée de la hanche à J${DAY_END} : écart d'âge biologique × ${fmt(HIP_AGING_PCT_PER_YEAR)} %/an [H]`}
        >
          <span className="sz-dim">HANCHE J{DAY_END} :</span>
          <span className="tl__impact-val" data-on={adherence === 0}>{lossText(impact.rythme)}</span>
          <span className="tl__impact-bar" />
          <span className="tl__impact-val" data-on={adherence === 1}>{lossText(impact.plan)}</span>
          <TagBadge tag="H" />
        </div>
      </div>
    </div>
  );
}

function Key({ children }: { children: string }): JSX.Element {
  return <kbd className="tl__key">{children}</kbd>;
}

function lossText(v: number | null): string {
  if (v === null || !Number.isFinite(v)) return '— %';
  const mag = fmt(Math.abs(v), 2);
  const sign = Math.abs(v) < 0.005 ? '' : v > 0 ? '-' : '+'; // écart positif = perte
  return `${sign}${mag} %`;
}
