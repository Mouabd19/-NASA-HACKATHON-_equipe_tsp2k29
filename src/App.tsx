// Coquille de l'application : barre haute de 36 px + page routée qui remplit le reste.
// Les styles (.sz-shell, .sz-topbar, .sz-nav, .sz-main) sont dans src/ui/global.css.
import { useEffect, useState } from 'react';
import type { JSX } from 'react';
import { BrowserRouter, Navigate, NavLink, Route, Routes } from 'react-router-dom';
import { ASTRONAUT, DAY_TODAY } from './mocks/mission';
import { Body } from './pages/body/Body';
import { Mental } from './pages/mental/Mental';
import { ReasoningPage } from './pages/reasoning/Reasoning';
import { WarRoom } from './pages/warroom/WarRoom';
import { TagBadge, dayToDate, fmtDay } from './ui';
import { syncDetailsAttr, usePrefs } from './ui/prefs';

// da_dragon : navigation dans une colonne latérale de bureau (façon macOS), icônes au trait.
const ICON: Record<string, JSX.Element> = {
  body: (
    <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="4.6" r="2.3" /><path d="M5 8.6c2.3.7 4.6 1 7 1s4.7-.3 7-1M12 9.6v5.2M12 14.8l-3 6.4M12 14.8l3 6.4" /></svg>
  ),
  warroom: (
    <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="3.5" width="14" height="17.5" rx="3" /><path d="M9 3.5h6v2.4H9zM8.6 11l1.6 1.6 2.8-3M8.6 16.4l1.6 1.6 2.8-3M14.6 11.3h1.8M14.6 16.7h1.8" /></svg>
  ),
  mental: (
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.5 21v-3.2h2.6a1.9 1.9 0 0 0 1.9-1.9v-2.6l1.8-.6-1.8-3.6C18 5.6 15.3 3 11.6 3 7.6 3 4.6 6 4.6 9.9c0 2.3 1 4.1 2.6 5.3V21" /><path d="M9.6 9.2c.4-1.2 1.4-1.9 2.6-1.9 1.5 0 2.6 1.1 2.6 2.5 0 1.2-.8 1.8-1.8 2.2" /></svg>
  ),
};
const TABS = [
  { to: '/body', label: 'Corps', icon: 'body' },
  { to: '/warroom', label: 'War Room', icon: 'warroom' },
  { to: '/mental', label: 'Mental', icon: 'mental' },
] as const;

/** Format des horloges de bord de l'ISS : jour de l'année / heure GMT (ex. 318/22:47:05). */
function utcClock(d: Date): string {
  const doy = Math.floor((Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - Date.UTC(d.getUTCFullYear(), 0, 0)) / 86400000);
  return `${String(doy).padStart(3, '0')}/${d.toISOString().slice(11, 19)}`;
}

/** Horloge UTC, recalée sur le début de chaque seconde. */
function Clock(): JSX.Element {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const tick = (): void => {
      const d = new Date();
      setNow(d);
      timer = setTimeout(tick, 1000 - d.getMilliseconds() + 5);
    };
    tick();
    return () => clearTimeout(timer);
  }, []);
  return (
    <time className="sz-topbar__clock" dateTime={now.toISOString()}>
      <span className="sz-dim">GMT</span> {utcClock(now)}
    </time>
  );
}

function TopBar(): JSX.Element {
  return (
    <header className="sz-topbar">
      <div className="sz-topbar__left">
        <span className="sz-wordmark">
          <svg className="sz-wordmark__glyph" viewBox="0 0 12 12" aria-hidden="true">
            <rect x="0.5" y="0.5" width="11" height="11" fill="none" stroke="currentColor" />
            <line x1="2" y1="10" x2="10" y2="2" stroke="currentColor" />
          </svg>
          SOL ZÉRO
          <span className="dr-wordmark__sub">Santé équipage</span>
        </span>
        <span className="sz-topbar__rule sz-topbar__opt sz-detail" />
        <span className="sz-dim sz-topbar__opt sz-detail">Mission {ASTRONAUT.id}</span>
      </div>


      <div className="sz-topbar__right">
        <span className="sz-detail sz-topbar__opt"><Clock /></span>
        <span className="sz-topbar__rule sz-detail sz-topbar__opt" />
        <span className="sz-topbar__day" title={`Jour de mission — ${dayToDate(DAY_TODAY)}`}>{fmtDay(DAY_TODAY)}</span>
        <span className="sz-dim sz-topbar__opt sz-detail">{dayToDate(DAY_TODAY)}</span>
        <span className="sz-topbar__rule sz-topbar__opt" />
        <span className="sz-topbar__opt">
          <span className="sz-dim sz-detail">{ASTRONAUT.role}</span> {ASTRONAUT.name}
        </span>
        <span className="sz-topbar__opt"><TagBadge tag="Persona" /></span>
        {/* rappel d'honnêteté unique quand les étiquettes par chiffre sont masquées */}
        <span
          className="sz-topbar__sim sz-essential-only"
          title="Données simulées (persona fictive) — activez « Détails » pour voir la provenance de chaque chiffre"
        >
          Données simulées
        </span>
        <DetailsToggle />
      </div>
    </header>
  );
}

/** Colonne latérale (façon macOS) : mêmes pages, mêmes liens. */
function SideNav(): JSX.Element {
  return (
    <nav className="dr-side" aria-label="Pages">
      {TABS.map((t) => (
        <NavLink key={t.to} to={t.to} className="dr-side__item">
          <span className="dr-side__icon">{ICON[t.icon]}</span>
          <span className="dr-side__label">{t.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

/** Bouton « Détails » : affiche ou masque les étiquettes de provenance et les textes secondaires. */
function DetailsToggle(): JSX.Element {
  const details = usePrefs((s) => s.details);
  const setDetails = usePrefs((s) => s.setDetails);
  return (
    <button
      type="button"
      className="sz-btn sz-topbar__details"
      aria-pressed={details}
      onClick={() => setDetails(!details)}
      title="Afficher les sources, la provenance de chaque chiffre et les textes d'aide (D)"
    >
      <span className="dr-switch" aria-hidden="true"><span className="dr-switch__knob" /></span>
      Détails
    </button>
  );
}

/** Enveloppe défilante pour les pages qui ne gèrent pas leur propre défilement. */
function Scroll({ children }: { children: JSX.Element }): JSX.Element {
  return <div className="sz-main__scroll sz-scroll">{children}</div>;
}

export function App(): JSX.Element {
  useEffect(() => syncDetailsAttr(), []);
  // raccourci D : bascule le mode détails (hors champs de saisie)
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.defaultPrevented) return;
      const t = e.target;
      if (t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      if (e.key !== 'd' && e.key !== 'D') return;
      const p = usePrefs.getState();
      p.setDetails(!p.details);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  return (
    <BrowserRouter>
      <div className="sz-shell">
        <TopBar />
        <main className="sz-main">
          <Routes>
            <Route path="/" element={<Navigate to="/body" replace />} />
            <Route path="/body" element={<Body />} />
            <Route path="/warroom" element={<Scroll><WarRoom /></Scroll>} />
            <Route path="/mental" element={<Scroll><Mental /></Scroll>} />
            <Route path="/reasoning/:id" element={<Scroll><ReasoningPage /></Scroll>} />
            <Route path="*" element={<Navigate to="/body" replace />} />
          </Routes>
        </main>
        <SideNav />
      </div>
    </BrowserRouter>
  );
}
