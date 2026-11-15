// Owner: Ahmed (B). Shared state of the deployed API (Vercel), in Upstash Redis instead of server/.data/state.json.
//
// Keys (one per part, so a pulse never rewrites the to-do and a tick never rewrites the pulses):
//   solzero:todo     JSON TodoItem[]            + solzero:todo:v     version (compare-and-set)
//   solzero:checkin  JSON {day: CheckIn}        + solzero:checkin:v  version (compare-and-set)
//   solzero:live     Redis list of JSON Measurement, oldest first, capped at 500 (atomic append + trim)
//   solzero:ev:v     event counter;  solzero:ev  list "n:kind", newest first, capped (read by /api/events)
//
// Writes go through small Lua scripts (EVAL is atomic in Redis; WATCH/MULTI isn't available over REST).
// MemoryRedis implements the same commands and scripts in memory: fallback without Redis, and the fake used by tests.
import { Redis } from '@upstash/redis';

/** The few Redis commands used here (strings in, strings out). */
export interface RedisLike {
  get(key: string): Promise<string | null>;
  mget(keys: string[]): Promise<(string | null)[]>;
  lrange(key: string, start: number, stop: number): Promise<string[]>;
  eval(script: string, keys: string[], args: string[]): Promise<unknown>;
}

/** Sets KEYS[1] = ARGV[2] and bumps KEYS[2] only if the version is still ARGV[1]. Returns 1, or 0 on conflict. */
export const CAS_SCRIPT = `local cur = redis.call('GET', KEYS[2])
if (cur or '0') ~= ARGV[1] then return 0 end
redis.call('SET', KEYS[1], ARGV[2])
redis.call('INCR', KEYS[2])
return 1`;

/** Appends ARGV[2..] to the list KEYS[1] and keeps the last ARGV[1] items. */
export const APPEND_SCRIPT = `for i = 2, #ARGV do redis.call('RPUSH', KEYS[1], ARGV[i]) end
redis.call('LTRIM', KEYS[1], -tonumber(ARGV[1]), -1)
return 1`;

/** Bumps the event counter KEYS[1], records "n:kind" in KEYS[2] (kept to ARGV[2] items). Returns n. */
export const EVENT_SCRIPT = `local n = redis.call('INCR', KEYS[1])
redis.call('LPUSH', KEYS[2], n .. ':' .. ARGV[1])
redis.call('LTRIM', KEYS[2], 0, tonumber(ARGV[2]) - 1)
return n`;

export const KEYS = {
  todo: 'solzero:todo', todoV: 'solzero:todo:v',
  checkin: 'solzero:checkin', checkinV: 'solzero:checkin:v',
  live: 'solzero:live',
  evV: 'solzero:ev:v', ev: 'solzero:ev',
} as const;

export const LIVE_MAX = 500; // same cap as handlers.ts
export const EVENTS_KEPT = 50;

/** In-memory Redis with the same commands and scripts. `delayMs` lets tests interleave concurrent requests. */
export class MemoryRedis implements RedisLike {
  readonly strings = new Map<string, string>();
  readonly lists = new Map<string, string[]>();
  commands = 0;
  private readonly delayMs: number;
  constructor(delayMs = 0) { this.delayMs = delayMs; }

  private async tick(): Promise<void> {
    this.commands += 1;
    await new Promise((r) => setTimeout(r, this.delayMs));
  }

  async get(key: string) { await this.tick(); return this.strings.get(key) ?? null; }
  async mget(keys: string[]) { await this.tick(); return keys.map((k) => this.strings.get(k) ?? null); }
  async lrange(key: string, start: number, stop: number) {
    await this.tick();
    const l = this.lists.get(key) ?? [];
    const n = l.length;
    const s = start < 0 ? Math.max(0, n + start) : start;
    const e = stop < 0 ? n + stop : Math.min(stop, n - 1);
    return l.slice(s, e + 1);
  }

  async eval(script: string, keys: string[], args: string[]): Promise<unknown> {
    await this.tick();
    // Atomic: everything below runs without awaiting, like a Lua script in Redis.
    if (script === CAS_SCRIPT) {
      if ((this.strings.get(keys[1]) ?? '0') !== args[0]) return 0;
      this.strings.set(keys[0], args[1]);
      this.strings.set(keys[1], String(Number(this.strings.get(keys[1]) ?? '0') + 1));
      return 1;
    }
    if (script === APPEND_SCRIPT) {
      const l = [...(this.lists.get(keys[0]) ?? []), ...args.slice(1)];
      this.lists.set(keys[0], l.slice(-Number(args[0])));
      return 1;
    }
    if (script === EVENT_SCRIPT) {
      const n = Number(this.strings.get(keys[0]) ?? '0') + 1;
      this.strings.set(keys[0], String(n));
      this.lists.set(keys[1], [`${n}:${args[0]}`, ...(this.lists.get(keys[1]) ?? [])].slice(0, Number(args[1])));
      return n;
    }
    throw new Error('MemoryRedis: unknown script');
  }
}

/** Upstash client (REST), strings only (no automatic JSON parsing). */
export function upstash(url: string, token: string): RedisLike {
  const r = new Redis({ url, token, automaticDeserialization: false });
  return {
    get: (key) => r.get<string>(key),
    mget: (keys) => r.mget<(string | null)[]>(...keys),
    lrange: (key, start, stop) => r.lrange<string>(key, start, stop),
    eval: (script, keys, args) => r.eval(script, keys, args),
  };
}

/** Env vars of the Vercel Marketplace Upstash integration (KV_* or UPSTASH_*). Null → in-memory fallback. */
export function redisFromEnv(env: Record<string, string | undefined> = process.env): RedisLike | null {
  const pairs: [string | undefined, string | undefined][] = [
    [env.KV_REST_API_URL, env.KV_REST_API_TOKEN],
    [env.UPSTASH_REDIS_REST_URL, env.UPSTASH_REDIS_REST_TOKEN],
  ];
  const found = pairs.find(([u, t]) => u && t);
  return found ? upstash(found[0]!, found[1]!) : null;
}
