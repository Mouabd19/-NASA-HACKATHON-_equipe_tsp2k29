// Préférences d'affichage, communes à toutes les pages et mémorisées dans le navigateur.
//  · details : affiche les étiquettes de provenance, les codes de panneau et les textes secondaires.
//    Désactivé par défaut : l'écran ne montre que l'essentiel ; le reste se rallume d'un clic.
//  · closed : panneaux de la page Body fermés par l'utilisateur (rouvrables depuis la scène).
import { create } from 'zustand';

export type BodyPanelId = 'header' | 'blood' | 'spo2' | 'layers' | 'alerts' | 'timeline';

export const BODY_PANEL_LABEL: Record<BodyPanelId, string> = {
  header: 'Header',
  blood: 'Labs',
  spo2: 'SpO₂',
  layers: 'Layers',
  alerts: 'Alerts',
  timeline: 'Timeline',
};

const KEY = 'sz-prefs-v1';

interface Stored { details: boolean; closed: BodyPanelId[] }

function load(): Stored {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<Stored>;
      return { details: p.details === true, closed: Array.isArray(p.closed) ? p.closed : [] };
    }
  } catch { /* stockage indisponible : valeurs par défaut */ }
  return { details: false, closed: [] };
}

function save(s: Stored): void {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* ignoré */ }
}

export interface PrefsState extends Stored {
  setDetails: (on: boolean) => void;
  closePanel: (id: BodyPanelId) => void;
  openPanel: (id: BodyPanelId) => void;
  openAll: () => void;
}

export const usePrefs = create<PrefsState>((set, get) => {
  const persist = (): void => { const { details, closed } = get(); save({ details, closed }); };
  return {
    ...load(),
    setDetails: (on) => { set({ details: on }); persist(); },
    closePanel: (id) => { set((s) => ({ closed: s.closed.includes(id) ? s.closed : [...s.closed, id] })); persist(); },
    openPanel: (id) => { set((s) => ({ closed: s.closed.filter((c) => c !== id) })); persist(); },
    openAll: () => { set({ closed: [] }); persist(); },
  };
});

/** Reflète le mode « détails » sur <html data-details>, que le CSS utilise pour masquer le secondaire. */
export function syncDetailsAttr(): () => void {
  const apply = (on: boolean): void => { document.documentElement.dataset.details = on ? 'on' : 'off'; };
  apply(usePrefs.getState().details);
  return usePrefs.subscribe((s) => apply(s.details));
}
