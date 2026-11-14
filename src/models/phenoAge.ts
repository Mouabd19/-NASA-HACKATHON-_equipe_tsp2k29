// Propriétaire : Mouad (ROADMAP §7). PhenoAge [Publié] (Levine 2018) sur le dernier prélèvement ≤ day.
import type { PhenoAgeResult } from '../types.ts';
import { getBloodTests } from '../sim/load.ts';
import { chronoAge } from '../sim/persona.ts';
import { computePhenoAge, type PhenoAgeMarkers } from './phenoAgeFormula.ts';
import { round } from './stats.ts';

// clé du marqueur PhenoAge → nom de l'analyte dans les prélèvements
const ANALYTE: Record<keyof PhenoAgeMarkers, string> = {
  albumine: 'albumine', creatinine: 'creatinine', glucose: 'glucose', crp: 'crp', lymphocytes_pct: 'lymphocytes_pct',
  vgm: 'vgm', idr: 'idr', pal: 'phosphatases_alcalines', leucocytes: 'leucocytes',
};

/** (v3.2) PhenoAge [Publié] sur le dernier prélèvement complet ≤ day. null avant le premier prélèvement. */
export function phenoAge(day: number): PhenoAgeResult | null {
  if (!(day >= 0)) return null;
  const draws = [...new Set(getBloodTests('crp').map(b => b.day))].filter(d => d <= day);
  const drawDay = draws.at(-1);
  if (drawDay === undefined) return null;
  const at = (analyte: string) => getBloodTests(analyte).find(b => b.day === drawDay)?.value;
  const markers = {} as PhenoAgeMarkers;
  const inputs: Record<string, number> = {};
  for (const [k, analyte] of Object.entries(ANALYTE) as [keyof PhenoAgeMarkers, string][]) {
    const v = at(analyte);
    if (v === undefined) return null;     // prélèvement incomplet : pas de valeur inventée
    markers[k] = v;
    inputs[analyte] = v;
  }
  const chrono = chronoAge(drawDay);
  return { day: drawDay, phenoAge: round(computePhenoAge(markers, chrono), 1), chronoAge: round(chrono, 2), inputs, tag: 'Publié' };
}
