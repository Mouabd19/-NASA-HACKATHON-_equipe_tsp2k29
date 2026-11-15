import { describe, expect, it } from 'vitest';
import type { TodoItem } from '../../src/types';
import { emptyState, handle, parseIngest, type ApiRequest } from '../../server/handlers';
import { planToday, receiveCheckIn, watchSummary, type WatchSummary } from '../../server/watchSummary';

const req = (method: string, path: string, body?: unknown, q = ''): ApiRequest =>
  ({ method, path, body, query: new URLSearchParams(q) });

const todo: TodoItem[] = [
  { id: 'ared-squat', kind: 'exercice', title: 'ARED — squat 4×8', detail: '', time: '07:30', done: false, reasoningId: 'r-hanche', priority: 2 },
  { id: 'med-cmo', kind: 'medical', title: 'Prévenir le CMO', detail: '', done: false, reasoningId: 'r-cmo', priority: 1 },
];

describe('API to-do', () => {
  it('GET vide puis POST (pushTodo) puis GET', () => {
    const s = emptyState();
    expect(handle(s, req('GET', '/api/todo')).json).toEqual([]);
    const r = handle(s, req('POST', '/api/todo', todo));
    expect(r).toMatchObject({ status: 200, changed: true });
    expect(handle(s, req('GET', '/api/todo')).json).toHaveLength(2);
  });

  it('coche un item, garde la coche si la War Room repousse la liste', () => {
    const s = emptyState();
    handle(s, req('POST', '/api/todo', todo));
    expect(handle(s, req('POST', '/api/todo/ared-squat/done'))).toMatchObject({ status: 200, json: { ok: true, id: 'ared-squat' } });
    handle(s, req('POST', '/api/todo', todo)); // repoussée avec done: false
    expect(s.todo.find((t) => t.id === 'ared-squat')!.done).toBe(true);
    handle(s, req('POST', '/api/todo/ared-squat/undo'));
    expect(s.todo.find((t) => t.id === 'ared-squat')!.done).toBe(false);
  });

  it('id inconnu → 404 ; corps invalide → 400', () => {
    const s = emptyState();
    expect(handle(s, req('POST', '/api/todo/nope/done')).status).toBe(404);
    expect(handle(s, req('POST', '/api/todo', { pas: 'un tableau' })).status).toBe(400);
  });

  it('menu montre : items non cochés, priorité 1 en tête, libellé → id', () => {
    const s = emptyState();
    handle(s, req('POST', '/api/todo', todo));
    handle(s, req('POST', '/api/todo/ared-squat/done'));
    expect(handle(s, req('GET', '/api/todo/menu')).json).toEqual({ 'Prévenir le CMO': 'med-cmo' });
  });
});

describe('API to-do — route du Raccourci montre', () => {
  it('coche par id ou par libellé du menu', () => {
    const s = emptyState();
    handle(s, req('POST', '/api/todo', todo));
    expect(handle(s, req('POST', '/api/todo/done', { item: '07:30 · ARED — squat 4×8' }))).toMatchObject({ status: 200, json: { id: 'ared-squat' } });
    expect(handle(s, req('POST', '/api/todo/done', { item: 'med-cmo' }))).toMatchObject({ status: 200, json: { id: 'med-cmo' } });
    expect(handle(s, req('POST', '/api/todo/done', { item: 'n\'existe pas' })).status).toBe(404);
    expect(s.todo.every((t) => t.done)).toBe(true);
  });
});

describe('API ingest', () => {
  it('POST /ingest puis GET /ingest/latest?type=', () => {
    const s = emptyState();
    expect(handle(s, req('GET', '/ingest/latest', undefined, 'type=HeartRate')).status).toBe(404);
    handle(s, req('POST', '/ingest', { type: 'HeartRate', value: 71, unit: 'count/min', date: '2026-11-15T07:00:00+01:00' }));
    handle(s, req('POST', '/ingest', { type: 'HeartRate', value: 74, unit: 'bpm', date: '2026-11-15T07:05:00+01:00' }));
    handle(s, req('POST', '/ingest', { type: 'OxygenSaturation', value: 0.98, date: '2026-11-15T07:06:00+01:00' }));
    expect(handle(s, req('GET', '/ingest/latest', undefined, 'type=HeartRate')).json).toMatchObject({ value: 74, unit: 'bpm', source: 'apple-watch-live' });
    expect(handle(s, req('GET', '/ingest/latest', undefined, 'type=OxygenSaturation')).json).toMatchObject({ value: 98, unit: '%' });
  });

  it('tolère ce qu\'envoie un Raccourci (texte, virgule, identifiant HealthKit, date absente)', () => {
    expect(parseIngest({ type: 'HKQuantityTypeIdentifierHeartRate', value: '72,5 BPM' })).toMatchObject({ type: 'HeartRate', value: 72.5, unit: 'bpm' });
  });

  it('refuse les valeurs aberrantes et les types inconnus', () => {
    expect(typeof parseIngest({ type: 'OxygenSaturation', value: 140 })).toBe('string');
    expect(typeof parseIngest({ type: 'HeartRate', value: 'abc' })).toBe('string');
    expect(typeof parseIngest({ type: 'StepCount', value: 3 })).toBe('string');
    const s = emptyState();
    expect(handle(s, req('POST', '/ingest', { type: 'HeartRate', value: 999 })).status).toBe(400);
  });
});

describe('Watch API: GET /api/watch/summary', () => {
  it('503 while the models are not loaded (the watch falls back to its snapshot)', () => {
    expect(handle(emptyState(), req('GET', '/api/watch/summary')).status).toBe(503);
  });

  it('J94 summary: triage, instructions, alerts, trip and provenance', () => {
    const r = handle(emptyState(), req('GET', '/api/watch/summary'), { watchSummary });
    expect(r.status).toBe(200);
    const j = r.json as WatchSummary;
    expect(j.provenance).toBe('SIMULÉ');
    expect(j.mission).toMatchObject({ day: 94, totalDays: 860, sol0Day: 210, daysToSol0: 116 });
    expect(j.mission.delayMin).toBeGreaterThan(5);
    expect(j.triage.color).toBe(j.triage.level === 'VERT' ? 'green' : j.triage.color);
    expect(j.now.text.length).toBeGreaterThan(10);
    expect(j.alerts.length).toBeGreaterThan(0);
    expect(j.alerts.every((a) => a.zone && a.finding)).toBe(true);
    expect(j.todo.source).toBe('plan');
    expect(j.live.heartRate).toBeNull();
  });

  it('uses the server ticks and the latest real pulse', () => {
    const s = emptyState();
    handle(s, req('POST', '/api/todo', todo));
    handle(s, req('POST', '/api/todo/ared-squat/done'));
    handle(s, req('POST', '/ingest', { type: 'HeartRate', value: 71, date: '2026-11-15T07:00:00Z' }));
    handle(s, req('POST', '/ingest', { type: 'HeartRate', value: 76, date: '2026-11-15T07:00:05Z' }));
    const j = handle(s, req('GET', '/api/watch/summary'), { watchSummary }).json as WatchSummary;
    expect(j.todo).toEqual({ total: 2, done: 1, source: 'serveur' });
    expect(j.live.heartRate).toMatchObject({ value: 76, provenance: 'RÉEL' });
  });

  it('?day= clamped to the mission, unreadable day refused', () => {
    const j = handle(emptyState(), req('GET', '/api/watch/summary', undefined, 'day=900'), { watchSummary }).json as WatchSummary;
    expect(j.mission.day).toBe(860);
    expect(handle(emptyState(), req('GET', '/api/watch/summary', undefined, 'day=abc'), { watchSummary }).status).toBe(400);
  });

  it('a check-in from the browser reaches the summary (pain lights up on the body), then clears', () => {
    const deps = { watchSummary, receiveCheckIn };
    const ci = { day: 94, mood: 3, fatigue: 3, sleepFelt: 3, pain: 2, painZones: ['rachis'], source: 'manual' };
    expect(handle(emptyState(), req('POST', '/api/checkin', ci), deps).status).toBe(200);
    let j = handle(emptyState(), req('GET', '/api/watch/summary'), deps).json as WatchSummary;
    expect(j.checkin.source).toBe('manual');
    expect(j.alerts[0]).toMatchObject({ organId: 'rachis', rule: 'CHECK-IN', zone: 'dos' });
    expect(handle(emptyState(), req('POST', '/api/checkin', { clear: true }), deps).status).toBe(200);
    j = handle(emptyState(), req('GET', '/api/watch/summary'), deps).json as WatchSummary;
    expect(j.checkin.source).not.toBe('manual');
    expect(handle(emptyState(), req('POST', '/api/checkin', { day: 94, pain: 9 }), deps).status).toBe(400);
  });
});

describe('To-do filled before the War Room opens (watch)', () => {
  it('empty GET /api/todo → plan of the day; the watch ticks; the War Room push keeps the tick', () => {
    const s = emptyState();
    const first = handle(s, req('GET', '/api/todo'), { planToday });
    expect(first.changed).toBe(true);
    const items = first.json as TodoItem[];
    expect(items.length).toBeGreaterThan(0);
    const id = items[0].id;
    expect(handle(s, req('POST', `/api/todo/${id}/done`)).status).toBe(200);
    handle(s, req('POST', '/api/todo', items.map((t) => ({ ...t, done: false }))));
    expect(s.todo.find((t) => t.id === id)!.done).toBe(true);
  });
});
