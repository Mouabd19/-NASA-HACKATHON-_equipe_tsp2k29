// Tests de contrat du bootstrap : les chiffres factices (ROADMAP §7 « Mocks », §8) et la forme des retours.
// Quand un stub est remplacé par la vraie implémentation, ces tests doivent rester verts (ou être
// remplacés par les tests d'or du propriétaire, dans tests/models/).
import { describe, expect, it } from 'vitest';
import { getBloodTests, getCheckIn, getDayBody, getDayBodyPlan, getDays, getWatchSeries } from '../src/sim/load';
import { bioAgeSeries } from '../src/models/bioAge';
import { colorWithBand } from '../src/models/band';
import { vo2DeficitAt, vo2maxAt } from '../src/models/aerobic';
import { boneLossPct } from '../src/models/bone';
import { cumulativeDoseMSv } from '../src/models/radiation';
import { phenoAge } from '../src/models/phenoAge';
import { hasBioAgeModel } from '../src/models/bioAge';
import { lightTimeSource } from '../src/content/horizons';
import { trend7d } from '../src/models/trend';
import { alertsForDay } from '../src/models/alerts';
import { triage } from '../src/models/triage';
import { router } from '../src/models/router';
import { planDay } from '../src/models/planDay';
import { explain } from '../src/models/explain';
import { getSummary } from '../src/content/summaries';
import { getStandard } from '../src/content/standards';
import { lightTimeMin } from '../src/content/horizons';
import { getExercise, getMeal, whyText } from '../src/content/library';
// Les modules d'ingestion réels (Ahmed) lisent un vrai fichier et parlent à /api : on teste ici les mocks qu'ils remplacent.
import {
  mockBaseline30d as baseline30d, mockLatestLive as latestLive, mockParseHealthExport as parseHealthExport,
  mockPullDone as pullDone, mockPushTodo as pushTodo,
} from '../src/mocks';
import { saveCheckIn, todayCheckIn } from '../src/ingest/checkin';
import { CHRONO_AGE_J0, DAY_END, DAY_SOL0, DAY_TODAY, MISSION_START_DATE } from '../src/mocks/mission';
import type { Color, LayerId, Measurement, OrganState } from '../src/types';

const ORGANS = ['hanche', 'rachis', 'femur', 'cuisse', 'mollet', 'paravertebraux', 'coeur', 'reins', 'poumons', 'foie', 'cerveau', 'sang', 'yeux', 'dose'];
const UNMODELLED = ['poumons', 'foie', 'cerveau'];
const COLORS: Color[] = ['green', 'amber', 'red', 'grey'];
const LAYERS: LayerId[] = ['squelette', 'muscles', 'organes', 'cardio', 'nerveux', 'exposition'];
const organ = (day: number, id: string): OrganState => getDayBody(day).organs.find((o) => o.id === id)!;
const metric = (day: number, id: string, key: string) => organ(day, id).metrics.find((m) => m.key === key)!;

describe('mission', () => {
  it('aujourd’hui = J94 = 2026-11-14, Haddad 42 ans', () => {
    expect(DAY_TODAY).toBe(94);
    expect(MISSION_START_DATE).toBe('2026-08-12');
    expect(getDayBody(0).date).toBe('2026-08-12');
    expect(getDayBody(94).date).toBe('2026-11-14');
    expect(CHRONO_AGE_J0).toBe(42);
    expect(DAY_SOL0).toBeGreaterThan(DAY_TODAY);
    expect(DAY_END).toBe(860);
  });
});

describe('sim/load', () => {
  it('getDays : 95 jours mesurés, 0..94', () => {
    const d = getDays();
    expect(d).toHaveLength(95);
    expect(d[0]).toBe(0);
    expect(d[94]).toBe(94);
  });

  it('getDayBody : forme, 14 organes, calques', () => {
    for (const day of [0, 1, 47, 94, 95, DAY_SOL0, 500, 860]) {
      const b = getDayBody(day);
      expect(b.day).toBe(day);
      expect(b.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(b.organs.map((o) => o.id).sort()).toEqual([...ORGANS].sort());
      for (const o of b.organs) {
        expect(COLORS).toContain(o.status);
        expect(LAYERS).toContain(o.layer);
        expect(o.bioAgeTag).toBe('H');
        expect(o.chronoAge).toBeCloseTo(42 + day / 365.25, 1);
        for (const m of o.metrics) {
          expect(Number.isFinite(m.value)).toBe(true);
          expect(COLORS).toContain(m.color);
          expect(['NASA', 'Publié', 'H', 'Persona']).toContain(m.tag);
          expect(['RÉEL', 'SIMULÉ', 'H']).toContain(m.provenance);
          expect(m.label.length).toBeGreaterThan(0);
        }
      }
    }
    const layerOf = (id: string) => organ(94, id).layer;
    expect(['hanche', 'rachis', 'femur'].map(layerOf)).toEqual(['squelette', 'squelette', 'squelette']);
    expect(['cuisse', 'mollet', 'paravertebraux'].map(layerOf)).toEqual(['muscles', 'muscles', 'muscles']);
    expect(['coeur', 'reins', 'poumons', 'foie', 'cerveau'].map(layerOf)).toEqual(Array(5).fill('organes'));
    expect(layerOf('sang')).toBe('cardio');
    expect(layerOf('yeux')).toBe('nerveux');
    expect(layerOf('dose')).toBe('exposition');
  });

  it('mesuré jusqu’à J94, projeté au-delà', () => {
    expect(getDayBody(94).projected).toBe(false);
    expect(getDayBody(94).source).toBe('scan-midjourney-sim');
    expect(getDayBody(95).projected).toBe(true);
    expect(getDayBody(95).source).toBe('projection');
    expect(getDayBody(860).projected).toBe(true);
  });

  it('mémoïsé (même objet) et borné', () => {
    expect(getDayBody(300)).toBe(getDayBody(300));
    expect(getDayBody(-5).day).toBe(0);
    expect(getDayBody(9999).day).toBe(860);
    expect(getDayBody(93.6).day).toBe(94);
  });

  it('jamais vert quand la donnée manque : organes non modélisés en gris, sans métrique', () => {
    for (const day of [0, 94, 400, 860]) {
      for (const id of UNMODELLED) {
        const o = organ(day, id);
        expect(o.status).toBe('grey');
        expect(o.metrics).toEqual([]);
        expect(o.name).toMatch(/not modeled/);
        expect(o.bioAge).toBe(o.chronoAge);
      }
    }
  });

  it('hanche : perte 1,99 % à J94, 8,70 % à J860 (rythme) / 4,22 % (plan)', () => {
    expect(metric(94, 'hanche', 'perte_osseuse').value).toBe(1.99);
    expect(metric(94, 'hanche', 'densite_osseuse').value).toBe(98.01);
    expect(metric(860, 'hanche', 'perte_osseuse').value).toBe(8.7);
    expect(boneLossPct('hanche', 94)).toBeCloseTo(1.99, 6);
    expect(boneLossPct('hanche', 860, 0)).toBeCloseTo(8.7, 6);
    expect(boneLossPct('hanche', 860, 1)).toBeCloseTo(4.22, 6);
    expect(getDayBodyPlan(860, 1).organs.find((o) => o.id === 'hanche')!.metrics.find((m) => m.key === 'perte_osseuse')!.value).toBe(4.22);
    // les deux rythmes ne divergent qu'après J94
    for (const d of [0, 30, 94]) expect(boneLossPct('hanche', d, 1)).toBe(boneLossPct('hanche', d, 0));
    expect(boneLossPct('hanche', 95, 1)).toBeLessThan(boneLossPct('hanche', 95, 0));
  });

  it('hanche : densité ESTIMÉE [H], norme V1 4027 ≥ 95 % (col du fémur ≥ 90 %), jamais attribuée au scanner', () => {
    const m = metric(94, 'hanche', 'densite_osseuse');
    expect(m.tag).toBe('H');
    expect(m.provenance).toBe('H');
    expect(m.ref).toMatchObject({ low: 95, standardId: 'V1 4027' });
    expect(metric(94, 'femur', 'densite_osseuse').ref).toMatchObject({ low: 90, standardId: 'V1 4027' });
  });

  it('hanche : ambre à J94, rouge quand la densité estimée passe sous 95 % en projection', () => {
    expect(organ(94, 'hanche').status).toBe('amber');
    expect(organ(0, 'hanche').status).toBe('green');
    let firstRed = -1;
    for (let d = 95; d <= 860 && firstRed < 0; d++) if (organ(d, 'hanche').status === 'red') firstRed = d;
    expect(firstRed).toBeGreaterThan(94);
    expect(metric(firstRed, 'hanche', 'densite_osseuse').value).toBeLessThan(95);
    expect(metric(firstRed - 1, 'hanche', 'densite_osseuse').value).toBeGreaterThanOrEqual(95);
    expect(organ(860, 'hanche').status).toBe('red');
    // avec le plan : 4,22 % < 5 % → jamais rouge
    expect(getDayBodyPlan(860, 1).organs.find((o) => o.id === 'hanche')!.status).not.toBe('red');
  });

  it('VO₂max : déficit 10,84 % à J94 ; Sol 0 : 36,5 (rythme) / 37,3 (plan)', () => {
    expect(vo2DeficitAt(94)).toBeCloseTo(10.84, 6);
    expect(100 - metric(94, 'coeur', 'vo2_pct').value).toBeCloseTo(10.84, 2);
    expect(vo2maxAt(DAY_SOL0, 0)).toBeCloseTo(36.5, 6);
    expect(vo2maxAt(DAY_SOL0, 1)).toBeCloseTo(37.3, 6);
    expect(metric(DAY_SOL0, 'coeur', 'vo2max').value).toBe(36.5);
    expect(metric(DAY_SOL0, 'sang', 'vo2max').value).toBe(36.5);
    expect(metric(94, 'coeur', 'vo2max').ref).toMatchObject({ low: 36.5, standardId: 'V1 4002' });
    expect(metric(94, 'coeur', 'vo2_pct').ref).toMatchObject({ low: 80, standardId: 'V1 4003' });
    expect(organ(94, 'coeur').status).toBe('amber');
    expect(organ(DAY_SOL0, 'coeur').status).toBe('amber'); // à la limite, pas sous le seuil
  });

  it('muscles : volume au scan avec bruit et tendance 7 j ; cuisse ambre à J94', () => {
    for (const id of ['cuisse', 'mollet', 'paravertebraux']) {
      const m = metric(94, id, 'volume');
      expect(m.noise).toBeGreaterThan(0);
      expect(typeof m.trend7d).toBe('number');
      expect(m.value).toBeLessThan(100);
      expect(m.provenance).toBe('SIMULÉ');
    }
    expect(organ(94, 'cuisse').status).toBe('amber');
    // Mouad : pente du modèle calé sur 6 % de perte à J94 ≈ −0,39 %/sem (le mock disait −0,8)
    expect(metric(94, 'cuisse', 'volume').trend7d!).toBeLessThan(-0.2);
  });

  it('autres organes à J94', () => {
    expect(metric(94, 'reins', 'calculs').value).toBe(0);
    expect(metric(94, 'reins', 'calcium_urinaire').value).toBeGreaterThan(metric(0, 'reins', 'calcium_urinaire').value);
    expect(organ(94, 'yeux').status).toBe('amber');
    expect(metric(94, 'yeux', 'gaine_nerf_optique').value).toBeGreaterThan(metric(0, 'yeux', 'gaine_nerf_optique').value);
    const spo2 = metric(94, 'sang', 'spo2').value;
    expect(spo2).toBeGreaterThanOrEqual(97);
    expect(spo2).toBeLessThanOrEqual(99);
    expect(metric(94, 'sang', 'hemoglobine').value).toBeLessThan(metric(0, 'sang', 'hemoglobine').value);
    for (const k of ['fc_repos', 'tension_sys', 'volume_jambes']) expect(metric(94, 'sang', k)).toBeDefined();
    expect(metric(94, 'dose', 'dose_cumulee').value).toBeCloseTo(1.84 * 94, 1);
    expect(metric(94, 'dose', 'dose_jour').tag).toBe('Publié');
    for (const k of ['fraction_ejection', 'taille']) expect(metric(94, 'coeur', k)).toBeDefined();
  });

  // Mouad : vitesse de vieillissement osseux sourcée 0,5 %/an (MINOS, Steve) au lieu de 1 %/an → écarts × 2
  it('écart d’âge [H] : hanche +4,0 ans à J94, +17,4 à J860', () => {
    const h = organ(94, 'hanche');
    expect(h.bioAge - h.chronoAge).toBeCloseTo(3.98, 1);
    const e = organ(860, 'hanche');
    expect(e.bioAge - e.chronoAge).toBeCloseTo(17.4, 1);
  });

  it('analyses : capillaire hebdo (J0..J91) + calcium urinaire quotidien', () => {
    const all = getBloodTests();
    expect(all.length).toBeGreaterThan(0);
    const weekly = ['hemoglobine', 'hematocrite', 'leucocytes', 'lymphocytes_pct', 'vgm', 'idr', 'crp', 'calcium', 'vitamine_d', 'creatinine', 'albumine', 'phosphatases_alcalines', 'glucose', 'cortisol'];
    for (const a of weekly) {
      const s = getBloodTests(a);
      expect(s.map((b) => b.day)).toEqual(Array.from({ length: 14 }, (_, i) => i * 7));
      for (const b of s) {
        expect(b.unit.length).toBeGreaterThan(0);
        expect(b.refLow).toBeLessThan(b.refHigh);
        expect(Number.isFinite(b.value)).toBe(true);
      }
    }
    const urine = getBloodTests('calcium_urinaire');
    expect(urine).toHaveLength(95);
    expect(urine[94].value).toBeGreaterThan(urine[0].value);
    const hb = getBloodTests('hemoglobine');
    expect(hb[hb.length - 1].value).toBeLessThan(hb[0].value);
    expect(getBloodTests('inconnu')).toEqual([]);
  });

  it('montre : séries quotidiennes simulées J0..J94, SpO₂ 97–99', () => {
    const types: Measurement['type'][] = ['RestingHeartRate', 'HeartRateVariabilitySDNN', 'VO2Max', 'OxygenSaturation', 'AppleSleepingWristTemperature', 'SleepAnalysis'];
    for (const t of types) {
      const s = getWatchSeries(t);
      expect(s).toHaveLength(95);
      expect(s[0].date.slice(0, 10)).toBe('2026-08-12');
      expect(s[94].date.slice(0, 10)).toBe('2026-11-14');
      for (const m of s) {
        expect(m.type).toBe(t);
        expect(m.source).toBe('simulated');
        expect(Number.isFinite(m.value)).toBe(true);
      }
    }
    for (const m of getWatchSeries('OxygenSaturation')) {
      expect(m.value).toBeGreaterThanOrEqual(97);
      expect(m.value).toBeLessThanOrEqual(99);
    }
  });

  it('check-in J94 : humeur 3, fatigue 3, douleur 1 (bas du dos), simulé', () => {
    expect(getCheckIn(94)).toMatchObject({ day: 94, mood: 3, fatigue: 3, pain: 1, painZone: 'paravertebraux', source: 'simulated' });
    expect(getCheckIn(10)).not.toBeNull();
    expect(getCheckIn(95)).toBeNull();
  });
});

describe('models', () => {
  it('bioAgeSeries : mesuré J0..J94, prédit jusqu’à J860, bande qui s’élargit', () => {
    const cur = bioAgeSeries('hanche', 0);
    const plan = bioAgeSeries('hanche', 1);
    const measured = cur.filter((p) => !p.predicted);
    expect(measured.map((p) => p.day)).toEqual(Array.from({ length: 95 }, (_, i) => i));
    const predicted = cur.filter((p) => p.predicted);
    expect(predicted[0].day).toBe(95);
    expect(predicted.at(-1)!.day).toBe(860);
    expect(predicted.some((p) => p.day === DAY_SOL0)).toBe(true);
    for (let i = 1; i < cur.length; i++) expect(cur[i].day).toBeGreaterThan(cur[i - 1].day);
    const at = (s: typeof cur, d: number) => s.find((p) => p.day === d)!;
    const chrono = (d: number) => 42 + d / 365.25;
    // Mouad : 0,5 %/an pour l'os (sourcé) → perte / 0,5
    expect(at(cur, 94).bioAge - chrono(94)).toBeCloseTo(3.98, 1);
    expect(at(cur, 860).bioAge - chrono(860)).toBeCloseTo(17.4, 1);
    expect(at(plan, 860).bioAge - chrono(860)).toBeCloseTo(8.44, 1);
    expect(at(plan, 94).bioAge).toBe(at(cur, 94).bioAge);
    const w = (p: (typeof cur)[number]) => p.band![1] - p.band![0];
    expect(w(at(cur, 860))).toBeGreaterThan(w(at(cur, DAY_SOL0)));
    expect(w(at(cur, DAY_SOL0))).toBeGreaterThan(w(at(cur, 94)));
    for (const p of cur) {
      expect(p.band![0]).toBeLessThanOrEqual(p.bioAge);
      expect(p.band![1]).toBeGreaterThanOrEqual(p.bioAge);
    }
    // organe non modélisé : bioAge = âge réel
    for (const p of bioAgeSeries('foie', 0)) expect(p.bioAge).toBeCloseTo(chrono(p.day), 2);
  });

  it('phenoAge : 43,1 ans à J91 pour 42 ans réels, dernier prélèvement ≤ jour', () => {
    const p = phenoAge(94)!;
    expect(p.day).toBe(91);
    expect(p.phenoAge).toBe(43.1);
    expect(Math.floor(p.chronoAge)).toBe(42);
    expect(p.tag).toBe('Publié');
    for (const k of ['albumine', 'creatinine', 'glucose', 'crp', 'lymphocytes_pct', 'vgm', 'idr', 'phosphatases_alcalines', 'leucocytes']) {
      expect(Number.isFinite(p.inputs[k])).toBe(true);
    }
    expect(phenoAge(90)!.day).toBe(84);
    expect(phenoAge(0)!.day).toBe(0);
    expect(phenoAge(500)!.day).toBe(91);
    expect(phenoAge(-1)).toBeNull();
  });

  it('trend7d', () => {
    expect(trend7d('cuisse', 'volume', 94)!).toBeLessThan(0);
    expect(trend7d('cuisse', 'volume', 94)).toBe(metric(94, 'cuisse', 'volume').trend7d);
    expect(trend7d('cuisse', 'volume', 0)).toBeNull();
    expect(trend7d('foie', 'volume', 94)).toBeNull();
    expect(trend7d('cuisse', 'inconnu', 94)).toBeNull();
  });

  it('alertes J94 : hanche, cuisse, cœur/VO₂, nerf optique — toutes AMBRE', () => {
    const a = alertsForDay(94);
    expect(a.map((x) => x.organId).sort()).toEqual(['coeur', 'cuisse', 'hanche', 'yeux']);
    for (const x of a) expect(x.level).toBe('AMBRE');
    const hanche = a.find((x) => x.organId === 'hanche')!;
    expect(hanche.rule).toBe('V1 4027');
    expect(hanche.message).toMatch(/D860/);
    expect(hanche.message).toMatch(/RED/);
    const coeur = a.find((x) => x.organId === 'coeur')!;
    expect(coeur.rule).toBe('V1 4003');
    expect(coeur.message).toMatch(/36\.5/);
    expect(a.find((x) => x.organId === 'cuisse')!.message).toMatch(/7-day trend/);
    expect(new Set(a.map((x) => x.id)).size).toBe(a.length);
  });

  it('alertes : rien en début de mission, hanche ROUGE en fin de mission, cohérentes avec les statuts', () => {
    for (let d = 0; d <= 20; d++) expect(alertsForDay(d)).toEqual([]);
    expect(alertsForDay(860).find((x) => x.organId === 'hanche')!.level).toBe('ROUGE');
    for (const d of [0, 50, 94, 150, DAY_SOL0, 600, 860]) {
      const b = getDayBody(d);
      for (const al of alertsForDay(d)) {
        const o = b.organs.find((x) => x.id === al.organId)!;
        expect(['amber', 'red']).toContain(o.status);
      }
      // aucun organe gris ne déclenche d'alerte ; aucun organe ambre/rouge (hors sang) ne reste sans alerte
      for (const o of b.organs) {
        if (o.id !== 'sang' && (o.status === 'amber' || o.status === 'red')) {
          expect(alertsForDay(d).some((x) => x.organId === o.id)).toBe(true);
        }
      }
    }
  });

  it('triage + router : MAINTENANT ne dépend jamais du lien Terre', () => {
    const t = triage(94);
    expect(t.level).toBe('AMBRE');
    expect(t.reasons.length).toBeGreaterThanOrEqual(4);
    expect(t.groundRoutine.length).toBeGreaterThan(0);
    expect(triage(5).level).toBe('VERT');
    expect(triage(860).level).toBe('ROUGE');
    const ref = router(t, 'MarsScenario', 11.01);
    for (const pos of ['ISS', 'Lune', 'MarsProche', 'MarsScenario', 'Conjonction'] as const) {
      for (const delay of [0, 1.3, 11.01, 22]) expect(router(t, pos, delay).maintenant).toBe(ref.maintenant);
    }
    expect(ref.ensuite.decideur).toBe('sol');
    expect(ref.ensuite.reponseMin).toBe(52);
    expect(router(t, 'Conjonction', 22).ensuite.decideur).toBe('CMO');
    expect(router(triage(860), 'MarsScenario', 11).ensuite.decideur).toBe('CMO');
    expect(router(triage(5), 'MarsScenario', 11).ensuite.decideur).toBe('moi');
  });

  it('planDay(94) : ~8 items, 4 familles, chacun avec un raisonnement en 4 maillons', () => {
    const items = planDay(94);
    expect(items.length).toBeGreaterThanOrEqual(7);
    expect(items.length).toBeLessThanOrEqual(10);
    expect(new Set(items.map((i) => i.kind))).toEqual(new Set(['exercice', 'repas', 'test', 'medical']));
    expect(new Set(items.map((i) => i.id)).size).toBe(items.length);
    for (const i of items) {
      expect(i.done).toBe(false);
      expect([1, 2, 3]).toContain(i.priority);
      const r = explain(i.reasoningId);
      expect(r.id).toBe(i.reasoningId);
      expect(r.steps.map((s) => s.kind)).toEqual(['donnee', 'modele', 'norme', 'decision']);
      expect(r.steps.some((s) => s.source)).toBe(true);
      for (const s of r.steps) expect(s.text.length).toBeGreaterThan(10);
    }
    // copie défensive : cocher un item ne modifie pas le plan
    items[0].done = true;
    expect(planDay(94)[0].done).toBe(false);
    expect(planDay(5).length).toBeGreaterThan(0);
    expect(planDay(860)[0].kind).toBe('medical');
    const hanche = explain('r-hanche-ared');
    expect(hanche.steps[2].text).toMatch(/V1 4027/);
    expect(hanche.steps[2].tag).toBe('NASA');
    expect(hanche.steps[2].source?.url).toMatch(/nasa-std-3001/);
    expect(explain('inconnu').steps).toHaveLength(4);
  });

  it('colorWithBand', () => {
    expect(colorWithBand(98, [97.5, 98.5], { amber: 97, red: 95 })).toEqual({ color: 'green', worst: 'green' });
    expect(colorWithBand(97.2, [96.5, 97.9], { amber: 97, red: 95 })).toEqual({ color: 'green', worst: 'amber' });
    expect(colorWithBand(94, [93, 96], { amber: 97, red: 95 })).toEqual({ color: 'red', worst: 'red' });
    expect(colorWithBand(5.4, [5.3, 5.6], { amber: 5.5, red: 6 })).toEqual({ color: 'green', worst: 'amber' });
    expect(colorWithBand(NaN, [NaN, NaN], { amber: 97, red: 95 }).color).toBe('grey');
  });

  it('dose : 1,84 mSv/j en croisière', () => {
    expect(cumulativeDoseMSv(94)).toBeCloseTo(172.96, 2);
  });
});

describe('content', () => {
  it('délai radio : 11,01 min le 2026-11-14', () => {
    // horizons.json (Steve) : 11,016 min tant que fetch-horizons (JPL) n'a pas tourné — même valeur à 0,01 près
    expect(lightTimeMin('2026-11-14')).toBeCloseTo(11.01, 1);
    expect(lightTimeMin('2026-11-14T08:00:00Z')).toBeCloseTo(11.01, 1);
    const other = lightTimeMin('2027-06-01');
    expect(other).toBeGreaterThan(3);
    expect(other).toBeLessThan(23);
  });

  it('normes V1 4027 / 4003 / 4002 : vérifiées sur le PDF NASA-STD-3001 (Steve), lien vers le PDF', () => {
    for (const id of ['V1 4027', 'V1 4003', 'V1 4002']) {
      const s = getStandard(id);
      expect(s.id).toBe(id);
      expect(s.verified).toBe(true);
      expect(s.url).toMatch(/^https:\/\/standards\.nasa\.gov\/.*nasa-std-3001-vol-1-rev-c/);
      expect(s.title.length).toBeGreaterThan(0);
      expect(s.quote.length).toBeGreaterThan(0);
    }
    expect(getStandard('XX 0000').verified).toBe(false);
  });

  it('synthèses : jour clé le plus proche, organes modélisés seulement', () => {
    const modelled = ORGANS.filter((o) => !UNMODELLED.includes(o));
    for (const id of modelled) {
      for (const d of [0, 30, 60, 94, DAY_SOL0, 860]) {
        const s = getSummary(id, d)!;
        expect(s.day).toBe(d);
        expect(s.organId).toBe(id);
        expect(s.generatedBy).toBe('IA-sol');
        expect(s.reviewed).toBe(false);
        const sentences = s.text.split(/(?<=[.!?])\s+(?=[A-ZÀ-ÝŒ])/).length;
        expect(sentences).toBeGreaterThanOrEqual(3);
        expect(s.text).not.toMatch(/NaN|undefined/);
      }
    }
    expect(getSummary('hanche', 90)!.day).toBe(94);
    expect(getSummary('hanche', 40)!.day).toBe(30);
    expect(getSummary('hanche', 700)!.day).toBe(860);
    expect(getSummary('hanche', 94)!.text).toMatch(/1\.99/);
    for (const id of UNMODELLED) expect(getSummary(id, 94)).toBeNull();
    expect(getSummary('inconnu', 94)).toBeNull();
  });

  it('bibliothèque', () => {
    expect(getExercise('ared-squat')?.title).toMatch(/ARED/);
    expect(getMeal('menu-calcium-vitd')?.calciumMg).toBeGreaterThan(0);
    expect(getExercise('inconnu')).toBeNull();
    expect(whyText('V1 4027').length).toBeGreaterThan(20);
    expect(whyText('inconnu').length).toBeGreaterThan(0);
  });
});

describe('ingest (mocks en mémoire, sans réseau)', () => {
  it('parseHealthExport + baseline30d + latestLive', async () => {
    const pct: number[] = [];
    const ms = await parseHealthExport({} as File, (p) => pct.push(p));
    expect(pct.at(-1)).toBe(100);
    expect(ms.length).toBeGreaterThan(95);
    const b = baseline30d(ms, 'OxygenSaturation');
    expect(b.n).toBe(30);
    expect(b.mean).toBeGreaterThanOrEqual(97);
    expect(b.mean).toBeLessThanOrEqual(99);
    expect(b.sd).toBeGreaterThan(0);
    expect(baseline30d([], 'HeartRate').n).toBe(0);
    const live = await latestLive('OxygenSaturation');
    expect(live?.source).toBe('simulated');
  });

  it('todoSync', async () => {
    const items = planDay(94);
    items[1].done = true;
    await pushTodo(items);
    expect(await pullDone()).toEqual([items[1].id]);
  });

  it('checkin : le check-in saisi remplace le simulé du jour', () => {
    expect(todayCheckIn()).toBeNull();
    saveCheckIn({ day: 94, mood: 4, fatigue: 2, pain: 0, sleepFelt: 4, source: 'manual' });
    expect(todayCheckIn()).toMatchObject({ mood: 4, source: 'manual' });
    expect(getCheckIn(94)).toMatchObject({ mood: 4, source: 'manual' });
  });
});

describe('honnêteté — ajouts hors contrat (revue du premier jet Body)', () => {
  it('phenoAge : vraie valeur calculée sur les prélèvements simulés (plus de mock)', () => {
    expect(phenoAge(94)!.mock).toBeFalsy();
  });
  it('hasBioAgeModel : seuls les organes avec un modèle de perte ont un écart d’âge', () => {
    for (const id of ['hanche', 'rachis', 'femur', 'cuisse', 'mollet', 'paravertebraux', 'coeur']) expect(hasBioAgeModel(id)).toBe(true);
    for (const id of ['reins', 'sang', 'yeux', 'dose', 'poumons', 'foie', 'cerveau']) expect(hasBioAgeModel(id)).toBe(false);
  });
  it('lightTimeSource : table sur toute la mission, approximation hors mission', () => {
    // horizons.json couvre toute la mission (J0 → J860) : hors de cette période, valeur bornée ('approx')
    expect(lightTimeSource('2026-11-14')).toBe('table');
    expect(lightTimeSource('2027-03-10')).toBe('table');
    expect(lightTimeSource('2030-01-01')).toBe('approx');
  });
  it('sang : le VO₂max (porté par le cœur) ne compte pas dans son statut ; autant d’organes ambre que d’alertes à J94', () => {
    const body = getDayBody(94);
    expect(body.organs.find((o) => o.id === 'sang')!.status).toBe('green');
    expect(body.organs.filter((o) => o.status === 'amber').length).toBe(alertsForDay(94).length);
  });
  it('perte osseuse cumulée et projection : pas de « tendance 7 j » (la pente est portée par la densité)', () => {
    const hip = getDayBody(94).organs.find((o) => o.id === 'hanche')!;
    expect(hip.metrics.find((m) => m.key === 'perte_osseuse')!.trend7d).toBeUndefined();
    expect(hip.metrics.find((m) => m.key === 'projection_j860')!.trend7d).toBeUndefined();
    expect(typeof hip.metrics.find((m) => m.key === 'densite_osseuse')!.trend7d).toBe('number');
  });
});

describe('scénario « avec le plan » — ajouts hors contrat (revue n° 2)', () => {
  it('alertsForDayPlan : identique avant J94, différent en projection', async () => {
    const { alertsForDay, alertsForDayPlan } = await import('../src/models/alerts');
    expect(alertsForDayPlan(94, 1)).toEqual(alertsForDay(94));
    expect(alertsForDayPlan(860, 0)).toEqual(alertsForDay(860));
    const pace = alertsForDayPlan(860, 0).find((a) => a.organId === 'hanche');
    const plan = alertsForDayPlan(860, 1).find((a) => a.organId === 'hanche');
    expect(pace?.level).toBe('ROUGE');
    expect(plan?.level).not.toBe('ROUGE');
    if (plan) expect(plan.message).not.toMatch(/at current pace/);
  });
  it('getSummaryPlan : le texte de projection nomme le bon scénario', async () => {
    const { getSummary, getSummaryPlan } = await import('../src/content/summaries');
    expect(getSummaryPlan('hanche', 94, 1)).toEqual(getSummary('hanche', 94));
    expect(getSummaryPlan('hanche', 860, 0)?.text).toMatch(/at current pace/);
    expect(getSummaryPlan('hanche', 860, 1)?.text).toMatch(/with the plan followed/);
    expect(getSummaryPlan('hanche', 860, 1)?.text).toMatch(/95\.78%/);
  });
});
