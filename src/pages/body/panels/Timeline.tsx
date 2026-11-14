// Chronologie de la page Corps : frise J0 → J860 façon curseur de dates.
// J0 → J94 = jours mesurés (aplat clair) ; au-delà = projection (aplat sombre).
// Le filet « Alertes » sous la piste reprend le pire niveau d'alerte par tranche de 5 jours, en tirets
// sur la partie projetée (rien n'est tracé quand il n'y a pas d'alerte : l'absence de donnée n'est jamais du vert).
import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { JSX, PointerEvent as ReactPointerEvent } from 'react';
import type { Color, Level } from '../../../types';
import { DAY_END, DAY_SOL0, DAY_TODAY } from '../../../mocks/mission';
import { alertsForDayPlan } from '../../../models/alerts';
import { boneLossPct } from '../../../models/bone';
import { PanelClose, ProvenanceBadge, dayToDate, fmt, fmtDay, levelColor, statusLabel, statusVar } from '../../../ui';
import { useBody } from '../store';
import './Timeline.css';

// ── Réglages (tout ce qui s'ajuste à l'œil est ici) ─────────────────────────
const H = 72;                 // hauteur de la bande (px) — = .tl { height }
const PAD = 16;               // marge gauche/droite de la frise dans la piste (px)
const PLAY_SECONDS = 20;      // durée d'une lecture J0 → J860
const RIBBON_STEP = 5;        // échantillonnage du filet d'alertes (jours)

// Géométrie verticale de la piste (px depuis le haut) — reprise dans Timeline.css pour le curseur
const Y = {
  markText: 18,    // ligne de base des jalons (même rangée que l'étiquette du curseur)
  markTop: 9,      // haut des traits de jalon
  trackTop: 32,
  trackBottom: 38,
  ribbon: 45.5,    // axe du filet d'alertes
  tickTop: 51,
  tickLabel: 66,
} as const;
const RIBBON_H = 3;
const RIBBON_LABEL = 'Alertes';
const MARK_CHAR = 5.9;   // largeur approx. d'un caractère de jalon (Inter 11 px)
const DAY_CHAR = 7.6;    // largeur approx. (majorée) d'un caractère du jour de l'étiquette (Inter 12 px, 600)
const DATE_CHAR = 6.4;   // idem pour la date (Inter 12 px)
const EDGE = 8;          // marge minimale entre l'étiquette du curseur et le bord de la piste

const DATE_FMT = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
/** Date lisible d'un jour de mission : 94 → « 14 nov. 2026 ». */
const dayLabelDate = (day: number): string => DATE_FMT.format(new Date(`${dayToDate(day)}T00:00:00Z`));

const clampDay = (d: number): number => Math.max(0, Math.min(DAY_END, Math.round(d)));

// ── Ruban d'alertes ─────────────────────────────────────────────────────────
const SEVERITY: Record<Level, number> = { VERT: 0, DONNEES_INSUFFISANTES: 1, AMBRE: 2, ORANGE: 3, ROUGE: 4 };

interface Run { from: number; to: number; color: Color }

/** Pire niveau d'alerte par tranche de RIBBON_STEP jours, fusionné en segments de même couleur. */
function computeRuns(adherence: number): Run[] {
  const runs: Run[] = [];
  for (let d = 0; d <= DAY_END; d += RIBBON_STEP) {
    let worst: Level | null = null;
    for (const a of alertsForDayPlan(d, adherence)) {
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
interface Landmark { day: number; key: string; labels: string[]; alignEnd?: boolean }

// Libellés courts : le numéro du jour est déjà sur la graduation et sur les boutons d'accès direct.
const LANDMARKS: Landmark[] = [
  { day: 0, key: 'depart', labels: ['Départ', ''] },
  { day: DAY_TODAY, key: 'today', labels: ["Aujourd'hui", ''] },
  { day: DAY_SOL0, key: 'sol0', labels: ['Sol 0', ''] },   // date provisoire (mocks/mission.ts)
  { day: DAY_END, key: 'fin', labels: ['Fin de mission', ''], alignEnd: true },
];

interface FittedMark { lm: Landmark; x: number; text: string }

/** Choisit, pour chaque repère, le libellé le plus long qui tient avant le repère suivant. */
function fitLandmarks(x: (d: number) => number): FittedMark[] {
  const res: FittedMark[] = [];
  const endLm = LANDMARKS[LANDMARKS.length - 1];
  let endText = endLm.labels[0];
  // Le repère de fin (aligné à droite) partage l'espace avec l'avant-dernier.
  const prevX = x(LANDMARKS[LANDMARKS.length - 2].day);
  const span = x(endLm.day) - prevX - 12;
  const need = (s: string): number => (s ? s.length * MARK_CHAR + 10 : 0);
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
    const room = x(LANDMARKS[i + 1].day) - px;
    const text = lm.labels.find((s) => need(s) <= room) ?? lm.labels[lm.labels.length - 1];
    res.push({ lm, x: px, text });
  }
  return res;
}

// ── Frise statique (ne se redessine que si la largeur ou le scénario change) ──
/** `hidden` : clés des jalons dont le libellé est masqué (l'étiquette du curseur occupe leur place). */
const Ruler = memo(function Ruler({ width, runs, marks, hidden }: { width: number; runs: Run[]; marks: FittedMark[]; hidden: string }): JSX.Element {
  const inner = Math.max(1, width - 2 * PAD);
  const x = (d: number): number => PAD + (d / DAY_END) * inner;
  const px = (v: number): number => Math.round(v) + 0.5; // traits nets de 1 px
  const labelStep = (inner / DAY_END) * 100 >= 40 ? 100 : 200;

  const ticks: JSX.Element[] = [];
  const labels: JSX.Element[] = [];
  for (let d = 0; d <= DAY_END; d += 50) {
    const major = d % 100 === 0;
    ticks.push(
      <line
        key={d}
        className={major ? 'tl__tick tl__tick--major' : 'tl__tick'}
        x1={px(x(d))} x2={px(x(d))} y1={Y.tickTop} y2={Y.tickTop + (major ? 4 : 2)}
      />,
    );
    if (d % labelStep === 0) {
      labels.push(
        <text key={d} className="tl__ticklabel" x={x(d)} y={Y.tickLabel} textAnchor="middle">
          {d === 0 ? 'J0' : d}
        </text>,
      );
    }
  }

  const x0 = x(0);
  const xToday = x(DAY_TODAY);
  const xEnd = x(DAY_END);
  const segs = splitAtToday(runs);
  const trackH = Y.trackBottom - Y.trackTop;
  const hide = hidden.split(',');
  // Libellé du filet, posé juste avant son premier segment (omis s'il n'y a pas la place).
  const ribbonStart = segs.length > 0 ? x(segs[0].from) : 0;
  const ribbonLabel = segs.length > 0 && ribbonStart - 6 - RIBBON_LABEL.length * MARK_CHAR >= PAD + 12;

  return (
    <svg className="tl__svg" width={width} height={H} viewBox={`0 0 ${width} ${H}`} aria-hidden="true">
      {/* Piste : projection (aplat sombre) puis jours mesurés (aplat clair) */}
      <rect className="tl__bar tl__bar--projected" x={x0} y={Y.trackTop} width={xEnd - x0} height={trackH} rx={trackH / 2} />
      <rect className="tl__bar tl__bar--measured" x={x0} y={Y.trackTop} width={xToday - x0} height={trackH} rx={trackH / 2} />

      {/* Filet d'alertes (pire niveau par tranche de 5 j) : trait plein = mesuré, tirets = projeté */}
      {ribbonLabel ? (
        <text className="tl__ribbon-label" x={ribbonStart - 6} y={Y.ribbon + 4} textAnchor="end">{RIBBON_LABEL}</text>
      ) : null}
      {segs.map((s) => (
        <line
          key={`${s.from}-${s.projected ? 'p' : 'm'}`}
          className="tl__ribbon"
          data-proj={s.projected}
          x1={x(s.from)} x2={Math.max(x(s.from) + 1, x(s.to))} y1={Y.ribbon} y2={Y.ribbon}
          strokeWidth={RIBBON_H}
          style={{ stroke: statusVar[s.color] }}
        >
          <title>{`Alertes J${Math.ceil(s.from)}–J${Math.floor(s.to)} : ${statusLabel[s.color]}${s.projected ? ' (projeté)' : ''}`}</title>
        </line>
      ))}

      {/* Graduations */}
      {ticks}
      {labels}

      {/* Jalons de mission */}
      {marks.map(({ lm, x: mx, text }) => (
        <g key={lm.key} className="tl__mark">
          {/* libellé masqué : le trait s'arrête sous l'étiquette du curseur */}
          <line x1={px(mx)} x2={px(mx)} y1={hide.includes(lm.key) ? Y.trackTop - 8 : Y.markTop} y2={Y.trackTop - 2} />
          {text && !hide.includes(lm.key) ? (
            <text x={lm.alignEnd ? mx - 5 : mx + 6} y={Y.markText} textAnchor={lm.alignEnd ? 'end' : 'start'}>{text}</text>
          ) : null}
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

/** Perte de densité de la hanche projetée à J860 (%) : même sortie du modèle osseux que la fiche de la hanche. */
function hipLossAtEnd(adherence: 0 | 1): number {
  return boneLossPct('hanche', DAY_END, adherence);
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

  const runs = useMemo(() => computeRuns(adherence), [adherence]);
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
      pos = Math.min(DAY_END, pos + (Math.min(1000, now - prev) / 1000) * speed);
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
      // Espace : lecture / pause (sauf si le focus est sur un bouton ou une plaque : Espace l'active)
      if (e.key === ' ' && !(e.target instanceof HTMLElement && e.target.closest('button, [role="button"], a'))) {
        e.preventDefault();
        s.setPlaying(!s.playing);
        return;
      }
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
  const dayText = fmtDay(day);
  const date = dayLabelDate(day);
  // Étiquette du curseur : le jour seul ; la date s'ajoute pendant le geste ou la lecture. Aujourd'hui, le
  // jalon « Aujourd'hui » et le bandeau suffisent : pas d'étiquette.
  const showReadout = dragging || playing || day !== DAY_TODAY;
  const showDate = dragging || playing;
  // Centrée sur le curseur, retenue aux bords de la piste (largeur estimée, majorée).
  const labelHalf = (dayText.length * DAY_CHAR + (showDate ? (date.length + 3) * DATE_CHAR : 0)) / 2;
  const labelX = Math.max(labelHalf + EDGE, Math.min(width - labelHalf - EDGE, headX));

  // Jalons : calculés ici pour masquer le libellé de ceux que l'étiquette du curseur recouvrirait.
  const marks = useMemo(() => fitLandmarks((d) => PAD + (d / DAY_END) * inner), [inner]);
  const hidden = !showReadout ? '' : marks.filter(({ lm, x: mx, text }) => {
    const w = text.length * MARK_CHAR;
    const from = lm.alignEnd ? mx - 5 - w : mx;
    const to = lm.alignEnd ? mx : mx + 6 + w;
    return text !== '' && from < labelX + labelHalf + EDGE && to > labelX - labelHalf - EDGE;
  }).map(({ lm }) => lm.key).join(',');

  const jump = (d: number): void => {
    if (playing) setPlaying(false);
    setDay(d);
  };

  return (
    <div className="tl" data-projected={projected} data-playing={playing} role="group" aria-label="Chronologie de la mission">
      {/* ── Lecture et accès directs ── */}
      <div className="tl__side tl__side--left">
        <div className="tl__row">
          <button
            type="button"
            className="sz-btn sz-btn--sm tl__play"
            aria-pressed={playing}
            aria-label={playing ? 'Pause' : 'Lecture'}
            title={playing ? 'Pause (Espace)' : `Lecture (Espace) : J0 à J${DAY_END} en ${PLAY_SECONDS} s`}
            onClick={() => setPlaying(!playing)}
          >
            <PlayGlyph playing={playing} />
          </button>
          <button type="button" className="sz-btn sz-btn--sm" aria-pressed={day === DAY_TODAY} onClick={() => jump(DAY_TODAY)} title="Dernier jour mesuré (T)">
            Aujourd'hui
          </button>
          <button type="button" className="sz-btn sz-btn--sm" aria-pressed={day === DAY_SOL0} onClick={() => jump(DAY_SOL0)} title={`Arrivée sur Mars, J${DAY_SOL0}`}>
            Sol 0
          </button>
          <button type="button" className="sz-btn sz-btn--sm" aria-pressed={day === DAY_END} onClick={() => jump(DAY_END)} title="Fin de mission (Fin)">
            J{DAY_END}
          </button>
          <span className="sz-detail"><ProvenanceBadge value="SIMULÉ" /></span>
        </div>
      </div>

      {/* ── Frise ── */}
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
        title="Glisser pour changer de jour. Flèches : ±1 jour · Maj+flèches : ±10 jours · Début, Fin · T : aujourd'hui · Espace : lecture"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        {width > 0 && (
          <>
            <Ruler width={width} runs={runs} marks={marks} hidden={hidden} />
            <div className="tl__cursor-knob" style={{ transform: `translate3d(${headX}px,0,0)` }} />
            {showReadout ? (
              <div className="tl__readout" style={{ transform: `translate3d(${labelX}px,0,0) translateX(-50%)` }}>
                <span className="tl__readout-day">{dayText}</span>
                {showDate ? <span className="tl__readout-date"> · {date}</span> : null}
              </div>
            ) : null}
          </>
        )}
      </div>

      {/* ── Scénario de projection ── */}
      <div className="tl__side tl__side--right">
        <div className="tl__row">
          <span className="sz-label" id="tl-projection-label">Projection</span>
          <div className="sz-seg" role="radiogroup" aria-labelledby="tl-projection-label">
            <button type="button" role="radio" aria-checked={adherence === 0} className="sz-seg__opt" onClick={() => setAdherence(0)}>
              Rythme actuel
            </button>
            <button type="button" role="radio" aria-checked={adherence === 1} className="sz-seg__opt" onClick={() => setAdherence(1)}>
              Avec le plan
            </button>
          </div>
          <PanelClose className="tl__close" />
        </div>
        <p
          className="tl__note tl__impact sz-detail"
          title={`Perte de densité de la hanche projetée à J${DAY_END} par le modèle osseux (hypothèse) : ${lossText(impact.rythme)} au rythme actuel, ${lossText(impact.plan)} avec le plan`}
        >
          <span className="tl__impact-label">Perte hanche estimée J{DAY_END}</span>
          <span className="tl__impact-val" data-on={adherence === 0}>rythme {lossText(impact.rythme)}</span>
          <span className="tl__impact-val" data-on={adherence === 1}>plan {lossText(impact.plan)}</span>
        </p>
      </div>
    </div>
  );
}

function lossText(v: number): string {
  return Number.isFinite(v) ? `${fmt(v, 1)} %` : '— %';
}
