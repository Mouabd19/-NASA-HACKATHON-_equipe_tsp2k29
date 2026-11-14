// PhenoAge [Publié] — Levine et al., Aging 2018 (doi:10.18632/aging.101414).
// Coefficients vérifiés par Steve : docs/sources/phenoage.md. Fonction pure, sans données.

/** Marqueurs en unités SI (CRP en mg/L, convertie en mg/dL dans la formule). */
export interface PhenoAgeMarkers {
  albumine: number;      // g/L
  creatinine: number;    // µmol/L
  glucose: number;       // mmol/L
  crp: number;           // mg/L (> 0)
  lymphocytes_pct: number; // %
  vgm: number;           // fL
  idr: number;           // %
  pal: number;           // U/L
  leucocytes: number;    // 10³/µL
}

export const PHENOAGE_MARKERS: (keyof PhenoAgeMarkers)[] = [
  'albumine', 'creatinine', 'glucose', 'crp', 'lymphocytes_pct', 'vgm', 'idr', 'pal', 'leucocytes',
];

/** k = 0.090165 (Aging 2018). Variante 0.09165 (correction PLOS Med 2019) notée dans Raisonnement. */
export const PHENOAGE_K = 0.090165;
const GAMMA = 0.0076927;

export function computePhenoAge(m: PhenoAgeMarkers, chronoAge: number, k = PHENOAGE_K): number {
  const crpMgDl = Math.max(m.crp, 0.01) / 10;
  const xb = -19.907
    - 0.0336 * m.albumine
    + 0.0095 * m.creatinine
    + 0.1953 * m.glucose
    + 0.0954 * Math.log(crpMgDl)
    - 0.0120 * m.lymphocytes_pct
    + 0.0268 * m.vgm
    + 0.3306 * m.idr
    + 0.00188 * m.pal
    + 0.0554 * m.leucocytes
    + 0.0804 * chronoAge;
  const M = 1 - Math.exp(-Math.exp(xb) * (Math.exp(120 * GAMMA) - 1) / GAMMA);
  return 141.50 + Math.log(-0.00553 * Math.log(1 - M)) / k;
}
