// Propriétaire : Ahmed (B). Parseur en flux de l'export Apple Santé — ROADMAP §7.
// export.xml fait souvent plus de 500 Mo : pas de DOMParser, lecture par morceaux + regex sur les <Record>.
// Accepte export.xml OU export.zip (l'entrée apple_health_export/export.xml est décompressée en flux).
import type { Measurement } from '../types';

type MType = Measurement['type'];

/** Identifiants HealthKit → types du contrat (§6). Tout le reste est ignoré. */
export const HK_TYPES: Record<string, MType> = {
  HKQuantityTypeIdentifierRestingHeartRate: 'RestingHeartRate',
  HKQuantityTypeIdentifierHeartRateVariabilitySDNN: 'HeartRateVariabilitySDNN',
  HKQuantityTypeIdentifierVO2Max: 'VO2Max',
  HKQuantityTypeIdentifierOxygenSaturation: 'OxygenSaturation',
  HKQuantityTypeIdentifierAppleSleepingWristTemperature: 'AppleSleepingWristTemperature',
  HKQuantityTypeIdentifierHeartRate: 'HeartRate',
  HKCategoryTypeIdentifierSleepAnalysis: 'SleepAnalysis',
};

const UNITS: Record<MType, string> = {
  RestingHeartRate: 'bpm',
  HeartRate: 'bpm',
  HeartRateVariabilitySDNN: 'ms',
  VO2Max: 'mL/kg/min',
  OxygenSaturation: '%',
  AppleSleepingWristTemperature: '°C',
  SleepAnalysis: 'h',
};

/** Segments de sommeil comptés (InBed et Awake exclus). */
const ASLEEP = /^HKCategoryValueSleepAnalysisAsleep/;
const HR_WINDOW_MS = 30 * 86_400_000; // FC brute : seulement les 30 derniers jours
const HR_PRUNE_AT = 200_000;
const YIELD_EVERY_BYTES = 8 * 1024 * 1024;

export interface ParseOptions {
  /** Appelé avec le pourcentage 0–100 d'octets lus. */
  onProgress?: (pct: number) => void;
  /** Taille totale en octets, pour le pourcentage. */
  totalBytes?: number;
}

/** « 2025-05-20 17:53:19 +0100 » → « 2025-05-20T17:53:19+01:00 ». Format inconnu → renvoyé tel quel. */
export function toIso(d: string): string {
  const m = /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}) ([+-])(\d{2})(\d{2})$/.exec(d);
  return m ? `${m[1]}T${m[2]}${m[3]}${m[4]}:${m[5]}` : d;
}

const ATTR = /([A-Za-z]+)="([^"]*)"/g;
function attrs(tag: string): Record<string, string> {
  const out: Record<string, string> = {};
  ATTR.lastIndex = 0;
  for (let m = ATTR.exec(tag); m; m = ATTR.exec(tag)) out[m[1]] = m[2];
  return out;
}

/** Clé de nuit = date locale du réveil (un segment qui finit après 18 h compte pour la nuit suivante). */
function nightKey(endIso: string): string {
  const day = endIso.slice(0, 10);
  const hour = Number(endIso.slice(11, 13));
  if (hour < 18) return day;
  const d = new Date(day + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

interface SleepNight { intervals: [number, number][]; wakeIso: string; wakeMs: number }

/** Accumulateur : on lui passe le texte par morceaux, il garde la fin incomplète d'un morceau à l'autre. */
export class HealthXmlParser {
  private buf = '';
  private out: Measurement[] = [];
  private hr: { t: number; m: Measurement }[] = [];
  private hrMax = -Infinity;
  private nights = new Map<string, SleepNight>();

  push(text: string): void {
    this.buf += text;
    // Coupe avant le dernier « < » s'il n'est pas refermé : la balise continue dans le morceau suivant.
    const lt = this.buf.lastIndexOf('<');
    let work: string;
    if (lt >= 0 && this.buf.indexOf('>', lt) === -1) {
      work = this.buf.slice(0, lt);
      this.buf = this.buf.slice(lt);
    } else {
      work = this.buf;
      this.buf = '';
    }
    this.scan(work);
  }

  private scan(s: string): void {
    let i = s.indexOf('<Record ');
    while (i !== -1) {
      const end = s.indexOf('>', i);
      if (end === -1) break; // impossible après push(), par sécurité
      const tag = s.slice(i, end + 1);
      const t0 = tag.indexOf('type="');
      if (t0 !== -1) {
        const hk = tag.slice(t0 + 6, tag.indexOf('"', t0 + 6));
        const type = HK_TYPES[hk];
        if (type) this.record(type, attrs(tag));
      }
      i = s.indexOf('<Record ', end);
    }
  }

  private record(type: MType, a: Record<string, string>): void {
    if (!a.startDate || !a.endDate) return;
    if (type === 'SleepAnalysis') {
      if (!ASLEEP.test(a.value ?? '')) return;
      const startIso = toIso(a.startDate);
      const endIso = toIso(a.endDate);
      const s = Date.parse(startIso);
      const e = Date.parse(endIso);
      if (!(e > s)) return;
      const key = nightKey(endIso);
      const n = this.nights.get(key) ?? { intervals: [], wakeIso: endIso, wakeMs: e };
      n.intervals.push([s, e]);
      if (e > n.wakeMs) { n.wakeMs = e; n.wakeIso = endIso; }
      this.nights.set(key, n);
      return;
    }
    let value = Number(a.value);
    if (!Number.isFinite(value)) return;
    if (type === 'OxygenSaturation' && value <= 1) value = value * 100; // fraction → %
    if (type === 'AppleSleepingWristTemperature' && a.unit === 'degF') value = (value - 32) / 1.8;
    const m: Measurement = {
      type,
      value: Math.round(value * 1000) / 1000,
      unit: UNITS[type],
      date: toIso(type === 'VO2Max' || type === 'HeartRate' ? a.startDate : a.endDate),
      source: 'apple-watch-export',
    };
    if (type === 'HeartRate') {
      const t = Date.parse(m.date);
      if (!Number.isFinite(t) || t < this.hrMax - HR_WINDOW_MS) return;
      if (t > this.hrMax) this.hrMax = t;
      this.hr.push({ t, m });
      if (this.hr.length > HR_PRUNE_AT) this.pruneHr();
      return;
    }
    this.out.push(m);
  }

  private pruneHr(): void {
    const min = this.hrMax - HR_WINDOW_MS;
    this.hr = this.hr.filter((x) => x.t >= min);
  }

  /** Termine le flux et renvoie les mesures triées par date. */
  finish(): Measurement[] {
    if (this.buf) { this.scan(this.buf); this.buf = ''; }
    this.pruneHr();
    const sleep: Measurement[] = [];
    for (const n of this.nights.values()) {
      // Union des intervalles : montre et iPhone rapportent souvent la même nuit.
      const iv = n.intervals.sort((x, y) => x[0] - y[0]);
      let total = 0;
      let [cs, ce] = iv[0];
      for (const [s, e] of iv.slice(1)) {
        if (s <= ce) ce = Math.max(ce, e);
        else { total += ce - cs; cs = s; ce = e; }
      }
      total += ce - cs;
      sleep.push({
        type: 'SleepAnalysis',
        value: Math.round((total / 3_600_000) * 100) / 100,
        unit: 'h',
        date: n.wakeIso,
        source: 'apple-watch-export',
      });
    }
    const all = [...this.out, ...this.hr.map((x) => x.m), ...sleep];
    return all.sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
  }
}

/** Ajout (tests + script Node) : parse un flux de morceaux de texte. */
export async function parseHealthXmlChunks(chunks: Iterable<string> | AsyncIterable<string>): Promise<Measurement[]> {
  const p = new HealthXmlParser();
  for await (const c of chunks) p.push(c);
  return p.finish();
}

const yieldToUi = () => new Promise<void>((r) => setTimeout(r, 0));

async function parseByteStream(stream: ReadableStream<Uint8Array>, opts: ParseOptions): Promise<Measurement[]> {
  const p = new HealthXmlParser();
  const dec = new TextDecoder('utf-8');
  const reader = stream.getReader();
  let read = 0;
  let sinceYield = 0;
  let lastPct = -1;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    read += value.byteLength;
    sinceYield += value.byteLength;
    p.push(dec.decode(value, { stream: true }));
    if (opts.onProgress && opts.totalBytes) {
      const pct = Math.min(99, Math.floor((read / opts.totalBytes) * 100));
      if (pct !== lastPct) { lastPct = pct; opts.onProgress(pct); }
    }
    if (sinceYield >= YIELD_EVERY_BYTES) { sinceYield = 0; await yieldToUi(); }
  }
  p.push(dec.decode());
  const out = p.finish();
  opts.onProgress?.(100);
  return out;
}

// ---------- ZIP (export.zip tel que produit par l'iPhone) ----------

const u16 = (v: DataView, o: number) => v.getUint16(o, true);
const u32 = (v: DataView, o: number) => v.getUint32(o, true);

/** Trouve export.xml dans l'archive via le répertoire central et renvoie son flux décompressé. */
async function zipEntryStream(blob: Blob, wanted = /(^|\/)export\.xml$/): Promise<{ stream: ReadableStream<Uint8Array>; size: number }> {
  const tailLen = Math.min(blob.size, 65_557);
  const tail = new DataView(await blob.slice(blob.size - tailLen).arrayBuffer());
  let eocd = -1;
  for (let i = tailLen - 22; i >= 0; i--) if (u32(tail, i) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error('Unreadable ZIP archive (no central directory).');
  let cdSize = u32(tail, eocd + 12);
  let cdOff = u32(tail, eocd + 16);
  if (cdOff === 0xffffffff || cdSize === 0xffffffff) {
    // ZIP64 : le localisateur précède l'EOCD.
    const loc = eocd - 20;
    if (loc < 0 || u32(tail, loc) !== 0x07064b50) throw new Error('ZIP64 is not supported.');
    const z64Off = Number(tail.getBigUint64(loc + 8, true));
    const z64 = new DataView(await blob.slice(z64Off, z64Off + 56).arrayBuffer());
    cdSize = Number(z64.getBigUint64(40, true));
    cdOff = Number(z64.getBigUint64(48, true));
  }
  const cd = new DataView(await blob.slice(cdOff, cdOff + cdSize).arrayBuffer());
  const dec = new TextDecoder();
  for (let p = 0; p + 46 <= cd.byteLength && u32(cd, p) === 0x02014b50; ) {
    const method = u16(cd, p + 10);
    let csize = u32(cd, p + 20);
    let usize = u32(cd, p + 24);
    const nlen = u16(cd, p + 28);
    const xlen = u16(cd, p + 30);
    const clen = u16(cd, p + 32);
    let lho = u32(cd, p + 42);
    const name = dec.decode(new Uint8Array(cd.buffer, cd.byteOffset + p + 46, nlen));
    // Champ extra ZIP64 (0x0001) si une taille ou l'offset dépasse 4 Go.
    let x = p + 46 + nlen;
    const xend = x + xlen;
    while (x + 4 <= xend) {
      const id = u16(cd, x);
      const len = u16(cd, x + 2);
      if (id === 0x0001) {
        let q = x + 4;
        if (usize === 0xffffffff) { usize = Number(cd.getBigUint64(q, true)); q += 8; }
        if (csize === 0xffffffff) { csize = Number(cd.getBigUint64(q, true)); q += 8; }
        if (lho === 0xffffffff) { lho = Number(cd.getBigUint64(q, true)); }
      }
      x += 4 + len;
    }
    if (wanted.test(name)) {
      const lh = new DataView(await blob.slice(lho, lho + 30).arrayBuffer());
      const dataStart = lho + 30 + u16(lh, 26) + u16(lh, 28);
      const raw = blob.slice(dataStart, dataStart + csize).stream() as ReadableStream<Uint8Array>;
      if (method === 0) return { stream: raw, size: usize };
      if (method !== 8) throw new Error(`ZIP compression method ${method} is not supported.`);
      return { stream: raw.pipeThrough(new DecompressionStream('deflate-raw') as unknown as ReadableWritablePair<Uint8Array, Uint8Array>) as ReadableStream<Uint8Array>, size: usize };
    }
    p += 46 + nlen + xlen + clen;
  }
  throw new Error('export.xml not found in the archive.');
}

async function isZip(blob: Blob): Promise<boolean> {
  const head = new Uint8Array(await blob.slice(0, 4).arrayBuffer());
  return head[0] === 0x50 && head[1] === 0x4b && head[2] === 0x03 && head[3] === 0x04;
}

/** Ajout : même parseur sur un Blob (Node : fs.openAsBlob). */
export async function parseHealthBlob(blob: Blob, onProgress?: (pct: number) => void): Promise<Measurement[]> {
  if (await isZip(blob)) {
    const { stream, size } = await zipEntryStream(blob);
    return parseByteStream(stream, { onProgress, totalBytes: size });
  }
  return parseByteStream(blob.stream() as ReadableStream<Uint8Array>, { onProgress, totalBytes: blob.size });
}

/** Contrat §7. `onProgress` reçoit un pourcentage 0–100. */
export function parseHealthExport(file: File, onProgress?: (pct: number) => void): Promise<Measurement[]> {
  return parseHealthBlob(file, onProgress);
}
