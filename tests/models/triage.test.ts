import { describe, expect, it } from 'vitest';
import { checkInLevel, triage } from '../../src/models/triage.ts';
import { GROUND_PROCESSING_MIN, router } from '../../src/models/router.ts';
import { alertsForDay } from '../../src/models/alerts.ts';
import { moodSignals } from '../../src/models/ml/index.ts';
import type { CheckIn, Level, LinkPos, TriageResult } from '../../src/types.ts';

const ci = (p: Partial<CheckIn>): CheckIn => ({ day: 94, mood: 4, fatigue: 2, pain: 0, sleepFelt: 4, source: 'manual', ...p });
const LEVELS: Level[] = ['VERT', 'AMBRE', 'ORANGE', 'ROUGE', 'DONNEES_INSUFFISANTES'];
const POS: LinkPos[] = ['ISS', 'Lune', 'MarsProche', 'MarsScenario', 'Conjonction'];

describe('triage — check-in du matin (règles R13)', () => {
  it('douleur 3 → ROUGE, douleur 2 → ORANGE, douleur ≤ 1 → rien', () => {
    expect(checkInLevel(ci({ pain: 3 })).level).toBe('ROUGE');
    expect(checkInLevel(ci({ pain: 2 })).level).toBe('ORANGE');
    expect(checkInLevel(ci({ pain: 1 })).level).toBe('VERT');
    expect(checkInLevel(ci({ pain: 2, painZone: 'paravertebraux' })).reasons[0]).toMatch(/lower back.*CMO/);
  });
  it('humeur ≤ 2 ET fatigue ≥ 4 → ORANGE ; l\'un sans l\'autre → rien', () => {
    expect(checkInLevel(ci({ mood: 2, fatigue: 4 })).level).toBe('ORANGE');
    expect(checkInLevel(ci({ mood: 2, fatigue: 3 })).level).toBe('VERT');
    expect(checkInLevel(ci({ mood: 3, fatigue: 5 })).level).toBe('VERT');
  });
});

describe('triage — journée', () => {
  it('le niveau n\'est jamais moins grave que la pire alerte d\'organe', () => {
    const rank = (l: Level) => ['VERT', 'DONNEES_INSUFFISANTES', 'AMBRE', 'ORANGE', 'ROUGE'].indexOf(l);
    for (const d of [0, 20, 50, 80, 94, 150, 210, 500, 860]) {
      const worstAlert = Math.max(0, ...alertsForDay(d).map(a => rank(a.level)));
      expect(rank(triage(d).level)).toBeGreaterThanOrEqual(worstAlert);
    }
  });
  it('le signal d\'humeur (modèle C) propose un point psy sans changer le niveau', () => {
    const first = moodSignals().find(s => s.alert)!.day;
    const t = triage(first);
    expect(t.reasons.some(r => /model C/.test(r))).toBe(true);
    expect(t.groundRoutine.some(g => /psych session/.test(g))).toBe(true);
    expect(triage(first - 10).reasons.some(r => /model C/.test(r))).toBe(false);
  });
  it('les jours projetés n\'attendent pas de check-in', () => {
    expect(triage(300).reasons.some(r => /Projection D300/.test(r))).toBe(true);
    expect(triage(300).reasons.some(r => /missing/.test(r))).toBe(false);
  });
  it('copie défensive : modifier le résultat ne change pas le suivant', () => {
    const t = triage(94);
    t.reasons.length = 0;
    expect(triage(94).reasons.length).toBeGreaterThan(0);
  });
});

describe('router — invariance de MAINTENANT', () => {
  it('pour chaque niveau, MAINTENANT est identique quels que soient la position et le délai', () => {
    for (const level of LEVELS) {
      const t: TriageResult = { level, reasons: [], groundRoutine: [] };
      const ref = router(t, 'ISS', 0).maintenant;
      for (const pos of POS) for (const d of [0, 0.02, 1.3, 11.01, 22, NaN, -1]) {
        expect(router(t, pos, d).maintenant).toBe(ref);
      }
    }
  });
  it('ENSUITE : sol avec le délai aller-retour, CMO sans lien, moi si rien à décider', () => {
    const amber: TriageResult = { level: 'AMBRE', reasons: [], groundRoutine: [] };
    expect(router(amber, 'MarsProche', 3).ensuite).toMatchObject({ decideur: 'sol', reponseMin: 6 + GROUND_PROCESSING_MIN });
    expect(router(amber, 'Conjonction', 3).ensuite.decideur).toBe('CMO');
    expect(router(amber, 'MarsScenario', NaN).ensuite.decideur).toBe('CMO');
    expect(router({ ...amber, level: 'ORANGE' }, 'Lune', 0.02).ensuite.decideur).toBe('sol');
    expect(router({ ...amber, level: 'ROUGE' }, 'ISS', 0).ensuite.decideur).toBe('CMO');
    expect(router({ ...amber, level: 'DONNEES_INSUFFISANTES' }, 'ISS', 0).ensuite.decideur).toBe('moi');
  });
});
