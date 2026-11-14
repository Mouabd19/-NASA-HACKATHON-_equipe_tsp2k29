import { describe, expect, it } from 'vitest';
import { generateSim } from '../../src/sim/generate.ts';
import { getBloodTests, getCheckIn, getDayBody, getDayBodyPlan } from '../../src/sim/load.ts';
import { computePhenoAge, type PhenoAgeMarkers } from '../../src/models/phenoAgeFormula.ts';
import { phenoAge } from '../../src/models/phenoAge.ts';
import { alertsForDay } from '../../src/models/alerts.ts';
import { chronoAge } from '../../src/sim/persona.ts';

const sim = generateSim();
const organ = (day: number, id: string) => getDayBody(day).organs.find(o => o.id === id)!;
const metric = (day: number, id: string, key: string) => organ(day, id).metrics.find(m => m.key === key)!;

describe('générateur (mesures brutes)', () => {
  it('déterministe : même graine → mêmes données', () => {
    expect(JSON.stringify(generateSim())).toBe(JSON.stringify(sim));
  });
  it('une autre graine change les données', () => {
    expect(JSON.stringify(generateSim(7).scan)).not.toBe(JSON.stringify(sim.scan));
  });
  it('scanner quotidien J0 → J94 (muscles, fluides, nerf optique), hebdo pour le cœur', () => {
    for (const k of ['cuisse', 'mollet', 'paravertebraux', 'volume_jambes', 'gaine_nerf_optique'] as const) {
      expect(sim.scan[k].map(p => p.day)).toEqual(Array.from({ length: 95 }, (_, i) => i));
    }
    expect(sim.scan.fraction_ejection.map(p => p.day)).toEqual([0, 7, 14, 21, 28, 35, 42, 49, 56, 63, 70, 77, 84, 91]);
  });
  it('le scanner ne mesure pas l\'os (v3.2) : aucune série osseuse', () => {
    expect(Object.keys(sim.scan).some(k => /os|bone|densite/.test(k))).toBe(false);
  });
  it('prélèvement capillaire hebdomadaire, calcium urinaire quotidien en hausse', () => {
    expect([...new Set(sim.blood.map(b => b.day))]).toEqual([0, 7, 14, 21, 28, 35, 42, 49, 56, 63, 70, 77, 84, 91]);
    const ca = sim.urine.filter(u => u.analyte === 'calcium_urinaire');
    const avg = (v: typeof ca) => v.reduce((s, b) => s + b.value, 0) / v.length;
    expect(ca).toHaveLength(95);
    expect(avg(ca.slice(-7))).toBeGreaterThan(avg(ca.slice(0, 7)) + 50);
  });
  it('PhenoAge J91 = 43,1 ans (mock roadmap §7), marqueurs dans les plages de référence', () => {
    const at = (a: string) => sim.blood.find(b => b.day === 91 && b.analyte === a)!;
    const m: PhenoAgeMarkers = {
      albumine: at('albumine').value, creatinine: at('creatinine').value, glucose: at('glucose').value, crp: at('crp').value,
      lymphocytes_pct: at('lymphocytes_pct').value, vgm: at('vgm').value, idr: at('idr').value,
      pal: at('phosphatases_alcalines').value, leucocytes: at('leucocytes').value,
    };
    expect(Math.abs(computePhenoAge(m, chronoAge(91)) - 43.1)).toBeLessThanOrEqual(0.1);
    expect(phenoAge(94)!.phenoAge).toBe(43.1);
    for (const b of sim.blood.filter(b => b.day === 91)) {
      expect(b.value).toBeGreaterThanOrEqual(b.refLow);
      expect(b.value).toBeLessThanOrEqual(b.refHigh);
    }
  });
});

describe('corps du jour J94 (mocks roadmap §7)', () => {
  it.each([
    ['hanche', 'amber'], ['cuisse', 'amber'], ['coeur', 'amber'], ['yeux', 'amber'],
    ['mollet', 'green'], ['paravertebraux', 'green'], ['rachis', 'green'], ['femur', 'green'],
    ['reins', 'green'], ['sang', 'green'], ['dose', 'green'],
    ['poumons', 'grey'], ['foie', 'grey'], ['cerveau', 'grey'],
  ])('%s → %s', (id, color) => expect(organ(94, id).status).toBe(color));

  it('hanche : densité estimée 98,01 % (perte 1,99 %), écart d\'âge +4,0 ans (0,5 %/an)', () => {
    expect(metric(94, 'hanche', 'densite_osseuse').value).toBeCloseTo(98.01, 2);
    const h = organ(94, 'hanche');
    expect(h.bioAge - h.chronoAge).toBeCloseTo(3.98, 1);
  });
  it('check-in J94 : humeur 3, fatigue 3, douleur 1 (bas du dos)', () => {
    expect(getCheckIn(94)).toMatchObject({ mood: 3, fatigue: 3, pain: 1, painZone: 'paravertebraux' });
  });
  it.each([
    // [organe, clé, pente vraie du modèle en % de la moyenne / sem, tolérance = 3 écarts-types (200 graines)]
    ['cuisse', 'volume', -0.41, 0.13], ['mollet', 'volume', -0.30, 0.13], ['paravertebraux', 'volume', -0.23, 0.13],
    ['coeur', 'vo2max', -0.64, 0.33],
  ])('tendance 7 j %s/%s retrouve la pente vraie (%s %/sem)', (id, key, truth, tol) => {
    const t = metric(94, id, key).trend7d!;
    expect(t).toBeLessThan(0);
    expect(Math.abs(t - truth)).toBeLessThanOrEqual(tol);
  });
  it('4 alertes AMBRE à J94 : hanche, cuisse, cœur, nerf optique', () => {
    expect(alertsForDay(94).map(a => a.organId).sort()).toEqual(['coeur', 'cuisse', 'hanche', 'yeux']);
  });
});

describe('projection (> J94)', () => {
  it('J860 au rythme actuel : hanche 91,3 % → rouge ; avec le plan : jamais rouge', () => {
    expect(getDayBody(860).projected).toBe(true);
    expect(metric(860, 'hanche', 'densite_osseuse').value).toBeCloseTo(91.3, 1);
    expect(organ(860, 'hanche').status).toBe('red');
    expect(getDayBodyPlan(860, 1).organs.find(o => o.id === 'hanche')!.status).not.toBe('red');
  });
  it('sans modèle de projection, on n\'invente rien : nerf optique gris et sans mesure', () => {
    const y = organ(400, 'yeux');
    expect(y.status).toBe('grey');
    expect(y.metrics).toEqual([]);
  });
  it('les valeurs projetées sont étiquetées [H] ou [Publié]', () => {
    for (const o of getDayBody(500).organs) for (const m of o.metrics) expect(['H', 'Publié']).toContain(m.tag);
  });
  it('analyses : 14 prélèvements CRP, 95 calciums urinaires', () => {
    expect(getBloodTests('crp')).toHaveLength(14);
    expect(getBloodTests('calcium_urinaire')).toHaveLength(95);
  });
});
