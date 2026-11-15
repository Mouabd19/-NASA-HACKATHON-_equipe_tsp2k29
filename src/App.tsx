// Coquille de l'application : barre haute de 48 px + page routée qui remplit le reste.
// Les styles (.sz-shell, .sz-topbar, .sz-nav, .sz-main) sont dans src/ui/global.css.
import { useEffect } from 'react';
import type { JSX } from 'react';
import { BrowserRouter, Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { ASTRONAUT } from './mocks/mission';
import { Body } from './pages/body/Body';
import { Mental } from './pages/mental/Mental';
import { ReasoningPage } from './pages/reasoning/Reasoning';
import { WarRoom } from './pages/warroom/WarRoom';
import { sentenceCase } from './ui';
import { syncDetailsAttr, usePrefs } from './ui/prefs';

const TABS = [
  { to: '/body', label: 'Body' },
  { to: '/warroom', label: "Today's plan" },
  { to: '/mental', label: 'Mental health' },
] as const;

function TopBar(): JSX.Element {
  // le raisonnement est une sous-page du plan du jour : son onglet reste actif
  const inReasoning = useLocation().pathname.startsWith('/reasoning');
  return (
    <header className="sz-topbar">
      <div className="sz-topbar__left">
        {/* mot-symbole seul : pas de pictogramme santé générique */}
        <span className="sz-wordmark">TriFlow</span>
        <nav className="sz-nav" aria-label="Pages">
          {TABS.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              className={({ isActive }) => `sz-nav__tab${isActive || (inReasoning && t.to === '/warroom') ? ' active' : ''}`}
            >
              {t.label}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="sz-topbar__right">
        {/* identification du patient : grade et nom de la persona, rien d'inventé en plus */}
        <span className="sz-patient" title="Fictional persona from the mission scenario">
          <span className="sz-patient__role">Cmdr</span>
          <strong className="sz-patient__name">{sentenceCase(ASTRONAUT.name)}</strong>
        </span>
        {/* rappel d'honnêteté unique quand les étiquettes par chiffre sont masquées */}
        <span
          className="sz-topbar__sim"
          title="Fictional persona and simulated data — “Details” shows where each figure comes from"
        >
          Simulated data
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
      className="sz-btn sz-btn--sm"
      aria-pressed={details}
      onClick={() => setDetails(!details)}
      title="Show the source and provenance of each figure (D)"
    >
      Details
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
