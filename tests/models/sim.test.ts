import { describe, expect, it } from 'vitest';
import { generateSim } from '../../src/sim/generate.ts';
import { getBloodTests, getCheckIn, getDayBody, getDays, getWatchSeries } from '../../src/sim/loadSim.ts';
import { computePhenoAge, type PhenoAgeMarkers } from '../../src/models/phenoAgeFormula.ts';
import { chronoAge, DAY_SOL0 } from '../../src/sim/persona.ts';

const sim = generateSim();
const organ = (day: number, id: string) => getDayBody(day).organs.find(o => o.id === id)!;

describe('générateur', () => {
  it('déterministe : même graine → mêmes données', () => {
    expect(JSON.stringify(generateSim())).toBe(JSON.stringify(sim));
  });
  it('une autre graine change les données', () => {
    expect(JSON.stringify(generateSim(7).days)).not.toBe(JSON.stringify(sim.days));
  });
  it('95 corps du jour, J0 → J94, mesurés', () => {
    expect(sim.days.map(d => d.day)).toEqual(Array.from({ length: 95 }, (_, i) => i));
    expect(sim.days.every(d => !d.projected && d.source === 'scan-midjourney-sim')).toBe(true);
  });
  it('aucune métrique osseuse attribuée au scanner (v3.2)', () => {
    for (const d of sim.days) for (const o of d.organs.filter(o => o.layer === 'squelette'))
      for (const m of o.metrics) { expect(m.provenance).toBe('H'); expect(m.tag).toBe('H'); }
  });
  it('prélèvement capillaire hebdomadaire, urine quotidienne', () => {
    expect([...new Set(sim.blood.map(b => b.day))]).toEqual([0, 7, 14, 21, 28, 35, 42, 49, 56, 63, 70, 77, 84, 91]);
    expect(sim.urine.filter(u => u.analyte === 'urine_calcium')).toHaveLength(95);
  });
  it('PhenoAge J91 = 43,1 ans (mock roadmap §7)', () => {
    const at = (a: string) => sim.blood.find(b => b.day === 91 && b.analyte === a)!.value;
    const m: PhenoAgeMarkers = {
      albumine: at('albumine'), creatinine: at('creatinine'), glucose: at('glucose'), crp: at('crp'),
      lymphocytes_pct: at('lymphocytes_pct'), vgm: at('vgm'), idr: at('idr'), pal: at('pal'), leucocytes: at('leucocytes'),
    };
    expect(Math.abs(computePhenoAge(m, chronoAge(91)) - 43.1)).toBeLessThanOrEqual(0.1);
  });
  it('valeurs dans les plages physiologiques', () => {
    for (const b of sim.blood) expect(b.value).toBeGreaterThan(0);
    for (const m of sim.watch.filter(w => w.type === 'OxygenSaturation')) {
      expect(m.value).toBeGreaterThanOrEqual(97); expect(m.value).toBeLessThanOrEqual(99.5);
    }
  });
});

describe('J94 — statuts attendus (mocks roadmap §7)', () => {
  it.each([
    ['hanche', 'amber'], ['cuisse', 'amber'], ['coeur', 'amber'], ['yeux', 'amber'],
    ['mollet', 'green'], ['reins', 'green'], ['sang', 'green'],
    ['poumons', 'grey'], ['foie', 'grey'], ['cerveau', 'grey'],
  ])('%s → %s', (id, color) => expect(organ(94, id).status).toBe(color));

  it('hanche : densité estimée 98,01 % (perte 1,99 %), écart d\'âge +4,0 ans (0,5 %/an)', () => {
    const h = organ(94, 'hanche');
    expect(h.metrics[0].value).toBeCloseTo(98.01, 2);
    expect(h.bioAge - h.chronoAge).toBeCloseTo(3.98, 1);
  });
  it('check-in J94 : humeur 3, fatigue 3, douleur 1 (bas du dos)', () => {
    expect(getCheckIn(94)).toMatchObject({ mood: 3, fatigue: 3, pain: 1, painZone: 'paravertebraux' });
  });
  it.each([
    // [organe, clé, pente vraie du modèle en %/sem, tolérance = 3 écarts-types mesurés sur 200 graines]
    ['cuisse', 'volume', -0.385, 0.12], ['mollet', 'volume', -0.29, 0.12], ['paravertebraux', 'volume', -0.22, 0.12],
    ['coeur', 'vo2max', -0.57, 0.29],
  ])('tendance 7 j %s/%s retrouve la pente vraie (%s %/sem)', (id, key, truth, tol) => {
    const t = organ(94, id).metrics.find(m => m.key === key)!.trend7d!;
    expect(t).toBeLessThan(0);
    expect(Math.abs(t - truth)).toBeLessThanOrEqual(tol);
  });
});

describe('load.ts', () => {
  it('getDays : mesuré J0–J94 puis projeté jusqu\'à J860, avec Sol 0', () => {
    const days = getDays();
    expect(days[0]).toBe(0);
    expect(days.at(-1)).toBe(860);
    expect(days).toContain(DAY_SOL0);
  });
  it('corps projeté à J860 : hanche 8,70 % de perte → rouge', () => {
    const b = getDayBody(860);
    expect(b.projected).toBe(true);
    const h = b.organs.find(o => o.id === 'hanche')!;
    expect(h.metrics[0].value).toBeCloseTo(91.3, 1);
    expect(h.status).toBe('red');
    expect(h.bioAge - h.chronoAge).toBeCloseTo(17.4, 0); // 8,70 % / 0,5 %/an
    expect(b.organs.find(o => o.id === 'yeux')!.status).toBe('grey'); // pas de modèle → gris
  });
  it('jour inconnu → organes gris, jamais vert', () => {
    expect(getDayBody(-5).organs.every(o => o.status === 'grey')).toBe(true);
  });
  it('getBloodTests / getWatchSeries', () => {
    expect(getBloodTests('crp')).toHaveLength(14);
    expect(getBloodTests('urine_calcium')).toHaveLength(95);
    expect(getWatchSeries('OxygenSaturation')).toHaveLength(95);
  });
});
