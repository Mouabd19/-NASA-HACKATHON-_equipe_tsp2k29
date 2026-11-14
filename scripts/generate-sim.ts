// Génère la mission simulée de Haddad dans public/data/sim/ (graine fixe → fichiers identiques à chaque run).
// Usage : node scripts/generate-sim.ts [graine]
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateSim } from '../src/sim/generate.ts';
import { SIM_SEED } from '../src/sim/persona.ts';

const seed = process.argv[2] ? Number(process.argv[2]) : SIM_SEED;
const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'data', 'sim');
mkdirSync(outDir, { recursive: true });

const sim = generateSim(seed);
const files: Record<string, unknown> = {
  'meta.json': sim.meta,
  'days.json': sim.days,
  'blood.json': sim.blood,
  'urine.json': sim.urine,
  'checkins.json': sim.checkins,
  'watch.json': sim.watch,
};
for (const [name, data] of Object.entries(files)) {
  const text = JSON.stringify(data) + '\n';
  writeFileSync(join(outDir, name), text);
  console.log(`${name.padEnd(14)} ${(text.length / 1024).toFixed(0).padStart(5)} Ko`);
}
console.log(`OK — graine ${seed}, J${sim.meta.days[0]} → J${sim.meta.days[1]}`);
