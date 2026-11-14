// Fenêtres flottantes + menu AFFICHAGE + statut minimal (Steve). Style : sobre, aéré, fermable comme une app de bureau.
import { useEffect, useRef } from 'react';
import type { JSX, PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import type { Color } from '../../types';
import { DAY_TODAY } from '../../mocks/mission';
import { lightTimeMin } from '../../content/horizons';
import { dayToDate, fmt } from '../../ui';
import { scenarioBody, useBody } from './store';
import { WINDOWS, useWindows } from './windows';
import type { WinId } from './windows';
import './Windows.css';

const RANK: Record<Color, number> = { grey: 0, green: 1, amber: 2, red: 3 };
const STATUS_VAR: Record<Color, string> = { grey: 'var(--sz-unknown)', green: 'var(--sz-ok)', amber: 'var(--sz-amber)', red: 'var(--sz-red)' };
const STATUS_TEXT: Record<Color, string> = { grey: 'Données insuffisantes', green: 'Nominal', amber: 'À surveiller', red: 'Alerte' };

/** Une fenêtre : barre de titre (glisser pour déplacer), bouton ✕. Le contenu reste monté quand elle est fermée
 *  (raccourcis clavier et état des panneaux conservés), il est seulement masqué. */
export function FloatingWindow({ id, title, className, children }: { id: WinId; title: string; className: string; children: ReactNode }): JSX.Element {
  const open = useWindows((s) => s.open[id]);
  const [dx, dy] = useWindows((s) => s.offset[id]);
  const z = useWindows((s) => s.order.indexOf(id));
  const { close, focus, move } = useWindows.getState();
  const drag = useRef<{ x: number; y: number } | null>(null);

  const onDown = (e: ReactPointerEvent<HTMLDivElement>): void => {
    if ((e.target as HTMLElement).closest('button')) return;
    drag.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
    focus(id);
  };
  const onMove = (e: ReactPointerEvent<HTMLDivElement>): void => {
    if (!drag.current) return;
    move(id, e.clientX - drag.current.x, e.clientY - drag.current.y);
    drag.current = { x: e.clientX, y: e.clientY };
  };
  const onUp = (): void => { drag.current = null; };

  return (
    <div
      className={`bw ${className}`}
      data-open={open}
      style={{ transform: `translate(${dx}px, ${dy}px)`, zIndex: 20 + z }}
      onPointerDown={() => focus(id)}
      role="dialog"
      aria-label={title}
      aria-hidden={!open}
    >
      <div className="bw__bar" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp}>
        <span className="bw__title">{title}</span>
        <button type="button" className="bw__close" onClick={() => close(id)} aria-label={`Fermer ${title}`}>✕</button>
      </div>
      <div className="bw__content">{children}</div>
    </div>
  );
}

/** Barre minimale en haut à gauche de la scène : menu AFFICHAGE + jour + statut + délai radio. */
export function ViewMenu(): JSX.Element {
  const menu = useWindows((s) => s.menu);
  const open = useWindows((s) => s.open);
  const { toggle, setMenu, closeAll } = useWindows.getState();
  const day = useBody((s) => s.day);
  const adherence = useBody((s) => s.adherence);
  const organs = scenarioBody(day, adherence).organs;
  const worst = organs.reduce<Color>((w, o) => (RANK[o.status] > RANK[w] ? o.status : w), 'green');
  const date = dayToDate(day);
  const delay = lightTimeMin(date);
  const anyOpen = Object.values(open).some(Boolean);

  // Échap : ferme toutes les fenêtres (sauf si la fenêtre organe est ouverte : elle gère sa propre touche Échap)
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key !== 'Escape' || useBody.getState().organWindow) return;
      useWindows.getState().closeAll();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="bv">
      <div className="bv__row">
        <button type="button" className="bv__btn" data-active={menu} onClick={() => setMenu(!menu)} aria-expanded={menu}>
          <span className="bv__burger" aria-hidden="true"><i /><i /><i /></span>
          Affichage
        </button>
        <span className="bv__day">J{day}</span>
        <span className="bv__meta">{day === DAY_TODAY ? "Aujourd'hui" : day > DAY_TODAY ? 'Projection' : 'Mesuré'} · {date}</span>
        <span className="bv__status" style={{ ['--c' as string]: STATUS_VAR[worst] }}>
          <i />{STATUS_TEXT[worst]}
        </span>
        <span className="bv__meta">Délai radio {fmt(delay, 1)} min</span>
      </div>
      {menu ? (
        <nav className="bv__menu" aria-label="Fenêtres">
          {WINDOWS.map((w) => (
            <button key={w.id} type="button" className="bv__item" data-open={open[w.id]} onClick={() => toggle(w.id)}>
              <i />{w.label}
            </button>
          ))}
          {anyOpen ? <button type="button" className="bv__item bv__item--ghost" onClick={closeAll}>Tout fermer · Échap</button> : null}
        </nav>
      ) : null}
    </div>
  );
}
