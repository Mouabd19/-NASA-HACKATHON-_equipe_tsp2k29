// Propriétaire : Ahmed (B) — à valider (dossier scripts/ partagé).
// Usage : npm run parse-health -- <chemin vers export.zip ou export.xml> [sortie]
// Produit public/data/watch/presenter.json (IGNORÉ PAR GIT : données de santé personnelles).
import { openAsBlob } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { parseHealthBlob } from '../src/ingest/healthExport';
import { baseline30d } from '../src/ingest/baseline30d';
import type { Measurement } from '../src/types';

const [input, output = 'public/data/watch/presenter.json'] = process.argv.slice(2);
if (!input) {
  console.error('Usage : npm run parse-health -- <export.zip|export.xml> [sortie.json]');
  process.exit(1);
}

const TYPES: Measurement['type'][] = [
  'RestingHeartRate', 'HeartRateVariabilitySDNN', 'VO2Max', 'OxygenSaturation',
  'AppleSleepingWristTemperature', 'SleepAnalysis', 'HeartRate',
];

/** FC brute → moyenne horaire (des dizaines de milliers de points → ~720). */
function hourly(ms: Measurement[]): Measurement[] {
  const by = new Map<string, { sum: number; n: number; date: string }>();
  for (const m of ms) {
    const k = m.date.slice(0, 13);
    const b = by.get(k) ?? { sum: 0, n: 0, date: `${k}:00:00${m.date.slice(19)}` };
    b.sum += m.value; b.n++;
    by.set(k, b);
  }
  return [...by.values()].map((b) => ({
    type: 'HeartRate', value: Math.round((b.sum / b.n) * 10) / 10, unit: 'bpm', date: b.date, source: 'apple-watch-export',
  }));
}

const t0 = performance.now();
let last = -10;
const blob = await openAsBlob(input);
const all = await parseHealthBlob(blob, (pct) => {
  if (pct >= last + 10) { last = pct; process.stdout.write(`\r${pct} %`); }
});
const secs = ((performance.now() - t0) / 1000).toFixed(1);

const measurements = [
  ...all.filter((m) => m.type !== 'HeartRate'),
  ...hourly(all.filter((m) => m.type === 'HeartRate')),
].sort((a, b) => Date.parse(a.date) - Date.parse(b.date));

const counts = Object.fromEntries(TYPES.map((t) => [t, all.filter((m) => m.type === t).length]));
const baselines = TYPES.map((t) => baseline30d(measurements, t));

await mkdir(dirname(output), { recursive: true });
await writeFile(output, JSON.stringify({ generatedAt: new Date().toISOString(), counts, measurements, baselines }));

console.log(`\nParsé en ${secs} s (${(blob.size / 1e6).toFixed(0)} Mo) → ${output}`);
console.table(TYPES.map((t) => {
  const b = baselines.find((x) => x.type === t)!;
  const s = all.filter((m) => m.type === t);
  return { type: t, mesures: counts[t], de: s[0]?.date.slice(0, 10) ?? '—', a: s.at(-1)?.date.slice(0, 10) ?? '—', 'réf. 30 j': b.n ? `${b.mean} ± ${b.sd} (n=${b.n})` : 'données insuffisantes' };
}));
