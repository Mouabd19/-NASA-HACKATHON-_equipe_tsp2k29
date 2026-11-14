// SOL ZÉRO — Prototype santé mentale : les 6 agents (3 observateurs + 3 psychologues).
// Le chef est un HUMAIN (psy au sol) : il reçoit le dossier, aucun agent ne décide à sa place.

const COMMON = `Contexte : mission habitée Terre → Mars (SOL ZÉRO, NASA Space Apps). L'astronaute s'appelle Haddad.
Les données viennent de lunettes connectées portées avec le consentement de tout l'équipage.
Tout est SIMULÉ pour une démonstration : aucune personne réelle.
Réponds UNIQUEMENT en JSON valide, en français, sans texte autour.`;

// --- Étage 1 : observateurs. Ils relèvent des FAITS, sans interpréter. -------------------------
export const OBSERVERS = [
  {
    id: 'obs-actions',
    label: 'Observateur — actions et comportements',
    focus: 'les ACTIONS et COMPORTEMENTS : heure de lever et de coucher, repas pris ou sautés, tâches terminées, en retard ou abandonnées, séance d\'exercice (complète, écourtée, annulée), temps passé seul ou avec l\'équipage, déplacements.',
  },
  {
    id: 'obs-paroles',
    label: 'Observateur — paroles et interactions',
    focus: 'les PAROLES et INTERACTIONS : ce que Haddad dit (cite mot pour mot), à qui, s\'il prend l\'initiative ou répond seulement, temps de parole, invitations acceptées ou refusées, échanges avec la famille.',
  },
  {
    id: 'obs-corps',
    label: 'Observateur — corps et ressentis',
    focus: 'le CORPS et les RESSENTIS : posture, regard, voix, soupirs, gestes, plaintes physiques (douleur, froid, faim), énergie, sommeil, ce que Haddad dit ressentir.',
  },
];

export function observerPrompt(obs, day) {
  return [
    { role: 'system', content: `${COMMON}
Tu es un OBSERVATEUR. Tu lis le compte rendu complet d'une journée et tu relèves des FAITS, sans les interpréter,
sans diagnostic, sans adjectif psychologique (pas de « triste », « déprimé », « anxieux »).
Ton angle : ${obs.focus}
Règles :
1. Ne relève QUE les faits qui relèvent de ton angle. Ignore le reste (d'autres observateurs s'en chargent).
2. 6 faits maximum, les plus significatifs. Ne recopie PAS les lignes du compte rendu : reformule en une courte phrase factuelle.
3. Cite mot pour mot les paroles de Haddad uniquement si elles relèvent de ton angle.
Format : {"faits":[{"heure":"HH:MM","fait":"…","citation":"mot pour mot ou null"}],"resume":"2 phrases factuelles maximum, sur ton angle seulement"}` },
    { role: 'user', content: `Journée J${day.day} (${day.date}).
Compte rendu des lunettes :
${day.transcript.join('\n')}

Indicateurs capteurs du jour : ${JSON.stringify(day.sensors)}` },
  ];
}

// --- Étage 2 : psychologues. Trois grilles de lecture différentes. ---------------------------------
export const PSYCHOLOGISTS = [
  {
    id: 'psy-physique',
    label: 'Psychologue — état physico-psychique',
    lens: 'l\'ÉTAT PHYSICO-PSYCHIQUE : sommeil, énergie, appétit, fatigue, plaintes corporelles, ralentissement, oublis, et leur cohérence avec les biomarqueurs (VFC, cortisol, check-in).',
  },
  {
    id: 'psy-anxiete',
    label: 'Psychologue — rapport à l\'anxiété',
    lens: 'le RAPPORT À L\'ANXIÉTÉ : tension, irritabilité, inquiétude exprimée, évitement, rumination, réaction aux imprévus et aux incidents, cortisol.',
  },
  {
    id: 'psy-social',
    label: 'Psychologue — lien social et isolement',
    lens: 'le LIEN SOCIAL et l\'ISOLEMENT : temps passé avec l\'équipage, initiatives sociales, invitations refusées, repas pris seul, échanges avec la famille, retrait progressif.',
  },
];

export const LEVELS = ['rien', 'a_surveiller', 'proposer_un_echange'];
export const INSUFFICIENT = 'donnees_insuffisantes'; // jamais « rien » par défaut (règle de la roadmap)

// Écarts à la référence calculés dans le code : le modèle n'a pas à faire d'arithmétique.
const KEYS = [['tempsDeParoleMin', 'temps de parole (min)', (d) => d.sensors.tempsDeParoleMin], ['tempsAvecEquipageMin', 'temps avec l\'équipage (min)', (d) => d.sensors.tempsAvecEquipageMin], ['repasSautesParJour', 'repas sautés', (d) => d.sensors.repasSautes], ['pas', 'pas', (d) => d.sensors.pas], ['sommeilH', 'sommeil (h)', (d) => d.sensors.sommeilH], ['checkinHumeur', 'humeur déclarée (1–5)', (d) => d.biomarkers.checkinHumeur], ['vfcMs', 'VFC (ms)', (d) => d.biomarkers.vfcMs]];
export function deviations(reference, days) {
  return KEYS.map(([k, label, get]) => {
    const ref = reference[k];
    const today = get(days.at(-1));
    const mean7 = +(days.reduce((a, d) => a + get(d), 0) / days.length).toFixed(1);
    const pct = (v) => (ref ? Math.round(((v - ref) / ref) * 100) : 0);
    const sign = (n) => (n > 0 ? `+${n}` : `${n}`);
    return `- ${label} : aujourd'hui ${today} (${sign(pct(today))} % vs référence ${ref}) ; moyenne 7 j ${mean7} (${sign(pct(mean7))} %)`;
  }).join('\n');
}

export function psychologistPrompt(psy, day, reports, reference, history) {
  return [
    { role: 'system', content: `${COMMON}
Tu es un PSYCHOLOGUE. Ta grille de lecture : ${psy.lens}
Règles :
1. Compare Haddad à SA PROPRE référence. Les écarts sont DÉJÀ CALCULÉS : recopie ces chiffres, n'en invente aucun et ne refais aucun calcul. Un pourcentage positif = au-dessus de la référence.
2. Une seule mauvaise journée ne suffit pas : regarde l'historique des 7 derniers jours. Un incident ponctuel expliqué (panne, mauvaise nouvelle) est normal.
3. Chaque hypothèse doit citer ses preuves (faits des observateurs ou chiffres).
4. Tu ne poses JAMAIS de diagnostic. Tu signales un « schéma à regarder ».
5. Niveau, selon ces seuils précis :
   - "rien" : la journée reste dans la variation normale de Haddad (écarts de moins de 20 %), OU un seul indicateur s'écarte, OU l'écart est isolé sur une seule journée, OU il s'explique par un incident (panne, mauvaise nouvelle). Une journée normale est « rien » : ne choisis JAMAIS « a_surveiller » par simple précaution.
   - "a_surveiller" : au moins DEUX indicateurs s'écartent de 20 % ou plus de la référence, sur au moins 2 des 3 derniers jours, sans explication ponctuelle.
   - "proposer_un_echange" : le signal dure depuis au moins 4 jours ET il est cohérent entre plusieurs sources (comportement observé + humeur déclarée ou biomarqueurs).
6. Cite aussi les points rassurants.
7. Sois CONCIS : 3 hypothèses maximum, 3 preuves maximum par hypothèse, 3 écarts et 3 points rassurants maximum, phrases courtes.
8. N'utilise pas de guillemets droits (") à l'intérieur des textes : utilise « » pour citer.
Format : {"niveau":"…","confiance":"faible|moyenne|elevee","hypotheses":[{"schema":"…","preuves":["…"]}],"ecartsReference":["…"],"pointsRassurants":["…"],"noteAuPsy":"3 phrases maximum, factuelles, pour le psychologue humain au sol"}` },
    { role: 'user', content: `Journée analysée : J${day.day}.

Écarts à la référence personnelle de Haddad (${reference.periode}), calculés par le système :
${deviations(reference, history)}

Historique des 7 derniers jours (pour juger la persistance) :
${history.map((h) => `J${h.day} : parole ${h.sensors.tempsDeParoleMin} min, équipage ${h.sensors.tempsAvecEquipageMin} min, repas sautés ${h.sensors.repasSautes}, sommeil ${h.sensors.sommeilH} h, humeur ${h.biomarkers.checkinHumeur}/5, fatigue ${h.biomarkers.checkinFatigue}/5${h.biomarkers.cortisolNmolL ? `, cortisol ${h.biomarkers.cortisolNmolL} nmol/L` : ''}`).join('\n')}

Biomarqueurs du jour : ${JSON.stringify(day.biomarkers)}

Rapports des trois observateurs :
${reports.map((r) => `### ${r.label}\n${JSON.stringify(r.output)}`).join('\n\n')}` },
  ];
}

// --- Consolidation (règle fixe, pas d'IA) : le dossier transmis au psy humain. --------------------
// Le niveau du dossier = le niveau atteint par au moins 2 psychologues sur 3 (règle visible, auditable).
export function consolidate(psyOutputs) {
  const valid = psyOutputs.filter((p) => LEVELS.includes(p.output?.niveau));
  if (valid.length < 2) return { niveau: INSUFFICIENT, regle: 'moins de 2 psychologues ont rendu un avis valide : données insuffisantes, jamais « rien » par défaut', votes: psyOutputs.map((p) => ({ psy: p.id, niveau: p.output?.niveau ?? 'erreur' })) };
  const rank = (n) => Math.max(0, LEVELS.indexOf(n));
  const counts = LEVELS.map((_, i) => psyOutputs.filter((p) => rank(p.output?.niveau) >= i).length);
  const level = counts[2] >= 2 ? LEVELS[2] : counts[1] >= 2 ? LEVELS[1] : LEVELS[0];
  return { niveau: level, regle: 'niveau atteint par au moins 2 psychologues sur 3', votes: psyOutputs.map((p) => ({ psy: p.id, niveau: p.output?.niveau ?? 'erreur' })) };
}
