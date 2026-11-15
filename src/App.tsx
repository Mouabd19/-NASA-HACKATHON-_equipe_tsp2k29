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
  { to: '/body', label: 'Corps' },
  { to: '/warroom', label: 'Plan du jour' },
  { to: '/mental', label: 'Santé mentale' },
] as const;

function TopBar(): JSX.Element {
  // le raisonnement est une sous-page du plan du jour : son onglet reste actif
  const inReasoning = useLocation().pathname.startsWith('/reasoning');
  return (
    <header className="sz-topbar">
      <div className="sz-topbar__left">
        <span className="sz-wordmark">
          {/* une onde de pouls : la marque vient de l'instrument, pas d'une bibliothèque d'icônes */}
          <svg viewBox="0 0 20 12" aria-hidden="true">
            <path d="M0 7h5l1.5-3 2 7 2.5-11 2 7h7" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
          </svg>
          <span>Sol Zéro</span>
        </span>
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
        {/* identification du patient, comme le bandeau d'un moniteur */}
        <span className="sz-patient" title="Persona fictive du scénario de mission">
          <span className="sz-patient__role">Cdt</span>
          <strong className="sz-patient__name">{sentenceCase(ASTRONAUT.name)}</strong>
          <span className="sz-mono sz-patient__role">{ASTRONAUT.id}</span>
        </span>
        {/* rappel d'honnêteté unique quand les étiquettes par chiffre sont masquées */}
        <span
          className="sz-topbar__sim"
          title="Persona fictive et données simulées — « Détails » affiche la provenance de chaque chiffre"
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
      className="sz-btn sz-btn--sm"
      aria-pressed={details}
      onClick={() => setDetails(!details)}
      title="Afficher les sources et la provenance de chaque chiffre (D)"
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
