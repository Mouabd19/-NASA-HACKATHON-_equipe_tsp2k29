import { describe, expect, it } from 'vitest';
import { bloodAgeSeries, modelCards, moodSignals, organForecast } from '../../src/models/ml/index.ts';
import { boneLossPct } from '../../src/models/bone.ts';
import { vo2DeficitPct } from '../../src/models/aerobic.ts';
import { MOOD_EPISODE_ONSET } from '../../src/sim/generate.ts';

describe('modèles d\'IA entraînés (inférence hors ligne)', () => {
  it('trois fiches modèle, chacune avec données, méthode d\'apprentissage, métriques et limites', () => {
    const cards = modelCards();
    expect(cards.map(c => c.id).sort()).toEqual(['blood-age', 'mood-risk', 'organ-forecast']);
    for (const c of cards) {
      expect(c.learning).toMatch(/[Ss]upervised/);
      expect(c.data.length).toBeGreaterThan(20);
      expect(c.limits.length).toBeGreaterThan(0);
      expect(Object.keys(c.metrics).length).toBeGreaterThan(0);
    }
  });

  it('A — âge sanguin : un point par prélèvement, contributions qui somment à l\'écart', () => {
    const s = bloodAgeSeries();
    expect(s.map(p => p.day)).toEqual([0, 7, 14, 21, 28, 35, 42, 49, 56, 63, 70, 77, 84, 91]);
    for (const p of s) {
      expect(Number.isFinite(p.bloodAge)).toBe(true);
      expect(Math.abs(p.gap)).toBeLessThan(25);
      expect(p.contributions.length).toBe(13);
    }
    expect(s.at(-1)!.bloodAge).toBeGreaterThan(s[0].bloodAge);   // inflammation, glucose, PAL en hausse en vol
  });

  it('B — Haddad (astronaute « moyen ») : la médiane retrouve les modèles physiques, la bande les contient', () => {
    const hip = organForecast('hanche', 860, 0)!;
    expect(hip.p10).toBeLessThan(hip.p50);
    expect(hip.p50).toBeLessThan(hip.p90);
    expect(Math.abs(hip.p50 - boneLossPct('hanche', 860, 0))).toBeLessThan(1);
    expect(boneLossPct('hanche', 860, 0)).toBeGreaterThanOrEqual(hip.p10);
    expect(boneLossPct('hanche', 860, 0)).toBeLessThanOrEqual(hip.p90);
    const heart = organForecast('coeur', 210, 0)!;
    expect(Math.abs(heart.p50 - vo2DeficitPct(210, 0))).toBeLessThan(1);
    // le plan réduit toujours la perte projetée
    for (const o of ['hanche', 'cuisse', 'coeur'] as const) {
      expect(organForecast(o, 860, 1)!.p50).toBeLessThan(organForecast(o, 860, 0)!.p50);
    }
  });

  it('C — humeur : aucun signal avant le glissement injecté (J75), alerte dans les 3 semaines', () => {
    const m = moodSignals();
    expect(m[0].day).toBe(27);
    const first = m.find(s => s.alert)!;
    expect(first.day).toBeGreaterThan(MOOD_EPISODE_ONSET);
    expect(first.day - MOOD_EPISODE_ONSET).toBeLessThanOrEqual(21);
    expect(m.filter(s => s.day < MOOD_EPISODE_ONSET).every(s => !s.alert)).toBe(true);
    for (const s of m) expect(s.score).toBeGreaterThanOrEqual(0);
  });
});
