// Propriétaire : Steve (D). Synthèses IA par organe — ROADMAP §7.
// Données : public/data/summaries/<organId>.json, rédigées au sol (hors ligne) à partir des seuls chiffres
// du simulateur (src/sim), puis figées. Aucun appel réseau, aucune IA dans le navigateur.
// Générateur : docs/tools/build-summaries.py. Toujours « IA-sol », jamais relues (reviewed: false) : à valider par le CMO.
import type { OrganId, OrganSummary } from '../types';

interface SummaryEntry { day: number; adherence: number; text: string }
interface SummaryFile { organId: string; days: SummaryEntry[] }

const files = import.meta.glob<SummaryFile>('../../public/data/summaries/*.json', { eager: true, import: 'default' });

/** organId → jour → adhérence (0 | 1) → texte */
const byOrgan = new Map<string, Map<number, Map<number, string>>>();
for (const f of Object.values(files)) {
  const days = new Map<number, Map<number, string>>();
  for (const e of f.days) {
    if (!days.has(e.day)) days.set(e.day, new Map());
    days.get(e.day)!.set(e.adherence, e.text);
  }
  byOrgan.set(f.organId, days);
}

function nearestKey(days: Map<number, unknown>, day: number): number | null {
  let best: number | null = null;
  for (const k of days.keys()) if (best === null || Math.abs(k - day) < Math.abs(best - day)) best = k;
  return best;
}

function lookup(organId: OrganId, day: number, adherence: number): OrganSummary | null {
  const days = byOrgan.get(organId);
  if (!days || !Number.isFinite(day)) return null;
  const key = nearestKey(days, day);
  if (key === null) return null;
  const variants = days.get(key)!;
  const a = adherence >= 0.5 ? 1 : 0;
  const text = variants.get(a) ?? variants.get(0);
  return text ? { organId, day: key, text, generatedBy: 'IA-sol', reviewed: false } : null;
}

/** Synthèse IA (générée au sol, hors ligne) du jour clé le plus proche. null si l'organe n'est pas modélisé. */
export function getSummary(organId: OrganId, day: number): OrganSummary | null {
  return lookup(organId, day, 0);
}

/** (ajout hors contrat §7) Origine du texte : vraie synthèse IA hors ligne lue dans public/data/summaries/. */
export const SUMMARY_SOURCE: 'gabarit' | 'ia-sol' = 'ia-sol';

/** (ajout hors contrat §7) Synthèse selon l'adhérence au plan (0 = rythme actuel, 1 = avec le plan ; ne diffère qu'après J94). */
export function getSummaryPlan(organId: OrganId, day: number, adherence: number): OrganSummary | null {
  return lookup(organId, day, adherence);
}
