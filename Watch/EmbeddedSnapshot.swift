import Foundation

// Instantané EMBARQUÉ de la persona Haddad à J94, produit par GET /api/watch/summary et planDay(94)
// (branche night/watch-api, 15/11/2026). Sert quand le Mac ne répond pas ou en mode démo.
// Tout ce qui en vient est affiché « Simulé · instantané embarqué » : jamais présenté comme en direct.
enum EmbeddedSnapshot {
    static let summaryJSON = #"""
{
 "version": 1,
 "generatedAt": "2026-11-14T06:00:00.000Z",
 "persona": {
  "name": "Scott Kelly",
  "tag": "Persona"
 },
 "provenance": "SIMULÉ",
 "mission": {
  "day": 94,
  "totalDays": 860,
  "sol0Day": 210,
  "daysToSol0": 116,
  "date": "2026-11-14",
  "phase": "Croisière aller",
  "delayMin": 11,
  "delayTag": "Publié",
  "conjunction": false
 },
 "checkin": {
  "source": "simulated"
 },
 "triage": {
  "level": "AMBRE",
  "label": "Attention",
  "color": "amber",
  "reasons": [
   "HANCHE — PERTE OSSEUSE ESTIMÉE [V1 4027]",
   "CUISSE — ATROPHIE MUSCULAIRE [TENDANCE-7J]",
   "CŒUR — VO₂MAX EN BAISSE [V1 4003]",
   "NERF OPTIQUE — GAINE EN HAUSSE [SANS-ONSD]"
  ]
 },
 "now": {
  "text": "Appliquer la to-do du jour : contre-mesures renforcées (ARED charge lourde, intervalles). Pas d’urgence."
 },
 "next": {
  "decideur": "sol",
  "who": "Médecin au sol",
  "text": "Synthèse IA et avis du médecin au sol attendus dans ≈ 52 min (aller-retour radio 2 × 11,0 min + traitement).",
  "reponseMin": 52
 },
 "alerts": [
  {
   "organId": "hanche",
   "name": "Hanche",
   "level": "AMBRE",
   "color": "amber",
   "title": "Hanche — perte osseuse estimée",
   "finding": "perte osseuse estimée",
   "rule": "V1 4027",
   "zone": "bassin"
  },
  {
   "organId": "cuisse",
   "name": "Cuisse (quadriceps)",
   "level": "AMBRE",
   "color": "amber",
   "title": "Cuisse — atrophie musculaire",
   "finding": "atrophie musculaire",
   "rule": "TENDANCE-7J",
   "zone": "cuisse"
  },
  {
   "organId": "coeur",
   "name": "Cœur",
   "level": "AMBRE",
   "color": "amber",
   "title": "Cœur — VO₂max en baisse",
   "finding": "VO₂max en baisse",
   "rule": "V1 4003",
   "zone": "thorax"
  },
  {
   "organId": "yeux",
   "name": "Yeux — nerf optique",
   "level": "AMBRE",
   "color": "amber",
   "title": "Nerf optique — gaine en hausse",
   "finding": "gaine en hausse",
   "rule": "SANS-ONSD",
   "zone": "tete"
  }
 ],
 "todo": {
  "total": 10,
  "done": 0,
  "source": "plan"
 },
 "metrics": [
  {
   "key": "fc_repos",
   "label": "FC de repos",
   "value": 62,
   "unit": "bpm",
   "color": "green",
   "tag": "Persona",
   "provenance": "SIMULÉ"
  },
  {
   "key": "spo2",
   "label": "SpO₂",
   "value": 98.7,
   "unit": "%",
   "color": "green",
   "tag": "Persona",
   "provenance": "SIMULÉ"
  },
  {
   "key": "vo2_pct",
   "label": "VO₂max vs pré-vol (44)",
   "value": 89.2,
   "unit": "%",
   "color": "amber",
   "tag": "H",
   "provenance": "SIMULÉ"
  }
 ],
 "live": {
  "heartRate": null
 }
}
"""#

    static let todoJSON = #"""
[
 {
  "id": "test-checkin",
  "kind": "test",
  "time": "07:00",
  "priority": 2,
  "title": "Check-in du matin",
  "detail": "Humeur, fatigue, douleur, sommeil ressenti : deux taps par ligne.",
  "done": false,
  "reasoningId": "r-checkin"
 },
 {
  "id": "test-urine",
  "kind": "test",
  "time": "07:05",
  "priority": 2,
  "title": "Analyse d'urine du matin",
  "detail": "Calcium et marqueur de résorption osseuse : suivi quotidien de l'os et du risque de calculs rénaux.",
  "done": false,
  "reasoningId": "r-urine"
 },
 {
  "id": "ared-squat",
  "kind": "exercice",
  "time": "07:30",
  "priority": 1,
  "title": "ARED — squat lourd",
  "detail": "4 × 6 · charge lourde (force) · 20 min · ARED",
  "done": false,
  "reasoningId": "r-hanche-ared"
 },
 {
  "id": "ared-souleve-de-terre",
  "kind": "exercice",
  "time": "08:00",
  "priority": 1,
  "title": "ARED — soulevé de terre",
  "detail": "4 × 6 · charge lourde (force) · 15 min · ARED",
  "done": false,
  "reasoningId": "r-hanche-ared"
 },
 {
  "id": "test-vision",
  "kind": "test",
  "time": "10:30",
  "priority": 2,
  "title": "Vision + échographie du nerf optique",
  "detail": "Contrôle de l'acuité visuelle et mesure échographique du diamètre de la gaine du nerf optique (risque SANS).",
  "done": false,
  "reasoningId": "r-nerf-optique"
 },
 {
  "id": "menu-calcium-vitd",
  "kind": "repas",
  "time": "12:30",
  "priority": 2,
  "title": "Menu os : calcium et vitamine D",
  "detail": "Petit-déjeuner : yaourt, flocons d'avoine, amandes · Déjeuner : saumon, brocolis, riz · Dîner : omelette au fromage, épinards · Supplément de vitamine D — 2700 kcal · 120 g protéines · 1200 mg calcium",
  "done": false,
  "reasoningId": "r-hanche-nutrition"
 },
 {
  "id": "sol-routine",
  "kind": "medical",
  "time": "14:00",
  "priority": 2,
  "title": "Point « Sol-routine » avec le médecin au sol",
  "detail": "Message différé : bisphosphonates, risque SANS, protocole aérobie. Réponse attendue dans ENSUITE.",
  "done": false,
  "reasoningId": "r-sol-routine"
 },
 {
  "id": "velo-intervalles",
  "kind": "exercice",
  "time": "16:00",
  "priority": 1,
  "title": "Vélo — intervalles",
  "detail": "4 × 4 min à 90 % FCmax, récupération 3 min · 30 min · CEVIS",
  "done": false,
  "reasoningId": "r-vo2-intervalles"
 },
 {
  "id": "point-psy",
  "kind": "medical",
  "time": "17:30",
  "priority": 3,
  "title": "Point psy (proposé, jamais imposé)",
  "detail": "Le signal d'humeur s'écarte de votre référence : un échange est proposé, vous décidez.",
  "done": false,
  "reasoningId": "r-psy"
 },
 {
  "id": "mobilite-dos",
  "kind": "exercice",
  "time": "18:00",
  "priority": 2,
  "title": "Mobilité et gainage du dos",
  "detail": "douce · 15 min",
  "done": false,
  "reasoningId": "r-dos"
 }
]
"""#
}
