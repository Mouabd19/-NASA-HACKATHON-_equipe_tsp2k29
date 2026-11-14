import { describe, expect, it } from 'vitest';
import { BANDS, inBand, stonesColor } from '../../src/models/rules.ts';
import { RED_TEST, bodyFor, redOnTwoMeasures } from '../../src/sim/body.ts';
import { planDay } from '../../src/models/planDay.ts';
import { getCheckIn } from '../../src/sim/load.ts';

describe('règles §8 — plus de vert fixé en dur', () => {
  it('inBand : trop bas / trop haut → ambre puis rouge ; NaN → gris', () => {
    expect(inBand(120, BANDS.tension_sys)).toBe('green');
    expect(inBand(135, BANDS.tension_sys)).toBe('amber');
    expect(inBand(145, BANDS.tension_sys)).toBe('red');
    expect(inBand(85, BANDS.tension_sys)).toBe('amber');
    expect(inBand(50, BANDS.fraction_ejection)).toBe('amber');
    expect(inBand(40, BANDS.fraction_ejection)).toBe('red');
    expect(inBand(NaN, BANDS.fc_repos)).toBe('grey');
  });
  it('chaque métrique à plage a la couleur de sa valeur, sur toute la période mesurée', () => {
    const keys = Object.keys(BANDS).filter(k => k !== 'pvt');   // PVT : couleur sur la moyenne 7 j
    for (let d = 0; d <= 94; d += 7) {
      for (const o of bodyFor(d).organs) for (const m of o.metrics) {
        if (keys.includes(m.key)) expect(m.color, `${o.id}.${m.key} J${d}`).toBe(inBand(m.value, BANDS[m.key as keyof typeof BANDS]));
      }
    }
  });
  it('Haddad reste dans ses plages : la démo ne change pas', () => {
    const sang = bodyFor(94).organs.find(o => o.id === 'sang')!;
    for (const k of ['fc_repos', 'tension_sys', 'tension_dia', 'volume_jambes']) expect(sang.metrics.find(m => m.key === k)!.color).toBe('green');
    expect(bodyFor(94).organs.find(o => o.id === 'yeux')!.metrics.find(m => m.key === 'pvt')!.color).toBe('green');
  });
});

describe('calculs rénaux au scan', () => {
  it('0 calcul → vert, 1 ou plus → ambre (hydratation + échographie), inconnu → gris', () => {
    expect(stonesColor(0)).toBe('green');
    expect(stonesColor(1)).toBe('amber');
    expect(stonesColor(NaN)).toBe('grey');
  });
  it('la couleur des calculs compte dans le statut des reins', () => {
    const reins = bodyFor(94).organs.find(o => o.id === 'reins')!;
    expect(reins.metrics.find(m => m.key === 'calculs')!.color).toBe('green');
    expect(bodyFor(300).organs.find(o => o.id === 'reins')!.metrics.find(m => m.key === 'calculs')).toBeUndefined();  // pas projeté
  });
});

describe('exception : seuil rouge sur 2 mesures consécutives → alerte immédiate', () => {
  it('seuils rouges : muscle −10 %, gaine 6,0 mm, calcium urinaire 350 mg/24 h', () => {
    expect(RED_TEST.muscle.isRed(89.9)).toBe(true);
    expect(RED_TEST.muscle.isRed(91)).toBe(false);
    expect(RED_TEST.gaine.isRed(6.0)).toBe(true);
    expect(RED_TEST.calcium.isRed(349)).toBe(false);
  });
  it('Haddad n\'a jamais 2 mesures rouges de suite (pas d\'alerte immédiate inventée), et rien en projection', () => {
    for (let d = 1; d <= 94; d++) {
      for (const t of Object.values(RED_TEST)) for (const o of t.organs) expect(redOnTwoMeasures(o, t.key, d)).toBe(false);
    }
    expect(redOnTwoMeasures('cuisse', 'volume', 300)).toBe(false);
  });
});

describe('test PVT dans la to-do', () => {
  it('proposé les jours de fatigue ≥ 4 ou de sommeil ressenti ≤ 2, absent sinon', () => {
    let seen = 0;
    for (let d = 0; d <= 94; d++) {
      const ci = getCheckIn(d)!;
      const want = ci.fatigue >= 4 || ci.sleepFelt <= 2;
      expect(planDay(d).some(i => i.id === 'test-pvt'), `J${d}`).toBe(want);
      if (want) seen++;
    }
    expect(seen).toBeGreaterThan(0);
  });
});
