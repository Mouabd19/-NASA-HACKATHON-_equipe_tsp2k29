// Coquille de l'application : barre haute de 36 px + page routée qui remplit le reste.
// Les styles (.sz-shell, .sz-topbar, .sz-nav, .sz-main) sont dans src/ui/global.css.
import { useEffect, useState } from 'react';
import type { JSX } from 'react';
import { BrowserRouter, Navigate, NavLink, Route, Routes } from 'react-router-dom';
import { ASTRONAUT, DAY_TODAY } from './mocks/mission';
import { Body } from './pages/body/Body';
import { ReasoningPage } from './pages/reasoning/Reasoning';
import { WarRoom } from './pages/warroom/WarRoom';
import { TagBadge, dayToDate, fmtDay } from './ui';

const TABS = [
  { to: '/body', num: '01', label: 'BODY' },
  { to: '/warroom', num: '02', label: 'WAR ROOM' },
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
        <span className="sz-topbar__rule sz-topbar__opt" />
        <span className="sz-dim sz-topbar__opt">MISSION {ASTRONAUT.id}</span>
      </div>

      <nav className="sz-nav" aria-label="Pages">
        {TABS.map((t) => (
          <NavLink key={t.to} to={t.to} className="sz-nav__tab">
            <span className="sz-nav__num">{t.num}</span>
            <span aria-hidden="true">/</span>
            {t.label}
          </NavLink>
        ))}
      </nav>

      <div className="sz-topbar__right">
        <Clock />
        <span className="sz-topbar__rule" />
        <span className="sz-topbar__day" title={`Jour de mission — ${dayToDate(DAY_TODAY)}`}>{fmtDay(DAY_TODAY)}</span>
        <span className="sz-dim sz-topbar__opt">{dayToDate(DAY_TODAY)}</span>
        <span className="sz-topbar__rule sz-topbar__opt" />
        <span className="sz-topbar__opt">
          <span className="sz-dim">{ASTRONAUT.role}</span> {ASTRONAUT.name}
        </span>
        <span className="sz-topbar__opt"><TagBadge tag="Persona" /></span>
      </div>
    </header>
  );
}

/** Enveloppe défilante pour les pages qui ne gèrent pas leur propre défilement. */
function Scroll({ children }: { children: JSX.Element }): JSX.Element {
  return <div className="sz-main__scroll sz-scroll">{children}</div>;
}

export function App(): JSX.Element {
  return (
    <BrowserRouter>
      <div className="sz-shell">
        <TopBar />
        <main className="sz-main">
          <Routes>
            <Route path="/" element={<Navigate to="/body" replace />} />
            <Route path="/body" element={<Body />} />
            <Route path="/warroom" element={<Scroll><WarRoom /></Scroll>} />
            <Route path="/reasoning/:id" element={<Scroll><ReasoningPage /></Scroll>} />
            <Route path="*" element={<Navigate to="/body" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
