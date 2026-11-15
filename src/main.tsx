import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/inter';
// IBM Plex (fichiers locaux, fontsource) : interface, grandes valeurs, références.
import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-sans/500.css';
import '@fontsource/ibm-plex-sans/600.css';
import '@fontsource/ibm-plex-sans-condensed/400.css';
import '@fontsource/ibm-plex-sans-condensed/500.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import { applyTokens } from './ui/tokens';
import './ui/global.css';
import { App } from './App';
import { setLoadedAnatomy } from './three/anatomy';
import { loadZAnatomy } from './three/zanatomy';

applyTokens();

// Modèles Z-Anatomy (Steve) chargés AVANT le premier rendu : la scène et la fenêtre organe
// lisent la même liste de pièces. Échec ou plus de 15 s → corps procédural de secours (aucun blocage de la démo).
const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timed out')), 15000));
Promise.race([loadZAnatomy(), timeout])
  .then(({ parts, manifest }) => setLoadedAnatomy(parts, manifest))
  .catch((e) => console.warn('[Triflow] Z-Anatomy models not loaded, using procedural body:', e))
  .finally(() => {
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  });
