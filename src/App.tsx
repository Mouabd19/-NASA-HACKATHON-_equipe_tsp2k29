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

const TABS = [
  { to: '/body', label: 'Body' },
  { to: '/warroom', label: 'War Room' },
] as const;

function utcClock(d: Date): string {
  return d.toISOString().slice(11, 19);
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
      {utcClock(now)} <span className="sz-dim">UTC</span>
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
        </span>
        <span className="sz-topbar__rule sz-topbar__opt sz-detail" />
        <span className="sz-dim sz-topbar__opt sz-detail">Mission {ASTRONAUT.id}</span>
      </div>

      <nav className="sz-nav" aria-label="Pages">
        {TABS.map((t) => (
          <NavLink key={t.to} to={t.to} className="sz-nav__tab">
            {t.label}
          </NavLink>
        ))}
      </nav>

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
      </div>
    </BrowserRouter>
  );
}
