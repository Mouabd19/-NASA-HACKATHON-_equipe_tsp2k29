// Menu « Affichage » + barre de l'écran épuré (Steve), branchés sur les panneaux de la page Corps (src/ui/prefs.ts).
// Le menu affiche ou masque chaque panneau ; « Tout masquer » donne l'écran épuré : la scène seule, avec le jour,
// le statut et le délai Terre dans la barre. Les préférences sont mémorisées par usePrefs.
import { useEffect, useRef, useState } from 'react';
import type { JSX } from 'react';
import type { Color } from '../../types';
import { lightTimeMin } from '../../content/horizons';
import { StatusChip, dayToDate, fmt } from '../../ui';
import { BODY_PANEL_LABEL, usePrefs } from '../../ui/prefs';
import type { BodyPanelId } from '../../ui/prefs';
import { scenarioBody, useBody } from './store';
import './Windows.css';

export const BODY_PANELS: BodyPanelId[] = ['header', 'blood', 'spo2', 'layers', 'alerts', 'timeline'];

// Le panneau spo2 s'intitule « Constantes ».
const PANEL_LABEL: Record<BodyPanelId, string> = { ...BODY_PANEL_LABEL, spo2: 'Vitals' };

const RANK: Record<Color, number> = { grey: 0, green: 1, amber: 2, red: 3 };

const closeAll = (): void => { const { closePanel } = usePrefs.getState(); BODY_PANELS.forEach(closePanel); };

const shortDate = (iso: string): string =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });

/** Écran épuré = tous les panneaux fermés. */
export function useCleanScreen(): boolean {
  const closed = usePrefs((s) => s.closed);
  return BODY_PANELS.every((id) => closed.includes(id));
}

/** En haut à droite de la scène : menu « Affichage » ; en écran épuré, jour + statut + délai Terre. */
export function ViewMenu(): JSX.Element {
  const [menu, setMenu] = useState(false);
  const root = useRef<HTMLDivElement | null>(null);
  const closed = usePrefs((s) => s.closed);
  const { openPanel, closePanel, openAll } = usePrefs.getState();
  const clean = useCleanScreen();
  const day = useBody((s) => s.day);
  const adherence = useBody((s) => s.adherence);
  const worst = scenarioBody(day, adherence).organs.reduce<Color>((w, o) => (RANK[o.status] > RANK[w] ? o.status : w), 'grey');
  const date = dayToDate(day);
  const anyOpen = BODY_PANELS.some((id) => !closed.includes(id));

  // Menu ouvert : Échap ou un clic à l'extérieur le referme (Échap ne touche plus aux panneaux).
  useEffect(() => {
    if (!menu) return;
    const onKey = (e: KeyboardEvent): void => { if (e.key === 'Escape') setMenu(false); };
    const onDown = (e: PointerEvent): void => {
      if (e.target instanceof Node && root.current?.contains(e.target)) return;
      setMenu(false);
    };
    window.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown, true);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown, true);
    };
  }, [menu]);

  return (
    <div className="bv" ref={root}>
      <div className="bv__row">
        {clean ? (
          <div className="bv__status" role="status">
            <span>Day {day} · {shortDate(date)}</span>
            <StatusChip color={worst} />
            <span>Earth delay {fmt(lightTimeMin(date), 1)} min</span>
          </div>
        ) : null}
        <button type="button" className="sz-btn sz-btn--sm" data-active={menu} onClick={() => setMenu(!menu)} aria-expanded={menu} aria-haspopup="true" aria-controls="bv-menu">
          Display
        </button>
      </div>
      {menu ? (
        <div className="bv__menu" id="bv-menu" role="group" aria-label="Visible panels">
          {BODY_PANELS.map((id) => {
            const open = !closed.includes(id);
            return (
              <button key={id} type="button" className="bv__item" role="checkbox" aria-checked={open} onClick={() => (open ? closePanel(id) : openPanel(id))}>
                <span className="bv__box" aria-hidden="true">
                  <svg viewBox="0 0 14 14"><path d="M3.5 7.2l2.4 2.4 4.6-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </span>
                {PANEL_LABEL[id]}
              </button>
            );
          })}
          <div className="bv__sep" role="separator" />
          {anyOpen
            ? <button type="button" className="sz-btn sz-btn--ghost sz-btn--sm bv__all" onClick={closeAll}>Hide all</button>
            : <button type="button" className="sz-btn sz-btn--ghost sz-btn--sm bv__all" onClick={openAll}>Show all</button>}
        </div>
      ) : null}
    </div>
  );
}
