// Owner: Ahmed (B). The Vercel function (server/vercel/handler.ts) on a plain HTTP server, with the in-memory Redis.
import { createServer, type Server } from 'node:http';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import type { IncomingMessage } from 'node:http';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import type { TodoItem } from '../../src/types';
import { createVercelApi, readBody, type Models, type VercelApiOptions } from '../../server/vercel/handler';
import { KEYS, MemoryRedis } from '../../server/vercel/store';
import * as source from '../../server/vercel/models';
import type { WatchSummary } from '../../server/watchSummary';

const todo: TodoItem[] = [
  { id: 'ared-squat', kind: 'exercice', title: 'ARED — squat 4×8', detail: '', time: '07:30', done: false, reasoningId: 'r-hanche', priority: 2 },
  { id: 'med-cmo', kind: 'medical', title: 'Prévenir le CMO', detail: '', done: false, reasoningId: 'r-cmo', priority: 1 },
];
const loadModels = async () => source as unknown as Models;

const servers: Server[] = [];
async function start(opts: VercelApiOptions): Promise<string> {
  const api = createVercelApi({ loadModels, ...opts });
  const s = createServer((req, res) => void api(req, res));
  servers.push(s);
  await new Promise<void>((ok) => s.listen(0, '127.0.0.1', ok));
  const a = s.address();
  return `http://127.0.0.1:${typeof a === 'object' && a ? a.port : 0}`;
}
afterEach(async () => {
  await Promise.all(servers.splice(0).map((s) => new Promise((ok) => { s.closeAllConnections(); s.close(ok); })));
  source.clearCheckIn(94);
});

const post = (url: string, body: unknown) =>
  fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

describe('Vercel function: routing and HTTP contract', () => {
  it('routes direct paths and rewritten paths (?__p=), strips __p from the query', async () => {
    const base = await start({ redis: new MemoryRedis() });
    expect(await (await fetch(`${base}/api/health`)).json()).toEqual({ ok: true, todo: 0, live: 0 });
    expect((await post(`${base}/api/index?__p=/ingest`, { type: 'HeartRate', value: 71, date: '2026-11-15T07:00:00Z' })).status).toBe(200);
    const latest = await fetch(`${base}/api/index?__p=/ingest/latest&type=HeartRate`);
    expect(latest.status).toBe(200);
    expect(await latest.json()).toMatchObject({ type: 'HeartRate', value: 71, source: 'apple-watch-live' });
    expect((await fetch(`${base}/api/index?__p=/ingest/latest&type=OxygenSaturation`)).status).toBe(404);
    expect((await post(`${base}/api/index?__p=/api/todo`, todo)).status).toBe(200);
    const tick = await fetch(`${base}/api/index?__p=/api/todo/ared-squat/done`, { method: 'POST' });
    expect(await tick.json()).toEqual({ ok: true, id: 'ared-squat', title: 'ARED — squat 4×8', done: true });
    expect(await (await fetch(`${base}/api/todo/menu`)).json()).toEqual({ 'Prévenir le CMO': 'med-cmo' });
    expect((await fetch(`${base}/api/todo/nope/done`, { method: 'POST' })).status).toBe(404);
    expect((await fetch(`${base}/api/nope`)).status).toBe(404);
    expect((await fetch(`${base}/elsewhere`)).status).toBe(404);
  });

  it('CORS headers, no-store, OPTIONS preflight 204', async () => {
    const base = await start({ redis: new MemoryRedis() });
    const pre = await fetch(`${base}/api/todo`, { method: 'OPTIONS' });
    expect(pre.status).toBe(204);
    expect(pre.headers.get('access-control-allow-origin')).toBe('*');
    expect(pre.headers.get('access-control-allow-methods')).toBe('GET,POST,PUT,OPTIONS');
    expect(pre.headers.get('access-control-allow-headers')).toBe('Content-Type');
    const r = await fetch(`${base}/api/health`);
    expect(r.headers.get('cache-control')).toBe('no-store');
    expect(r.headers.get('content-type')).toBe('application/json; charset=utf-8');
  });

  it('413 above 256 KB; refuses an out-of-range pulse (400)', async () => {
    const base = await start({ redis: new MemoryRedis() });
    const big = await fetch(`${base}/api/todo`, { method: 'POST', body: 'x'.repeat(300 * 1024) });
    expect(big.status).toBe(413);
    const bad = await post(`${base}/ingest`, { type: 'HeartRate', value: 400 });
    expect(bad.status).toBe(400);
    expect(await bad.json()).toMatchObject({ ok: false });
  });

  it('accepts a form-urlencoded body (iOS Shortcut)', async () => {
    const base = await start({ redis: new MemoryRedis() });
    await post(`${base}/api/todo`, todo);
    const r = await fetch(`${base}/api/todo/done`, {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'item=med-cmo',
    });
    expect(await r.json()).toMatchObject({ ok: true, id: 'med-cmo', done: true });
    const ingest = await fetch(`${base}/ingest`, {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'type=HeartRate&value=72%2C5',
    });
    expect(await ingest.json()).toMatchObject({ ok: true, measurement: { value: 72.5 } });
  });

  it('readBody uses a body that Vercel already read (stream ended)', async () => {
    const fake = (body: unknown) => {
      const r = Readable.from([]) as unknown as IncomingMessage & { body?: unknown };
      r.headers = {};
      r.resume();
      return new Promise<IncomingMessage>((ok) => r.on('end', () => { r.body = body; ok(r); }));
    };
    expect(await readBody(await fake({ item: 'x' }))).toEqual({ item: 'x' });
    expect(await readBody(await fake(Buffer.from('item=y')))).toEqual({ item: 'y' });
    expect(await readBody(await fake('[1,2]'))).toEqual([1, 2]);
    expect(await readBody(await fake(undefined))).toBeUndefined();
  });
});

describe('Vercel function: state in Redis', () => {
  it('persists across two invocations (fresh instance, same Redis)', async () => {
    const redis = new MemoryRedis();
    const a = await start({ redis });
    await post(`${a}/api/todo`, todo);
    await fetch(`${a}/api/todo/ared-squat/done`, { method: 'POST' });
    await post(`${a}/ingest`, { type: 'HeartRate', value: 80, date: '2026-11-15T07:00:00Z' });
    const b = await start({ redis });
    const items = (await (await fetch(`${b}/api/todo`)).json()) as TodoItem[];
    expect(items.find((t) => t.id === 'ared-squat')!.done).toBe(true);
    expect(await (await fetch(`${b}/ingest/latest`)).json()).toMatchObject({ value: 80 });
    expect(await (await fetch(`${b}/api/health`)).json()).toEqual({ ok: true, todo: 2, live: 1 });
  });

  it('empty to-do filled with the plan of the day, persisted once', async () => {
    const redis = new MemoryRedis();
    const base = await start({ redis });
    const first = (await (await fetch(`${base}/api/todo`)).json()) as TodoItem[];
    expect(first.length).toBeGreaterThan(0);
    expect(JSON.parse(redis.strings.get(KEYS.todo)!)).toHaveLength(first.length);
  });

  it('concurrent writes: pulses and ticks interleaved lose nothing', async () => {
    const redis = new MemoryRedis(3); // each command yields: requests interleave between read and write
    const a = await start({ redis });
    const b = await start({ redis });
    await post(`${a}/api/todo`, todo);
    const pulses = Array.from({ length: 6 }, (_, i) =>
      post(`${i % 2 ? a : b}/ingest`, { type: 'HeartRate', value: 70 + i, date: `2026-11-15T07:00:0${i}Z` }));
    const ticks = [fetch(`${a}/api/todo/ared-squat/done`, { method: 'POST' }), fetch(`${b}/api/todo/med-cmo/done`, { method: 'POST' })];
    const all = await Promise.all([...pulses, ...ticks]);
    expect(all.every((r) => r.status === 200)).toBe(true);
    const items = (await (await fetch(`${a}/api/todo`)).json()) as TodoItem[];
    expect(items.every((t) => t.done)).toBe(true);
    expect(await (await fetch(`${b}/api/health`)).json()).toEqual({ ok: true, todo: 2, live: 6 });
    // a War Room push racing a tick keeps the tick
    await Promise.all([fetch(`${a}/api/todo/ared-squat/undo`, { method: 'POST' })]);
    await Promise.all([fetch(`${a}/api/todo/ared-squat/done`, { method: 'POST' }), post(`${b}/api/todo`, todo)]);
    const after = (await (await fetch(`${a}/api/todo`)).json()) as TodoItem[];
    expect(after.find((t) => t.id === 'ared-squat')!.done).toBe(true);
  });

  it('keeps at most 500 live measurements', async () => {
    const redis = new MemoryRedis();
    redis.lists.set(KEYS.live, Array.from({ length: 500 }, (_, i) =>
      JSON.stringify({ type: 'HeartRate', value: 60, unit: 'bpm', date: new Date(Date.UTC(2026, 10, 15, 6, 0, i)).toISOString(), source: 'apple-watch-live' })));
    const base = await start({ redis });
    await post(`${base}/ingest`, { type: 'HeartRate', value: 99, date: '2026-11-15T08:00:00Z' });
    expect(redis.lists.get(KEYS.live)).toHaveLength(500);
    expect(await (await fetch(`${base}/ingest/latest`)).json()).toMatchObject({ value: 99 });
  });
});

describe('Vercel function: summary and check-in', () => {
  it('check-in persisted in Redis and reflected in the summary after a cold start, then cleared', async () => {
    const redis = new MemoryRedis();
    const a = await start({ redis });
    const ci = { day: 94, mood: 3, fatigue: 3, sleepFelt: 3, pain: 2, painZones: ['rachis'], source: 'manual' };
    expect((await post(`${a}/api/checkin`, ci)).status).toBe(200);
    source.clearCheckIn(94); // cold start: the models module has forgotten it
    const b = await start({ redis });
    let j = (await (await fetch(`${b}/api/watch/summary`)).json()) as WatchSummary;
    expect(j.checkin.source).toBe('manual');
    expect(j.alerts[0]).toMatchObject({ organId: 'rachis', rule: 'CHECK-IN', zone: 'dos' });
    expect((await post(`${b}/api/checkin`, { clear: true })).status).toBe(200);
    j = (await (await fetch(`${a}/api/watch/summary`)).json()) as WatchSummary;
    expect(j.checkin.source).not.toBe('manual');
    expect((await post(`${a}/api/checkin`, { day: 94, pain: 9 })).status).toBe(400);
  });

  it('summary uses the server ticks and the latest pulse; ?day= handled', async () => {
    const base = await start({ redis: new MemoryRedis() });
    await post(`${base}/api/todo`, todo);
    await fetch(`${base}/api/todo/ared-squat/done`, { method: 'POST' });
    await post(`${base}/ingest`, { type: 'HeartRate', value: 76, date: '2026-11-15T07:00:05Z' });
    const j = (await (await fetch(`${base}/api/watch/summary`)).json()) as WatchSummary;
    expect(j.todo).toEqual({ total: 2, done: 1, source: 'serveur' });
    expect(j.live.heartRate).toMatchObject({ value: 76, provenance: 'RÉEL' });
    expect(((await (await fetch(`${base}/api/watch/summary?day=900`)).json()) as WatchSummary).mission.day).toBe(860);
    expect((await fetch(`${base}/api/watch/summary?day=abc`)).status).toBe(400);
  });

  it('models missing: summary and check-in 503, the rest works', async () => {
    const base = await start({ redis: new MemoryRedis(), loadModels: () => Promise.reject(new Error('no bundle')) });
    expect((await fetch(`${base}/api/watch/summary`)).status).toBe(503);
    expect((await post(`${base}/api/checkin`, { clear: true })).status).toBe(503);
    expect(await (await fetch(`${base}/api/todo`)).json()).toEqual([]);
    expect((await post(`${base}/ingest`, { type: 'HeartRate', value: 70 })).status).toBe(200);
  });
});

describe('Vercel function: /api/events', () => {
  it('hello, then the change, then the stream ends', async () => {
    const redis = new MemoryRedis();
    const base = await start({ redis, streamMs: 700, pollMs: 50, pingMs: 300 });
    await post(`${base}/api/todo`, todo); // v1, before the stream
    const res = await fetch(`${base}/api/events`);
    expect(res.headers.get('content-type')).toBe('text/event-stream; charset=utf-8');
    expect(res.headers.get('x-accel-buffering')).toBe('no');
    const text = res.text();
    await new Promise((r) => setTimeout(r, 120));
    await fetch(`${base}/api/todo/ared-squat/done`, { method: 'POST' });
    await post(`${base}/ingest`, { type: 'HeartRate', value: 70 });
    const out = await text; // resolves only when the function ends the response
    expect(out.startsWith('retry: 2000\ndata: {"kind":"hello","v":1}\n\n')).toBe(true);
    expect(out).toContain('data: {"kind":"todo","v":2}\n\n');
    expect(out).toContain('data: {"kind":"live","v":3}\n\n');
    expect(out).toContain(': ping\n\n');
  });
});

describe('Pre-bundled models (Vite SSR build) match the source', () => {
  let dir = '';
  let bundled: Models;
  beforeAll(async () => {
    dir = mkdtempSync(join(tmpdir(), 'solzero-models-'));
    const { build } = await import('vite');
    await build({ configFile: 'server/vercel/vite.config.ts', logLevel: 'silent', build: { outDir: dir } });
    bundled = (await import(/* @vite-ignore */ join(dir, 'models.js'))) as Models;
  }, 60_000);
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  it('same triage, alerts, to-do and delay as server/watchSummary.ts', () => {
    const now = new Date('2026-11-15T07:00:00Z');
    const pick = (s: WatchSummary) => ({ triage: s.triage, alerts: s.alerts, todo: s.todo, mission: s.mission, metrics: s.metrics, now: s.now, next: s.next });
    for (const day of [undefined, 0, 94, 210, 860]) {
      const a = (bundled.watchSummary as (s: unknown, d?: number, n?: Date) => WatchSummary)({ todo: [], live: [] }, day, now);
      const b = source.watchSummary({ todo: [], live: [] }, day, now);
      expect(pick(a)).toEqual(pick(b));
    }
    expect(bundled.planToday()).toEqual(source.planToday());
  });
});
