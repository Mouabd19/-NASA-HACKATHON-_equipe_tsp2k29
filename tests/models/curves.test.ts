import { describe, expect, it } from 'vitest';
import { boneLossPct } from '../../src/models/bone.ts';
import { VO2_PREFLIGHT, vo2DeficitPct, vo2max } from '../../src/models/aerobic.ts';
import { DAY_SOL0 } from '../../src/sim/persona.ts';

const close = (a: number, b: number, tol = 0.005) => expect(Math.abs(a - b)).toBeLessThanOrEqual(tol);

describe('bone — tests d\'or (roadmap §7)', () => {
  it('hanche : 1,99 % à J94', () => close(boneLossPct('hanche', 94), 1.99));
  it('hanche : 8,70 % à J860 au rythme actuel', () => close(boneLossPct('hanche', 860, 0), 8.70));
  it('hanche : 4,22 % à J860 avec le plan', () => close(boneLossPct('hanche', 860, 1), 4.22));
  it('le plan ne change pas le passé', () => close(boneLossPct('hanche', 50, 1), boneLossPct('hanche', 50, 0)));
  it('perte croissante', () => expect(boneLossPct('hanche', 200)).toBeGreaterThan(boneLossPct('hanche', 100)));
});

describe('aerobic — tests d\'or (roadmap §7)', () => {
  it('déficit 10,84 % à J94', () => close(vo2DeficitPct(94), 10.84));
  it('Sol 0 au rythme actuel : 36,5', () => close(vo2max(DAY_SOL0, 0), 36.5));
  it('Sol 0 avec le plan : 37,3', () => close(vo2max(DAY_SOL0, 1), 37.3));
  it('J0 = pré-vol', () => close(vo2max(0), VO2_PREFLIGHT));
});
