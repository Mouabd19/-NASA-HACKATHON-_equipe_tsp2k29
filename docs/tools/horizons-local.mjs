// Version PROVISOIRE de public/data/nasa/horizons.json, calculée hors ligne (astronomy-engine, VSOP87),
// en attendant que scripts/fetch-horizons.ts soit lancé sur une machine qui accède à JPL Horizons.
// Écart attendu avec Horizons : < 0,01 min. Usage : node horizons-local.mjs ../../public/data/nasa/horizons.json
import fs from 'node:fs';
import * as A from 'astronomy-engine';
const J0 = '2026-08-12', N = 860, AU_KM = 149_597_870.7, C = 299_792.458;
const days = [];
for (let day = 0; day <= N; day++) {
  const t = new Date(Date.parse(J0 + 'T00:00:00Z') + day * 86_400_000);
  const v = A.GeoVector(A.Body.Mars, t, true);
  const km = Math.hypot(v.x, v.y, v.z) * AU_KM;
  days.push({ day, date: t.toISOString().slice(0, 10), distanceKm: Math.round(km), lightTimeMin: +(km / C / 60).toFixed(3), elongationDeg: +A.Elongation(A.Body.Mars, t).elongation.toFixed(2) });
}
fs.writeFileSync(process.argv[2], JSON.stringify({
  source: 'Calcul local provisoire (astronomy-engine) — à remplacer par scripts/fetch-horizons.ts (NASA JPL Horizons)',
  tag: 'H', provisional: true, fetchedAt: null, query: null,
  note: 'Distance géocentrique Terre–Mars. Délai radio aller = distance / c. Conjonction solaire : élongation < 3°.',
  j0: J0, days,
}, null, 1) + '\n');
const c = days.filter((d) => d.elongationDeg < 3);
console.log('2026-11-14', days.find((d) => d.date === '2026-11-14').lightTimeMin, '| min', Math.min(...days.map((d) => d.lightTimeMin)), '| max', Math.max(...days.map((d) => d.lightTimeMin)), '| conjonction', c[0]?.date, '→', c.at(-1)?.date);
