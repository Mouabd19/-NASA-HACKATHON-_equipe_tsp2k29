import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/inter';
import '@fontsource-variable/jetbrains-mono';
import '@fontsource/barlow/300.css';
import '@fontsource/barlow/400.css';
import '@fontsource/barlow/500.css';
import '@fontsource/barlow/600.css';
import { applyTokens } from './ui/tokens';
import './ui/global.css';
import './ui/theme-dragon.css';
import { App } from './App';
import { setLoadedAnatomy } from './three/anatomy';
import { loadZAnatomy } from './three/zanatomy';

applyTokens();

// Modèles Z-Anatomy (Steve) chargés AVANT le premier rendu : la scène et la fenêtre organe
// lisent la même liste de pièces. Échec ou plus de 15 s → corps procédural de secours (aucun blocage de la démo).
const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('délai dépassé')), 15000));
Promise.race([loadZAnatomy(), timeout])
  .then(({ parts, manifest }) => setLoadedAnatomy(parts, manifest))
  .catch((e) => console.warn('[SOL ZÉRO] Modèles Z-Anatomy non chargés, corps procédural utilisé :', e))
  .finally(() => {
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  });
