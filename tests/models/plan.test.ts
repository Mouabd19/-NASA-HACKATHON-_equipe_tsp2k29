import { afterEach, describe, expect, it } from 'vitest';
import { planDay } from '../../src/models/planDay.ts';
import { explain, reasoningTopics } from '../../src/models/explain.ts';
import { bloodAgeDays, realWatchCheck, triage } from '../../src/models/triage.ts';
import { getExercise, getMeal, getTest } from '../../src/content/library.ts';
import { setRealData } from '../../src/ingest/realData.ts';
import type { Measurement } from '../../src/types.ts';

describe('planDay — to-do tirée des alertes, contenus de Steve', () => {
  it('J94 : os, cœur, cuisse, nerf optique, humeur → bons items de la bibliothèque', () => {
    const ids = planDay(94).map(i => i.id);
    for (const id of ['ared-squat', 'ared-souleve-de-terre', 'menu-calcium-vitd', 'test-urine', 'test-vision', 'sol-routine', 'point-psy', 'test-checkin']) {
      expect(ids).toContain(id);
    }
    expect(ids.some(id => /intervalles/.test(id))).toBe(true);
    expect(planDay(94).filter(i => i.kind === 'repas').length).toBe(1);   // un seul menu par jour
  });
  it('chaque exercice / repas / test existe dans la bibliothèque (la montre coche par id)', () => {
    for (const d of [0, 5, 49, 83, 94, 210, 860]) {
      for (const i of planDay(d)) {
        if (i.kind === 'exercice') expect(getExercise(i.id), i.id).not.toBeNull();
        if (i.kind === 'repas') expect(getMeal(i.id), i.id).not.toBeNull();
        if (i.kind === 'test') expect(getTest(i.id), i.id).not.toBeNull();
      }
    }
  });
  it('jour sans alerte → entretien ; ROUGE → CMO en tête', () => {
    expect(planDay(5).some(i => i.reasoningId.startsWith('r-entretien'))).toBe(true);
    expect(planDay(860)[0].id).toBe('prevenir-cmo');
    expect(planDay(860)[0].priority).toBe(1);
  });
  it('le point psy n\'apparaît qu\'après le glissement d\'humeur (J75)', () => {
    for (let d = 28; d < 75; d++) expect(planDay(d).some(i => i.id === 'point-psy')).toBe(false);
    expect(planDay(94).find(i => i.id === 'point-psy')!.priority).toBe(3);   // proposé, jamais prioritaire
  });
});

describe('explain — donnée → modèle → norme → décision', () => {
  it('chaque sujet a 4 maillons dans l\'ordre, au moins une source, et marche sur toute la timeline', () => {
    for (const topic of reasoningTopics()) {
      for (const id of [topic, `${topic}@20`, `${topic}@860`]) {
        const r = explain(id);
        expect(r.id).toBe(id);
        expect(r.title).not.toBe('Raisonnement introuvable');
        expect(r.steps.map(s => s.kind)).toEqual(['donnee', 'modele', 'norme', 'decision']);
        expect(r.steps.some(s => s.source)).toBe(true);
        for (const s of r.steps) expect(s.text).not.toMatch(/undefined|NaN/);
      }
    }
  });
  it('les modèles d\'IA apparaissent dans les raisonnements (A, B, C)', () => {
    expect(explain('r-hanche-ared').steps[1].text).toMatch(/Modèle d'IA B.*J860/);
    expect(explain('r-vo2-intervalles').steps[1].text).toMatch(/Modèle d'IA B/);
    expect(explain('r-prelevement').steps[1].text).toMatch(/Modèle d'IA A/);
    expect(explain('r-psy').steps[1].text).toMatch(/Modèle d'IA C/);
  });
  it('un jour d\'une autre date porte son suffixe ; identifiant inconnu → 4 maillons « introuvable »', () => {
    expect(planDay(50).every(i => i.reasoningId.endsWith('@50'))).toBe(true);
    expect(explain('r-hanche-ared@9999').title).toBe('Raisonnement introuvable');
    expect(explain('inconnu').steps).toHaveLength(4);
  });
});

describe('cas limites + vraies données montre', () => {
  afterEach(() => setRealData([]));
  it('prélèvement : âge en jours depuis le dernier (hebdomadaire → jamais plus de 6 j en simulation)', () => {
    expect(bloodAgeDays(94)).toBe(3);
    expect(bloodAgeDays(91)).toBe(0);
    for (let d = 0; d <= 94; d++) expect(bloodAgeDays(d)).toBeLessThanOrEqual(6);
  });
  it('sans données réelles, la montre du présentateur ne change rien', () => {
    expect(realWatchCheck()).toBeNull();
  });
  it('FC au repos réelle à +3 écarts-types de SA référence → au moins AMBRE, étiqueté RÉEL', () => {
    const day = (i: number) => new Date(Date.UTC(2026, 9, 15 + i)).toISOString();
    const ms: Measurement[] = Array.from({ length: 30 }, (_, i) => ({
      type: 'RestingHeartRate', value: 60 + (i % 3) - 1, unit: 'bpm', date: day(i), source: 'apple-watch-export',
    }));
    ms.push({ type: 'RestingHeartRate', value: 75, unit: 'bpm', date: day(30), source: 'apple-watch-export' });
    setRealData(ms);
    const w = realWatchCheck()!;
    expect(w.level).toBe('AMBRE');
    expect(w.reason).toMatch(/RÉELLE.*75 bpm.*recontrôler/);
    expect(triage(94).reasons.some(r => /Montre RÉELLE/.test(r))).toBe(true);
  });
});
