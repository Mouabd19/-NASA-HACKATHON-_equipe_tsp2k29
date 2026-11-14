// SOL ZÉRO — Prototype santé mentale (§11). Propriétaire : Steve (D).
// Génère des journées 100 % SIMULÉES de Haddad [Persona], telles que les lunettes connectées les auraient
// extraites (option A : transcription de scènes + indicateurs capteurs), sans aucune personne réelle.
//
//   node proto/mental/generate.mjs
//
// Deux scénarios, même graine, même bruit de fond :
//   - drift   : glissement dépressif injecté à partir de J75 (progressif jusqu'à J94)
//   - control : aucun glissement (groupe témoin : le système doit rester calme)
// La « vérité » (début du glissement, intensité par jour) est écrite à part dans data/truth.json.
// run.mjs ne lit JAMAIS ce fichier : les agents ne voient que les journées.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, 'data');
const J0 = Date.parse('2026-08-12T00:00:00Z');
const FIRST = 46, LAST = 94, ONSET = 75;   // J46–J59 = période de référence ; analyse sur J60–J94
const CREW = { cmo: 'Kovacs', ing: 'Ito', bio: 'Okafor' };

// --- Aléa reproductible (mulberry32) -------------------------------------------------------------
function rng(seed) { return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const pick = (r, a) => a[Math.floor(r() * a.length)];
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const round = (x, d = 0) => +x.toFixed(d);

// Intensité du glissement : 0 avant J75, puis montée progressive (≈ 0,35 à J80, ≈ 0,8 à J94).
const driftOf = (day) => (day < ONSET ? 0 : clamp(1 - Math.exp(-(day - ONSET + 1) / 12)));

// Bruit de fond identique dans les deux scénarios : des « mauvais jours » existent aussi avant J75.
function backgroundBadness(day) {
  const r = rng(9000 + day);
  const x = r();
  if (x < 0.12) return 0.45 + 0.2 * r();   // vraie mauvaise journée (fatigue, conflit, mauvaise nouvelle)
  if (x < 0.35) return 0.15 + 0.15 * r();  // journée un peu moins bonne
  return 0.05 * r();
}
const BAD_DAY_CAUSE = ['une panne du recycleur d\'eau qui a demandé 3 h de travail', 'un désaccord technique avec Ito pendant le briefing', 'une mauvaise nuit à cause du bruit des ventilateurs', 'un message de la Terre annonçant la maladie d\'un proche', 'une séance d\'entraînement d\'urgence médicale éprouvante'];

// --- Banques de phrases (prononcées par Haddad), par tonalité -----------------------------------
const SAY = {
  ok: ['On attaque le module 3 après le café ?', 'Bien dormi, pour une fois.', 'Ito, tu me montres ta modif sur la pompe ?', 'Ce soir film, c\'est moi qui choisis.', 'Okafor, tes plants de laitue ont pris deux centimètres !', 'On est bien dans les temps sur la check-list.'],
  flat: ['Ok.', 'Ça marche.', 'Je verrai plus tard.', 'Pas d\'avis particulier.', 'Si vous voulez.', 'Je finis ça et j\'arrive.'],
  low: ['Laisse tomber, ça sert à rien.', 'Je suis fatigué, c\'est tout.', 'Faites sans moi ce soir.', 'Je n\'ai pas faim.', 'De toute façon on verra bien.', 'J\'ai l\'impression de tourner en rond ici.', 'Je préfère être seul un moment.', 'C\'est bon, j\'ai pas besoin d\'aide.'],
  irritable: ['Tu peux arrêter de me demander si ça va ?', 'C\'est la troisième fois qu\'on refait ça.', 'Pas maintenant.', 'Franchement, qui a rangé ça là ?'],
};
const BODY = {
  ok: ['Posture droite, gestes rapides', 'Rit à une blague d\'Okafor', 'Regarde ses interlocuteurs dans les yeux'],
  low: ['Soupire plusieurs fois', 'Se frotte les yeux, regard vers le sol', 'Voix basse et monocorde', 'Reste en retrait au fond du module', 'Répond après un long silence'],
};
const FEEL = { ok: ['Dit se sentir reposé.', 'Dit avoir bien récupéré de la séance.'], low: ['Dit avoir mal à la tête.', 'Dit avoir froid malgré la température normale.', 'Dit avoir « la tête lourde ».', 'Dit ne pas avoir faim.'] };

function tone(r, e) {
  const x = r();
  if (x < e * 0.25) return 'irritable';
  if (x < e * 0.9) return 'low';
  if (x < 0.35 + e * 0.4) return 'flat';
  return 'ok';
}
const hhmm = (h, m) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

function makeDay(day, scenario) {
  const d = scenario === 'drift' ? driftOf(day) : 0;
  const bad = backgroundBadness(day);
  const e = clamp(d + bad * (1 - d));           // intensité effective du jour
  const r = rng(day * 31 + 7);                   // même aléa dans les deux scénarios
  const scenes = [];
  const add = (t, txt) => scenes.push(`${t} — ${txt}`);
  let talkMin = 0, socialMin = 0, mealsSkipped = 0;

  const sleepH = round(clamp(7.1 - 2.2 * e + (r() - 0.5) * 0.8, 3.5, 8.5), 1);
  const wakeMin = 30 + Math.round(e * 40 + r() * 10);
  add(hhmm(6 + Math.floor(wakeMin / 60), wakeMin % 60), `Réveil. ${sleepH < 6 ? 'Reste allongé plusieurs minutes avant de se lever.' : 'Se lève directement.'}`);
  if (bad > 0.4) add('06:50', `Message reçu ou incident signalé la veille : ${pick(r, BAD_DAY_CAUSE)}.`);

  // Petit-déjeuner
  if (r() < 0.05 + 0.45 * e) { mealsSkipped++; add('07:30', `Ne vient pas au petit-déjeuner commun. ${CREW.cmo} frappe à sa cabine ; Haddad : « ${pick(r, SAY.low)} »`); }
  else {
    const t = tone(r, e); const n = t === 'ok' ? 3 : t === 'flat' ? 1 : 1;
    talkMin += t === 'ok' ? 12 : 4; socialMin += 25;
    add('07:30', `Petit-déjeuner avec l'équipage. Haddad : « ${pick(r, SAY[t])} »${n > 1 ? ` Échange suivi avec ${CREW.bio} (${n} répliques).` : ''} ${t === 'ok' ? pick(r, BODY.ok) : pick(r, BODY.low)}.`);
  }

  // Briefing
  {
    const t = tone(r, e);
    talkMin += t === 'ok' ? 10 : t === 'flat' ? 3 : 2;
    add('08:30', `Briefing avec la Terre (message différé). ${t === 'ok' ? 'Haddad pose deux questions sur le planning et propose une modification.' : t === 'flat' ? 'Haddad écoute, intervient une fois.' : 'Haddad ne prend pas la parole.'} ${t === 'irritable' ? `Coupe ${CREW.ing} : « ${pick(r, SAY.irritable)} »` : ''}`.trim());
  }

  // Tâche technique
  {
    const x = r();
    const status = x < 0.08 + 0.4 * e ? 'abandonnée en cours, reportée à demain' : x < 0.2 + 0.4 * e ? 'terminée avec 50 min de retard' : 'terminée dans les temps';
    add('10:00', `Maintenance du système de filtration d'air : ${status}.${status.startsWith('abandonnée') ? ` Haddad : « ${pick(r, SAY.low)} »` : ''}`);
  }

  // Déjeuner
  if (r() < 0.04 + 0.3 * e) { mealsSkipped++; add('12:40', 'Mange seul dans sa cabine, ration à moitié entamée.'); }
  else { const t = tone(r, e); talkMin += t === 'ok' ? 9 : 3; socialMin += 30; add('12:40', `Déjeuner commun. Haddad : « ${pick(r, SAY[t])} »`); }

  // Exercice
  {
    const x = r();
    const s = x < 0.05 + 0.35 * e ? 'annulée (« pas la force aujourd\'hui »)' : x < 0.15 + 0.4 * e ? 'écourtée à 25 min sur 60' : 'complète (60 min ARED + vélo)';
    add('14:00', `Séance d'exercice : ${s}. ${r() < 0.5 ? (e > 0.4 ? pick(r, FEEL.low) : pick(r, FEEL.ok)) : ''}`.trim());
  }

  // Expérience scientifique
  add('16:00', `Expérience de biologie avec ${CREW.bio}. ${e < 0.3 ? 'Haddad plaisante et propose une variante du protocole.' : e < 0.6 ? 'Haddad exécute les étapes demandées, peu d\'échanges.' : 'Haddad oublie une étape ; Okafor la refait sans commentaire.'}`);
  socialMin += 40; talkMin += e < 0.3 ? 8 : 3;

  // Temps libre
  {
    const x = r();
    if (x < 0.15 + 0.5 * e) add('17:30', `Temps libre seul dans sa cabine, porte fermée. ${e > 0.5 ? 'Regarde des photos de la Terre pendant 40 min sans bouger.' : 'Lit.'}`);
    else if (x < 0.75) { add('17:30', `Appel vidéo différé avec sa famille (messages enregistrés). ${e > 0.4 ? 'Message enregistré court (2 min), ton neutre.' : 'Message enregistré de 9 min, sourit.'}`); talkMin += e > 0.4 ? 2 : 9; }
    else { add('17:30', `Partie de cartes avec ${CREW.ing} et ${CREW.cmo}. ${pick(r, BODY.ok)}.`); talkMin += 15; socialMin += 45; }
  }

  // Dîner
  if (r() < 0.04 + 0.35 * e) { mealsSkipped++; add('19:30', `Saute le dîner commun. ${CREW.cmo} note son absence.`); }
  else { const t = tone(r, e); talkMin += t === 'ok' ? 14 : 4; socialMin += 40; add('19:30', `Dîner commun. Haddad : « ${pick(r, SAY[t])} » ${t === 'ok' ? '' : pick(r, BODY.low) + '.'}`.trim()); }

  // Soirée
  if (r() < 0.2 + 0.5 * e) add('21:00', `Décline la soirée film proposée par ${CREW.ing} : « ${pick(r, SAY.low)} »`);
  else { add('21:00', 'Soirée film avec l\'équipage, commente le film.'); talkMin += 6; socialMin += 90; }

  const bed = 22 + Math.round(e * 2 + r());
  add(hhmm(bed % 24, Math.floor(r() * 6) * 10), 'Coucher.');

  const steps = Math.round(4200 * (1 - 0.45 * e) + (r() - 0.5) * 600);
  const sensors = {
    tempsDeParoleMin: Math.max(1, Math.round(talkMin * (1 - 0.15 * e) + (r() - 0.5) * 6)),
    tempsAvecEquipageMin: Math.round(socialMin * (1 - 0.3 * e)),
    repasSautes: mealsSkipped,
    pas: steps,
    sommeilH: sleepH,
  };
  // Biomarqueurs (provisoires ici ; à remplacer par ceux du générateur de Mouad quand ils existent)
  const bio = {
    checkinHumeur: clamp(Math.round(4 - 2.2 * e + (r() - 0.5)), 1, 5),
    checkinFatigue: clamp(Math.round(2 + 2.2 * e + (r() - 0.5)), 1, 5),
    vfcMs: Math.round(52 - 14 * e + (r() - 0.5) * 6),
    cortisolNmolL: day % 7 === 0 ? Math.round(380 + 160 * e + (r() - 0.5) * 40) : null, // prélèvement hebdomadaire
  };
  const date = new Date(J0 + day * 86400000).toISOString().slice(0, 10);
  return { day, date, scenario, transcript: scenes, sensors, biomarkers: bio, _drift: round(d, 2), _bad: round(bad, 2) };
}

// Référence personnelle = moyennes de la période J46–J59 (même pour les deux scénarios : pas encore de glissement).
function reference(days) {
  const base = days.filter((x) => x.day < 60);
  const m = (f) => round(base.reduce((a, x) => a + f(x), 0) / base.length, 1);
  return {
    periode: `J${FIRST}–J59`,
    tempsDeParoleMin: m((x) => x.sensors.tempsDeParoleMin),
    tempsAvecEquipageMin: m((x) => x.sensors.tempsAvecEquipageMin),
    repasSautesParJour: m((x) => x.sensors.repasSautes),
    pas: m((x) => x.sensors.pas),
    sommeilH: m((x) => x.sensors.sommeilH),
    checkinHumeur: m((x) => x.biomarkers.checkinHumeur),
    vfcMs: m((x) => x.biomarkers.vfcMs),
  };
}

const truth = { onsetDay: ONSET, note: 'NE PAS donner aux agents. Intensité du glissement par jour (scénario drift) et mauvais jours de fond (les deux scénarios).', days: {} };
for (const scenario of ['drift', 'control']) {
  const days = [];
  for (let day = FIRST; day <= LAST; day++) days.push(makeDay(day, scenario));
  const ref = reference(days);
  fs.mkdirSync(path.join(OUT, scenario), { recursive: true });
  for (const x of days) {
    if (scenario === 'drift') truth.days[x.day] = { drift: x._drift, badBackground: x._bad };
    const { _drift, _bad, ...visible } = x;
    fs.writeFileSync(path.join(OUT, scenario, `J${x.day}.json`), JSON.stringify(visible, null, 1));
  }
  fs.writeFileSync(path.join(OUT, scenario, 'reference.json'), JSON.stringify(ref, null, 1));
  const tag = (x) => `J${x.day} parole=${x.sensors.tempsDeParoleMin} équipage=${x.sensors.tempsAvecEquipageMin} repas-=${x.sensors.repasSautes} humeur=${x.biomarkers.checkinHumeur}`;
  console.log(`[${scenario}] référence`, ref);
  for (const k of [65, 74, 78, 85, 94]) console.log(`[${scenario}]`, tag(days.find((x) => x.day === k)));
}
fs.writeFileSync(path.join(OUT, 'truth.json'), JSON.stringify(truth, null, 1));
console.log('OK →', OUT);
