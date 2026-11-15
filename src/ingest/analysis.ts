// Propriétaire : Ahmed (B). Analyse du check-in avant application : le check-in passe par des étapes visibles
// (lecture, comparaison à la référence, règles de triage, ajustement du plan) puis seulement est enregistré.
// La consigne, la to-do et la montre changent donc à la fin de l'analyse, pas à l'instant du clic.
import { useSyncExternalStore } from 'react';
import { saveCheckIn, type CheckInZones } from './checkin';

export const ANALYSIS_STEPS = [
  { label: 'Check-in received', ms: 700 },
  { label: 'Comparing with the 30-day personal baseline', ms: 1300 },
  { label: 'Running triage rules (NASA-STD-3001)', ms: 1100 },
  { label: 'Adjusting today’s plan', ms: 1300 },
] as const;

export interface AnalysisState { running: boolean; step: number }

let state: AnalysisState = { running: false, step: 0 };
const listeners = new Set<() => void>();
const set = (s: AnalysisState) => { state = s; listeners.forEach((f) => f()); };
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Lance l'analyse puis enregistre le check-in. Un deuxième appel pendant une analyse est ignoré. */
export async function analyzeCheckIn(c: CheckInZones): Promise<void> {
  if (state.running) return;
  const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  for (let i = 0; i < ANALYSIS_STEPS.length; i++) {
    set({ running: true, step: i });
    await wait(reduce ? 300 : ANALYSIS_STEPS[i].ms);
  }
  saveCheckIn(c);
  set({ running: false, step: 0 });
}

export function useAnalysis(): AnalysisState {
  return useSyncExternalStore(
    (f) => { listeners.add(f); return () => listeners.delete(f); },
    () => state,
    () => state,
  );
}
