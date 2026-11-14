// Page 1 — BODY (ROADMAP §1) : composition « Cyberware ».
// En-tête · [sang + SpO₂] | corps 3D | [calques + alertes] · timeline. La fenêtre organe est
// montée à la racine. Aucun composant ne dépend d'un autre : tout passe par le store useBody.
import { Component, useEffect } from 'react';
import type { ErrorInfo, JSX, ReactNode } from 'react';
import { DAY_TODAY } from '../../mocks/mission';
import { BodyScene } from '../../three/BodyScene';
import { Label, ProvenanceBadge, TagBadge, fmtDay } from '../../ui';
import { useBody } from './store';
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

/** Habillage du cadre de la scène : équerres, étiquettes de provenance, ruban de projection, aide. */
function SceneChrome(): JSX.Element {
  const day = useBody((s) => s.day);
  const adherence = useBody((s) => s.adherence);
  const projected = day > DAY_TODAY;
  return (
    <div className="body-chrome" data-projected={projected}>
      <span className="body-corner body-corner--tl" />
      <span className="body-corner body-corner--tr" />
      <span className="body-corner body-corner--bl" />
      <span className="body-corner body-corner--br" />

      <div className="body-tag">
        <div className="body-tag__row">
          <Label>{projected ? 'CORPS PROJETÉ' : 'SCAN DU JOUR'}</Label>
          <Label dim>{fmtDay(day)}</Label>
          <ProvenanceBadge value={projected ? 'H' : 'SIMULÉ'} />
        </div>
        <div className="body-tag__row">
          <Label dim>{projected ? 'MODÈLES OS / MUSCLE / VO₂' : 'ÉCHO / CENTRIFUGEUSE 0,1 g'}</Label>
          <TagBadge tag="H" />
        </div>
      </div>

      {projected && (
        <div className="body-ribbon" role="status">
          <span className="body-ribbon__text">PROJECTION — CORPS FANTÔME — MODÈLE [H]</span>
          <span className="body-ribbon__sub">
            {fmtDay(day)} · {adherence === 1 ? 'AVEC LE PLAN' : 'AU RYTHME ACTUEL'} · NON MESURÉ
          </span>
        </div>
      )}

      <div className="body-help">
        <Label dim>GLISSER : ORBITE · MOLETTE : ZOOM · CLIC : ÉPINGLER · DOUBLE-CLIC : FENÊTRE ORGANE</Label>
      </div>
      <div className="body-credit">
        <Label dim>MODÈLE DE SECOURS PROCÉDURAL — Z-ANATOMY CC BY-SA 4.0 À VENIR</Label>
      </div>
    </div>
  );
}

export function Body(): JSX.Element {
  useUrlState();
  // En quittant la page, la lecture de la timeline s'arrête (sinon le jour avance hors écran).
  useEffect(() => () => useBody.getState().setPlaying(false), []);
  return (
    <div className="body-page">
      <div className="body-top"><Header /></div>

      <aside className="body-col body-col--left" aria-label="Analyses et montre">
        <div className="body-slot body-slot--grow"><BloodPanel /></div>
        <div className="body-slot"><Spo2Widget /></div>
      </aside>

      <section className="body-scene" aria-label="Corps 3D">
        <SceneBoundary><BodyScene /></SceneBoundary>
        <LeaderLines />
        <SceneChrome />
        <HoverCard />
      </section>

      <aside className="body-col body-col--right" aria-label="Calques et alertes">
        <div className="body-slot body-slot--layers"><LayersPanel /></div>
        <div className="body-slot body-slot--grow"><AlertsPanel /></div>
      </aside>

      <div className="body-bottom"><Timeline /></div>

      <OrganWindow />
    </div>
  );
}
