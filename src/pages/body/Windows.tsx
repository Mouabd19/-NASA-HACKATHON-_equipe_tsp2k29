// Menu AFFICHAGE + statut minimal (Steve), branchés sur les panneaux de la page Body (Walid, src/ui/prefs.ts).
// Le menu ouvre / ferme chaque panneau ; « Tout fermer » (ou Échap) donne l'écran épuré : le corps scanné et ses ⚠,
// avec le jour, le statut et le délai radio dans la barre. Les préférences restent celles de Walid (mémorisées).
import { useEffect, useState } from 'react';
import type { JSX } from 'react';
import type { Color } from '../../types';
import { DAY_TODAY } from '../../mocks/mission';
import { lightTimeMin } from '../../content/horizons';
import { dayToDate, fmt } from '../../ui';
import { BODY_PANEL_LABEL, usePrefs } from '../../ui/prefs';
import type { BodyPanelId } from '../../ui/prefs';
import { scenarioBody, useBody } from './store';
import './Windows.css';

export const BODY_PANELS: BodyPanelId[] = ['header', 'blood', 'spo2', 'layers', 'alerts', 'timeline'];

const RANK: Record<Color, number> = { grey: 0, green: 1, amber: 2, red: 3 };
const STATUS_VAR: Record<Color, string> = { grey: 'var(--sz-unknown)', green: 'var(--sz-ok)', amber: 'var(--sz-amber)', red: 'var(--sz-red)' };
const STATUS_TEXT: Record<Color, string> = { grey: 'Données insuffisantes', green: 'Nominal', amber: 'À surveiller', red: 'Alerte' };

const closeAll = (): void => { const { closePanel } = usePrefs.getState(); BODY_PANELS.forEach(closePanel); };

/** Écran épuré = tous les panneaux fermés. */
export function useCleanScreen(): boolean {
  const closed = usePrefs((s) => s.closed);
  return BODY_PANELS.every((id) => closed.includes(id));
}

/** Barre en haut à droite de la scène : menu AFFICHAGE ; en écran épuré, jour + statut + délai radio. */
export function ViewMenu(): JSX.Element {
  const [menu, setMenu] = useState(false);
  const closed = usePrefs((s) => s.closed);
  const { openPanel, closePanel, openAll } = usePrefs.getState();
  const clean = useCleanScreen();
  const day = useBody((s) => s.day);
  const adherence = useBody((s) => s.adherence);
  const worst = scenarioBody(day, adherence).organs.reduce<Color>((w, o) => (RANK[o.status] > RANK[w] ? o.status : w), 'green');
  const date = dayToDate(day);
  const anyOpen = closed.length < BODY_PANELS.length;

  // Échap : écran épuré (sauf si la fenêtre organe est ouverte : elle gère sa propre touche Échap)
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key !== 'Escape' || useBody.getState().organWindow) return;
      closeAll();
      setMenu(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="bv">
      <div className="bv__row">
        {clean ? (
          <>
            <span className="bv__day">J{day}</span>
            <span className="bv__meta">{day === DAY_TODAY ? "Aujourd'hui" : day > DAY_TODAY ? 'Projection' : 'Mesuré'} · {date}</span>
            <span className="bv__status" style={{ ['--c' as string]: STATUS_VAR[worst] }}><i />{STATUS_TEXT[worst]}</span>
            <span className="bv__meta">Délai radio {fmt(lightTimeMin(date), 1)} min</span>
          </>
        ) : null}
        <button type="button" className="bv__btn" data-active={menu} onClick={() => setMenu(!menu)} aria-expanded={menu}>
          <span className="bv__burger" aria-hidden="true"><i /><i /><i /></span>
          Affichage
        </button>
      </div>
      {menu ? (
        <nav className="bv__menu" aria-label="Panneaux">
          {BODY_PANELS.map((id) => {
            const open = !closed.includes(id);
            return (
              <button key={id} type="button" className="bv__item" data-open={open} onClick={() => (open ? closePanel(id) : openPanel(id))}>
                <i />{BODY_PANEL_LABEL[id]}
              </button>
            );
          })}
          {anyOpen
            ? <button type="button" className="bv__item bv__item--ghost" onClick={() => { closeAll(); setMenu(false); }}>Écran épuré · Échap</button>
            : <button type="button" className="bv__item bv__item--ghost" onClick={openAll}>Tout afficher</button>}
        </nav>
      ) : null}
    </div>
  );
}
