// Propriétaire : Steve (D). Récupère le vrai délai radio Terre–Mars depuis l'API JPL Horizons (NASA).
// À lancer AVANT la démo, sur une machine avec Internet :   npx tsx scripts/fetch-horizons.ts
// Sortie : public/data/nasa/horizons.json (lu par src/content/horizons.ts, aucun appel réseau pendant la démo).
// Quantités Horizons : 20 = distance observateur (delta, en ua), 21 = temps-lumière aller, 23 = élongation Soleil-Observateur-Cible.
import { writeFileSync } from 'node:fs';

const J0 = '2026-08-12';            // [Persona] départ : J94 = 2026-11-14
const MISSION_DAYS = 860;           // 210 j aller (Sol 0 = J210) + 500 j surface + 150 j retour
const AU_KM = 149_597_870.7;
const C_KM_S = 299_792.458;

const addDays = (iso: string, n: number) => new Date(Date.parse(iso + 'T00:00:00Z') + n * 86_400_000).toISOString().slice(0, 10);
const stop = addDays(J0, MISSION_DAYS + 1);

const params = new URLSearchParams({
  format: 'json', COMMAND: "'499'", OBJ_DATA: 'NO', MAKE_EPHEM: 'YES', EPHEM_TYPE: 'OBSERVER',
  CENTER: "'500@399'", START_TIME: `'${J0}'`, STOP_TIME: `'${stop}'`, STEP_SIZE: "'1 d'",
  QUANTITIES: "'20,23'", CSV_FORMAT: 'YES', CAL_FORMAT: 'CAL',
});
const url = `https://ssd.jpl.nasa.gov/api/horizons.api?${params}`;

const res = await fetch(url);
if (!res.ok) throw new Error(`Horizons HTTP ${res.status}`);
const { result } = (await res.json()) as { result: string };
const lines = result.split('\n');
const soe = lines.indexOf('$$SOE'), eoe = lines.indexOf('$$EOE');
if (soe < 0 || eoe < 0) throw new Error('Réponse Horizons inattendue :\n' + result.slice(0, 2000));
const header = lines.slice(0, soe).reverse().find((l) => l.includes('delta'))!.split(',').map((s) => s.trim());
const iDate = 0, iDelta = header.indexOf('delta'), iElong = header.findIndex((h) => h.startsWith('S-O-T'));

const days = lines.slice(soe + 1, eoe).map((l, day) => {
  const c = l.split(',').map((s) => s.trim());
  const au = Number(c[iDelta]);
  const date = new Date(c[iDate].replace(/ 00:00$/, '') + ' UTC').toISOString().slice(0, 10);
  return {
    day, date,
    distanceKm: Math.round(au * AU_KM),
    lightTimeMin: +((au * AU_KM) / C_KM_S / 60).toFixed(3),
    elongationDeg: +Number(c[iElong]).toFixed(2),
  };
});

const out = {
  source: 'NASA JPL Horizons API', tag: 'NASA', provisional: false,
  fetchedAt: new Date().toISOString(), query: url,
  note: 'Distance géocentrique Terre–Mars (Mars = 499, centre = 500@399). Délai radio aller = distance / c. Conjonction solaire : élongation < 3°.',
  j0: J0, days,
};
writeFileSync('public/data/nasa/horizons.json', JSON.stringify(out, null, 1) + '\n');
const t = days.find((d) => d.date === '2026-11-14');
console.log(`${days.length} jours écrits. 2026-11-14 : ${t?.lightTimeMin} min (attendu ≈ 11,01).`);
