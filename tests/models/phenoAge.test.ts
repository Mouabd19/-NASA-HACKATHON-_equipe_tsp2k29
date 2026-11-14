import { describe, expect, it } from 'vitest';
import { computePhenoAge, type PhenoAgeMarkers } from '../../src/models/phenoAgeFormula.ts';

// Vecteurs de test de Steve (docs/sources/phenoage.md), profil sain, k = 0.090165.
const healthy: PhenoAgeMarkers = {
  albumine: 45, creatinine: 80, glucose: 5.0, crp: 1.0 /* = 0.1 mg/dL */, lymphocytes_pct: 30,
  vgm: 90, idr: 13, pal: 70, leucocytes: 6,
};

describe('PhenoAge — tests d\'or', () => {
  it.each([
    [30, 24.1], [42, 34.8], [60, 50.8], [80, 68.6],
  ])('âge réel %d → PhenoAge %d', (age, expected) => {
    expect(Math.abs(computePhenoAge(healthy, age) - expected)).toBeLessThanOrEqual(0.1);
  });

  it('variante k = 0.09165 (PLOS Med 2019)', () => {
    expect(Math.abs(computePhenoAge(healthy, 42, 0.09165) - 36.5)).toBeLessThanOrEqual(0.1);
  });
});
