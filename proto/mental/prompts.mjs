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
Tu couvres toute la journée, mais tu te concentres surtout sur ${obs.focus}
Format : {"faits":[{"heure":"HH:MM","fait":"…","citation":"mot pour mot ou null"}],"chiffres":{"…":"…"},"resume":"2 phrases factuelles maximum"}` },
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

export function psychologistPrompt(psy, day, reports, reference, history) {
  return [
    { role: 'system', content: `${COMMON}
Tu es un PSYCHOLOGUE. Ta grille de lecture : ${psy.lens}
Règles :
1. Compare Haddad à SA PROPRE référence (fournie), jamais à une norme générale.
2. Une seule mauvaise journée ne suffit pas : regarde l'historique des 7 derniers jours. Un incident ponctuel expliqué (panne, mauvaise nouvelle) est normal.
3. Chaque hypothèse doit citer ses preuves (faits des observateurs ou chiffres).
4. Tu ne poses JAMAIS de diagnostic. Tu signales un « schéma à regarder ».
5. Niveau : "rien" | "a_surveiller" (signal faible ou récent) | "proposer_un_echange" (signal persistant sur plusieurs jours ET cohérent entre plusieurs sources).
6. Cite aussi les points rassurants.
Format : {"niveau":"…","confiance":"faible|moyenne|elevee","hypotheses":[{"schema":"…","preuves":["…"]}],"ecartsReference":["…"],"pointsRassurants":["…"],"noteAuPsy":"3 phrases maximum, factuelles, pour le psychologue humain au sol"}` },
    { role: 'user', content: `Journée analysée : J${day.day}.

Référence personnelle de Haddad (${reference.periode}) : ${JSON.stringify(reference)}

Historique des 7 derniers jours (capteurs + check-in) :
${history.map((h) => `J${h.day} ${JSON.stringify({ ...h.sensors, humeur: h.biomarkers.checkinHumeur, fatigue: h.biomarkers.checkinFatigue, vfc: h.biomarkers.vfcMs, cortisol: h.biomarkers.cortisolNmolL })}`).join('\n')}

Biomarqueurs du jour : ${JSON.stringify(day.biomarkers)}

Rapports des trois observateurs :
${reports.map((r) => `### ${r.label}\n${JSON.stringify(r.output)}`).join('\n\n')}` },
  ];
}

// --- Consolidation (règle fixe, pas d'IA) : le dossier transmis au psy humain. --------------------
// Le niveau du dossier = le niveau atteint par au moins 2 psychologues sur 3 (règle visible, auditable).
export function consolidate(psyOutputs) {
  const rank = (n) => Math.max(0, LEVELS.indexOf(n));
  const counts = LEVELS.map((_, i) => psyOutputs.filter((p) => rank(p.output?.niveau) >= i).length);
  const level = counts[2] >= 2 ? LEVELS[2] : counts[1] >= 2 ? LEVELS[1] : LEVELS[0];
  return { niveau: level, regle: 'niveau atteint par au moins 2 psychologues sur 3', votes: psyOutputs.map((p) => ({ psy: p.id, niveau: p.output?.niveau ?? 'erreur' })) };
}
