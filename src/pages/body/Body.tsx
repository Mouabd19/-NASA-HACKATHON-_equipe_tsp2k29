// Page 1 — BODY (ROADMAP §1) : composition « Cyberware ».
// En-tête · [sang + SpO₂] | corps 3D | [calques + alertes] · timeline. La fenêtre organe est
// montée à la racine. Aucun composant ne dépend d'un autre : tout passe par le store useBody.
import { Component, useEffect, useRef } from 'react';
import type { ErrorInfo, JSX, ReactNode } from 'react';
import { DAY_TODAY } from '../../mocks/mission';
import { useNavigate } from 'react-router-dom';
import { BodyScene } from '../../three/BodyScene';
import { look } from '../../three/look';
import { Label, PanelCloseContext, ProvenanceBadge, TagBadge, fmt, fmtDay } from '../../ui';
import { usePrefs } from '../../ui/prefs';
import type { BodyPanelId } from '../../ui/prefs';
import { scanState, scenarioBody, useBody } from './store';
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
import { anatomySource } from '../../three/anatomy';
import { ViewMenu, useCleanScreen } from './Windows';

/** Si la 3D tombe (pas de WebGL, erreur de shader), la page reste utilisable : panneau gris, pas d'écran blanc. */
class SceneBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
  state: { error: string | null } = { error: null };

  static getDerivedStateFromError(err: unknown): { error: string } {
    return { error: err instanceof Error ? err.message : String(err) };
  }

  componentDidCatch(err: unknown, info: ErrorInfo): void {
    console.warn('[SOL ZÉRO] scène 3D indisponible :', err, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.error === null) return this.props.children;
    return (
      <div className="body-noscene" role="status">
        <div className="body-noscene__box">
          <Label>3D INDISPONIBLE</Label>
          <p className="body-noscene__text">
            Le rendu WebGL n'a pas pu démarrer. Les panneaux, les alertes et la timeline restent exacts.
          </p>
          <Label dim className="body-noscene__err">{this.state.error.slice(0, 160)}</Label>
          <button type="button" className="sz-btn" onClick={() => this.setState({ error: null })}>RÉESSAYER</button>
        </div>
      </div>
    );
  }
}

/** Libellé « SCAN 042 % » qui suit l'anneau pendant le balayage (position par ref : aucun état React à 60 Hz). */
function ScanLabel(): JSX.Element {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    let raf = 0;
    let shown = false;
    const frame = (): void => {
      raf = requestAnimationFrame(frame);
      const el = ref.current;
      if (!el) return;
      const on = scanState.t >= 0;
      if (on) {
        el.textContent = `SCAN ${String(Math.round(scanState.t * 100)).padStart(3, '0')} %`;
        el.style.transform = `translate(${Math.round(scanState.x + 10)}px, ${Math.round(scanState.y - 6)}px)`;
      }
      if (on !== shown) { shown = on; el.style.opacity = on ? '1' : '0'; }
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);
  return <span ref={ref} className="body-scanlabel sz-label" style={{ opacity: 0 }} aria-hidden="true" />;
}

/** Habillage du cadre de la scène : équerres, étiquettes de provenance, ruban de projection, aide. */
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
      <div className="body-tag sz-detail">
        <div className="body-tag__row">
          <Label>{projected ? 'CORPS PROJETÉ' : 'SCAN DU JOUR'}</Label>
          <Label dim>{fmtDay(day)}</Label>
          <ProvenanceBadge value={projected ? 'H' : 'SIMULÉ'} />
        </div>
        <div className="body-tag__row">
          <Label dim>{projected ? 'MODÈLES OS / MUSCLE / VO₂' : 'ÉCHO / CENTRIFUGEUSE 0,1 g'}</Label>
          <TagBadge tag="H" />
        </div>
        {/* ROADMAP §1 : aucune métrique osseuse n'est attribuée au scanner — dit dans le cadre même de la scène */}
        {bones ? (
          <div className="body-tag__row body-tag__row--note">
            <Label>OS : ESTIMÉ PAR MODÈLE</Label>
            <TagBadge tag="H" />
            <Label dim>— PAS PAR LE SCANNER</Label>
          </div>
        ) : null}
        {exposition ? (
          <div className="body-tag__row body-tag__row--note">
            <Label>EXPOSITION</Label>
            <span className="body-heat" aria-hidden="true">
              {steps.map((i) => <i key={i} style={{ opacity: 0.1 + (0.9 * i) / Math.max(1, steps.length - 1) }} />)}
            </span>
            <Label dim>− → + · CARTE ILLUSTRATIVE</Label>
            <TagBadge tag="H" />
          </div>
        ) : null}
        {exposition && doseDay && doseCum ? (
          <div className="body-tag__row body-tag__row--note">
            <Label dim>DOSE DU JOUR</Label>
            <Label>{fmt(doseDay.value, 2)} <span className="body-unit">mSv/j</span></Label>
            <Label dim>PRÉVU {fmt(doseDay.ref?.high ?? NaN, 2)}</Label>
            <TagBadge tag="Publié" />
          </div>
        ) : null}
        {exposition && doseDay && doseCum ? (
          <div className="body-tag__row body-tag__row--note">
            <Label dim>DOSE CUMULÉE</Label>
            <Label>{fmt(doseCum.value, 0)} <span className="body-unit">mSv</span></Label>
            <TagBadge tag={doseCum.tag} />
          </div>
        ) : null}
      </div>

      {projected && (
        <div className="body-ribbon" role="status">
          <span className="body-ribbon__text">Projection · non mesuré</span>
          <span className="body-ribbon__sub">
            {fmtDay(day)} · {adherence === 1 ? 'avec le plan' : 'au rythme actuel'}<span className="sz-detail"> · corps fantôme · modèle [H]</span>
          </span>
        </div>
      )}

      <ScanLabel />
      <div className="body-help sz-detail" title="Glisser : orbite · Molette : zoom · Clic : épingler · Double-clic : fenêtre organe · Espace : lecture · ← → : jour">
        <Label dim>GLISSER : ORBITE · MOLETTE : ZOOM · CLIC : ÉPINGLER · 2× CLIC : FENÊTRE · ESPACE : LECTURE</Label>
      </div>
      {anatomySource() === 'z-anatomy' ? (
        <div className="body-credit sz-detail" title="Z-Anatomy — CC BY-SA 4.0 · BodyParts3D — CC BY-SA 2.1 JP · rein et oreille interne CC BY-NC · usage hackathon non commercial (public/models/CREDITS.md)">
          <Label dim>MODÈLES Z-ANATOMY — CC BY-SA 4.0</Label>
        </div>
      ) : (
        <div className="body-credit sz-detail" title="Corps de secours procédural de l'équipe (stylisé, pas un atlas). Les modèles Z-Anatomy (CC BY-SA 4.0) le remplaceront.">
          <Label dim>CORPS PROCÉDURAL DE SECOURS</Label>
        </div>
      )}
    </div>
  );
}

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
    <div className={`body-page${clean ? ' body-page--clean' : ''}`} data-left={left} data-right={right}>
      {isOpen('header') ? <div className="body-top"><Closable id="header"><Header /></Closable></div> : null}

      {left ? (
        <aside className="body-col body-col--left" aria-label="Analyses et montre">
          {isOpen('blood') ? <div className="body-slot body-slot--grow"><Closable id="blood"><BloodPanel /></Closable></div> : null}
          {isOpen('spo2') ? <div className="body-slot"><Closable id="spo2"><Spo2Widget /></Closable></div> : null}
        </aside>
      ) : null}

      <section className="body-scene" aria-label="Corps 3D">
        <SceneBoundary><BodyScene /></SceneBoundary>
        <LeaderLines />
        <SceneChrome />
        <HoverCard />
        <ViewMenu />
      </section>

      {right ? (
        <aside className="body-col body-col--right" aria-label="Calques et alertes">
          {isOpen('layers') ? <div className="body-slot body-slot--layers"><Closable id="layers"><LayersPanel /></Closable></div> : null}
          {isOpen('alerts') ? <div className="body-slot body-slot--grow"><Closable id="alerts"><AlertsPanel /></Closable></div> : null}
        </aside>
      ) : null}

      {isOpen('timeline') ? <div className="body-bottom"><Closable id="timeline"><Timeline /></Closable></div> : null}

      <OrganWindow />
    </div>
  );
}
