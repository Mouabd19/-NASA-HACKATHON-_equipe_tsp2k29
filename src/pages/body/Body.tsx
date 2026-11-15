// Page « Corps » : bandeau de synthèse · [analyses + SpO₂] | corps 3D | [calques + alertes] · chronologie.
// La fenêtre organe est montée à la racine. Aucun composant ne dépend d'un autre : tout passe par le store useBody.
import { Component, useEffect, useRef } from 'react';
import type { ErrorInfo, JSX, ReactNode } from 'react';
import { ASTRONAUT, DAY_TODAY } from '../../mocks/mission';
import { lightTimeMin } from '../../content/horizons';
import { useNavigate } from 'react-router-dom';
import { BodyScene } from '../../three/BodyScene';
import { look } from '../../three/look';
import { PanelCloseContext, ProvenanceBadge, TagBadge, dayToDate, fmt, sentenceCase } from '../../ui';
import { usePrefs } from '../../ui/prefs';
import type { BodyPanelId } from '../../ui/prefs';
import { LAYER_META, LAYER_ORDER, scanState, scenarioBody, useBody } from './store';
import { useUrlState } from './urlState';
import { Header } from './panels/Header';
import { LayersPanel } from './panels/LayersPanel';
import { AlertsPanel } from './panels/AlertsPanel';
import { BloodPanel } from './panels/BloodPanel';
import { Spo2Widget } from './panels/Spo2Widget';
import { HoverCard } from './panels/HoverCard';
import { LeaderLines } from './panels/LeaderLines';
import { Timeline } from './panels/Timeline';
import { OrganWindow } from './panels/OrganWindow';
import './Body.css';
import { ViewMenu, useCleanScreen } from './Windows';

/** Si la 3D tombe (pas de WebGL, erreur de shader), la page reste utilisable : message sobre, pas d'écran blanc. */
class SceneBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
  state: { error: string | null } = { error: null };

  static getDerivedStateFromError(err: unknown): { error: string } {
    return { error: err instanceof Error ? err.message : String(err) };
  }

  componentDidCatch(err: unknown, info: ErrorInfo): void {
    console.warn('[SOL ZÉRO] 3D scene unavailable:', err, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.error === null) return this.props.children;
    return (
      <div className="body-noscene" role="status">
        <div className="body-noscene__box">
          <h2 className="sz-section-title">3D view unavailable</h2>
          <p className="body-noscene__text">Panels, alerts and the timeline remain accurate.</p>
          <p className="body-noscene__err sz-detail">{this.state.error.slice(0, 160)}</p>
          <button type="button" className="sz-btn" onClick={() => this.setState({ error: null })}>Retry</button>
        </div>
      </div>
    );
  }
}

/**
 * Légendes d'image aux coins de la scène, comme les incrustations d'un cliché (DICOM) : identification,
 * jour et date, calques affichés, nature de l'image et délai Terre. Discrètes, toujours là, jamais cliquables.
 */
/** « 2026-11-14 » → « 14 nov. 2026 » (même langue que l'en-tête de la page). */
const frDate = (iso: string): string =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });

function SceneCorners(): JSX.Element {
  const day = useBody((s) => s.day);
  const layers = useBody((s) => s.layers);
  const date = dayToDate(day);
  const shown = LAYER_ORDER.filter((l) => layers[l]).map((l) => LAYER_META[l].label.toLowerCase());
  // Une seule ligne, quelle que soit la largeur : elle ne doit jamais passer sur les pieds du modèle.
  // La liste des calques et la nature de l'image sont dans l'infobulle ; la nature de l'image aussi en mode Détails.
  const count = shown.length === 0 ? 'no layers' : `${shown.length} layer${shown.length > 1 ? 's' : ''}`;
  const tip = `Z-Anatomy anatomical atlas, not an image of the patient. Layers shown: ${shown.join(', ') || 'none'}.`;
  return (
    <>
      <div className="body-corner body-corner--bl sz-mono">
        <span className="body-corner__atlas" title={tip}>Atlas Z-Anatomy · {count}</span>
        <span className="sz-detail">Not an image of the patient</span>
      </div>
      <div className="body-corner body-corner--br sz-mono" aria-hidden="true">
        <span>Earth delay {fmt(lightTimeMin(date), 1)} min</span>
      </div>
    </>
  );
}

/** Informations posées sur la scène : identification, mention « Projection » (toujours visible), provenance (Détails). */
/** Libellé « Scan 042 % » qui suit l'ouverture du caisson pendant le balayage (position par ref : aucun état React à 60 Hz). */
function ScanLabel(): JSX.Element {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    let raf = 0;
    let shown: boolean | null = null;   // null : la première image synchronise toujours l'état
    const frame = (): void => {
      raf = requestAnimationFrame(frame);
      const el = ref.current;
      if (!el) return;
      const on = scanState.t >= 0;
      if (on) {
        el.textContent = `Scan ${String(Math.round(scanState.t * 100)).padStart(3, '0')}%`;
        el.style.transform = `translate(${Math.round(scanState.x + 10)}px, ${Math.round(scanState.y - 6)}px)`;
      }
      if (on !== shown) {
        shown = on;
        el.style.opacity = on ? '1' : '0';
        // pendant le balayage, les étiquettes d'organes attendent que le corps soit sorti du caisson
        const scene = el.closest<HTMLElement>('.body-scene');
        if (scene) scene.dataset.scanning = String(on);
      }
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);
  return <span ref={ref} className="body-scanlabel" style={{ opacity: 0 }} aria-hidden="true" />;
}

function SceneChrome(): JSX.Element {
  const day = useBody((s) => s.day);
  const adherence = useBody((s) => s.adherence);
  const bones = useBody((s) => s.layers.squelette);
  const exposition = useBody((s) => s.layers.exposition);
  const projected = day > DAY_TODAY;
  const dose = exposition ? scenarioBody(day, adherence).organs.find((o) => o.id === 'dose') : undefined;
  const doseDay = dose?.metrics.find((m) => m.key === 'dose_jour');
  const doseCum = dose?.metrics.find((m) => m.key === 'dose_cumulee');
  const steps = Array.from({ length: look.heat.levels }, (_, i) => i);
  return (
    <div className="body-chrome" data-projected={projected}>
      <div className="body-id sz-mono">
        {/* le nom est déjà dans la barre haute ; il ne revient ici que sur téléphone, où la barre le masque */}
        <span className="body-id__name">Cmdr {sentenceCase(ASTRONAUT.name)}</span>
        <span title="Three-digit mission day, like an imaging overlay">{fmtDayLong(day)} · {frDate(dayToDate(day))}</span>
      </div>
      {projected && (
        <div className="body-ribbon" role="status" title="Future day: body projected by the model, not a measurement">
          <span className="body-ribbon__text">Projection</span>
          <span className="body-ribbon__sub">
            {adherence === 1 ? 'With the plan' : 'Current pace'}
          </span>
        </div>
      )}

      <dl className="body-tag sz-detail">
        <div className="body-tag__row">
          <dt>{projected ? 'Projected body' : "Today's scan"}</dt>
          <dd>
            {projected ? 'Bone, muscle, VO₂ models' : 'Ultrasound, 0.1 g centrifuge'} <TagBadge tag="H" />
          </dd>
          <ProvenanceBadge value={projected ? 'H' : 'SIMULÉ'} />
        </div>
        {/* Aucune métrique osseuse n'est attribuée au scanner : dit dans le cadre même de la scène. */}
        {bones ? (
          <div className="body-tag__row">
            <dt>Bone</dt>
            <dd>Model estimate, not measured by the scanner <TagBadge tag="H" /></dd>
          </div>
        ) : null}
        {exposition ? (
          <div className="body-tag__row">
            <dt>Radiation</dt>
            <dd>
              <span className="body-heat" aria-hidden="true">
                {steps.map((i) => <i key={i} style={{ opacity: 0.1 + (0.9 * i) / Math.max(1, steps.length - 1) }} />)}
              </span>
              Low to high, illustrative map <TagBadge tag="H" />
            </dd>
          </div>
        ) : null}
        {exposition && doseDay && doseCum ? (
          <div className="body-tag__row">
            <dt>Today's dose</dt>
            <dd>
              <span className="body-tag__num">{fmt(doseDay.value, 2)}</span> <span className="sz-unit">mSv/d</span>
              {' · '}expected {fmt(doseDay.ref?.high ?? NaN, 2)} <TagBadge tag="Publié" />
            </dd>
          </div>
        ) : null}
        {exposition && doseDay && doseCum ? (
          <div className="body-tag__row">
            <dt>Cumulative dose</dt>
            <dd>
              <span className="body-tag__num">{fmt(doseCum.value, 0)}</span> <span className="sz-unit">mSv</span>{' '}
              <TagBadge tag={doseCum.tag} />
            </dd>
          </div>
        ) : null}
      </dl>
    </div>
  );
}

/** « J094 » : numéro de jour sur trois chiffres, comme un numéro de série d'examen. */
const fmtDayLong = (day: number): string => `D${String(day).padStart(3, '0')}`;

/** Fournit le bouton × aux panneaux d'un emplacement. */
function Closable({ id, children }: { id: BodyPanelId; children: ReactNode }): JSX.Element | null {
  const closed = usePrefs((s) => s.closed.includes(id));
  const closePanel = usePrefs((s) => s.closePanel);
  if (closed) return null;
  return <PanelCloseContext.Provider value={() => closePanel(id)}>{children}</PanelCloseContext.Provider>;
}

/** (Steve) Double-clic sur le cerveau → page Santé mentale (prototype §11) au lieu de la fenêtre organe. */
function useBrainToMental(): void {
  const navigate = useNavigate();
  const organWindow = useBody((s) => s.organWindow);
  useEffect(() => {
    if (organWindow !== 'cerveau') return;
    useBody.getState().openOrganWindow(null);
    navigate('/mental');
  }, [organWindow, navigate]);
}

export function Body(): JSX.Element {
  useUrlState();
  useBrainToMental();
  // En quittant la page, la lecture de la timeline s'arrête (sinon le jour avance hors écran).
  useEffect(() => () => useBody.getState().setPlaying(false), []);
  const closed = usePrefs((s) => s.closed);
  const isOpen = (id: BodyPanelId): boolean => !closed.includes(id);
  const left = isOpen('blood') || isOpen('spo2');
  const right = isOpen('layers') || isOpen('alerts');
  const clean = useCleanScreen();
  return (
    <div className={`body-page${clean ? ' body-page--clean' : ''}`} data-left={left} data-right={right} data-top={isOpen('header')} data-bottom={isOpen('timeline')}>
      {isOpen('header') ? <div className="body-top"><Closable id="header"><Header /></Closable></div> : null}

      {left ? (
        <aside className="body-col body-col--left" aria-label="Labs and vitals">
          {isOpen('blood') ? <div className="body-slot body-slot--grow"><Closable id="blood"><BloodPanel /></Closable></div> : null}
          {isOpen('spo2') ? <div className="body-slot"><Closable id="spo2"><Spo2Widget /></Closable></div> : null}
        </aside>
      ) : null}

      <section
        className="body-scene"
        aria-label="3D body"
        aria-description="Drag: rotate. Scroll wheel: zoom. Click: pin an organ. Double-click: open its window. Space: play. Left and right arrows: change day."
      >
        <SceneBoundary><BodyScene /></SceneBoundary>
        <LeaderLines />
        <SceneChrome />
        <ScanLabel />
        <SceneCorners />
        <HoverCard />
        <ViewMenu />
      </section>

      {right ? (
        <aside className="body-col body-col--right" aria-label="Layers and alerts">
          {isOpen('layers') ? <div className="body-slot body-slot--layers"><Closable id="layers"><LayersPanel /></Closable></div> : null}
          {isOpen('alerts') ? <div className="body-slot body-slot--grow"><Closable id="alerts"><AlertsPanel /></Closable></div> : null}
        </aside>
      ) : null}

      {isOpen('timeline') ? <div className="body-bottom"><Closable id="timeline"><Timeline /></Closable></div> : null}

      <OrganWindow />
    </div>
  );
}
