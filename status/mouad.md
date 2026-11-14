# Status — Mouad (C)
_Mis à jour : sam. 14 nov. 21:00_

## Livré (PR `feature/mouad-sim` → `develop`)
- **Générateur Haddad J0 → J94** : `node scripts/generate-sim.ts` → `public/data/sim/{meta,days,blood,urine,checkins,watch}.json`.
  Graine fixe 2029 (déterministe), scans quotidiens (muscles, fluides, nerf optique) + hebdo (cœur, reins),
  prélèvement capillaire hebdo (14 analytes, PhenoAge J91 = 43,1), urine quotidienne, check-ins, montre (6 séries).
- **Modèles** (`src/models/`) : `bone`, `aerobic`, `muscle` (courbes de perte calées sur la fiche), `phenoAgeFormula`
  (Levine 2018, k = 0,090165), `agingRates` (os 0,5 %/an, muscle 0,4 %/an, cœur 1 %/an — sources de Steve), `rules`, `stats`.
  Alias des stubs conservés (`vo2maxAt`, `vo2DeficitAt`, `boneThresholdPct`…).
- **Tests** : `tests/models/` (41 tests) + contrat de Walid vert (86 au total). `npm run build` vert.

## Branché (même PR)
- **`src/sim/load.ts` sert mes données** (plus les mocks). Corps du jour construit dans `src/sim/body.ts` à partir des
  mesures brutes (`public/data/sim/scan.json` etc.) + modèles. Même forme que les mocks : 14 organes, mêmes clés,
  mémoïsé, borné 0..860, `getDayBodyPlan`, `getAnalyteMeta`.
- **Vrais modules** : `trend7d`, `alertsForDay` / `alertsForDayPlan` (dérivées du corps du jour), `bioAgeSeries`,
  `phenoAge` (calculé sur les prélèvements), `radiation`.
- **Plus aucun module de Mouad sur les mocks** (phases 3 et 4 livrées, voir plus bas).
- Projection sans modèle → pas de valeur inventée : nerf optique, reins (sauf calcium urinaire), sang (sauf VO₂max)
  sont gris / sans mesure au-delà de J94.

## Modèles d'IA entraînés (même PR) — `src/models/ml/`, fiches dans `public/data/ml/*.json`
Entraînés AVANT la démo (`scripts/ml/*.py`, Python + scikit-learn), inférence dans le navigateur, aucun réseau.
| Modèle | Apprentissage | Données | Résultat test | API |
| :-- | :-- | :-- | :-- | :-- |
| **A. Âge sanguin** | supervisé, régression ElasticNet (cible : âge) | **NHANES 2015–2018 réel** (9 300 adultes) | R² 0,28, ±11,8 ans ; Haddad 41,1 → 44,6 ans de J0 à J91 | `bloodAgeSeries()` |
| **B. Projection organes** | supervisé, régression quantile 10/50/90 % | cohorte simulée calibrée NASA (2 000 astronautes) | bat la projection sans ML partout (cuisse J860 : 0,9 vs 2,7 pts), bande couvre ~80 % | `organForecast(organe, 210/860, plan)` |
| **C. Signal d'humeur** | supervisé, régression logistique (référence personnelle) | cohorte simulée (1 500 astronautes, épisodes injectés) | 92 % détectés, délai médian 13 j, 6 % de fausses alertes ; Haddad : alerte J83 (glissement J75) | `moodSignals()` |
`modelCards()` renvoie les fiches (données, méthode, métriques, limites) pour la page Raisonnement / le pitch.

**Déjà visibles sans toucher à l'UI** : les 3 modèles sont cités dans les raisonnements (page Raisonnement, via
`explain`) et le modèle C pilote l'item « point psy » de la War Room (via `triage` → `planDay`).
**Glissement d'humeur injecté chez Haddad à J75** (ROADMAP §11) : humeur, sommeil, VFC, cortisol. Check-in J94 inchangé.

## Phase 3 — `triage` + `router` (PR `feature/mouad-triage` → `develop`)
- **`triage(day)`** : niveau = le plus grave entre les alertes d'organe (seuils NASA, tendance 7 j) et le check-in du matin
  (règles R13 d'Ahmed : douleur 3 → ROUGE ; douleur 2 → ORANGE + prévenir le CMO ; humeur ≤ 2 et fatigue ≥ 4 → ORANGE).
  Jamais vert par défaut : jour mesuré sans check-in et sans alerte → `DONNEES_INSUFFISANTES`.
  Le **signal d'humeur (modèle C)** et « humeur ≤ 2 trois jours de suite » **proposent** un point psy (raisons + Sol-routine),
  sans changer le niveau. Haddad : J5 VERT, J83 et J94 AMBRE + point psy proposé, J210 et J860 ROUGE.
- **`router(t, pos, delay)`** : MAINTENANT ne dépend que du niveau (testé sur 5 niveaux × 5 positions × 7 délais).
  ENSUITE : VERT → moi ; données insuffisantes → moi (refaire la mesure) ; ROUGE, conjonction ou délai inconnu → CMO ;
  AMBRE / ORANGE → sol, réponse = 2 × délai + 30 min [H]. Haddad J94 : 52 min.
- `tests/models/triage.test.ts` (10 tests), 129 tests au total, build vert.

## Phase 4 — `planDay` + `explain` + cas limites + montre réelle (même PR `feature/mouad-triage`)
- **`planDay(day)`** : to-do tirée du triage, **ids = ceux de la bibliothèque de Steve** (`ared-squat`, `menu-calcium-vitd`,
  `test-vision`…) → la montre coche par id (Ahmed). Médicaux : `prevenir-cmo` (en tête si ROUGE ou check-in ORANGE / ROUGE),
  `sol-routine`, `revue-dose`, `point-psy` (priorité 3, proposé). Un seul menu par jour. Haddad J94 : 10 items, 4 familles.
- **`explain(id)`** : 17 chaînes donnée → modèle → norme → décision, calculées sur les vraies données du jour, sources de
  `references.json` et `standards.json`. **Les modèles d'IA y apparaissent** (B pour os / cœur / cuisse, A pour le prélèvement,
  C pour le point psy). Ids : `r-<sujet>` = aujourd'hui, `r-<sujet>@<jour>` = un autre jour de la timeline.
- **Cas limites** : prélèvement > 7 j → item « prélèvement » prioritaire ; > 14 j → jamais VERT (`DONNEES_INSUFFISANTES`) ;
  check-in manquant → item prioritaire + jamais VERT.
- **Vraies données montre** (ingest d'Ahmed) : à J94, la FC au repos RÉELLE est comparée à la référence 30 j du présentateur
  (z-score) ; |z| ≥ 2 → au moins AMBRE, raison étiquetée « Montre RÉELLE ». Sans données réelles, rien ne change.
- Tests : `tests/models/plan.test.ts` (10) ; 139 tests au total, build vert.

## Règles §8 complétées (PR `feature/mouad-regles`)
- **Exception « 2 mesures »** : seuil rouge franchi sur les 2 dernières mesures (muscle −10 %, gaine 6,0 mm, calcium urinaire 350 mg/24 h)
  → ROUGE immédiat, sans attendre la moyenne 7 j (règle d'alerte `ROUGE-2-MESURES` pour le muscle).
- **Calculs rénaux au scan** : 1 ou plus → reins AMBRE (titre « CALCUL DÉTECTÉ AU SCAN ») → menu anti-calculs + échographie.
- **Plus de vert fixé en dur** : fraction d'éjection, masse ventriculaire, FC de repos, tension, volume des jambes, PVT, dose du jour
  ont maintenant une couleur calculée sur une plage [H] (`BANDS` dans `src/models/rules.ts`). Haddad reste dans ses plages : la démo ne change pas.
- **Test PVT** dans la to-do : donnée manquante ou expirée, temps de réaction > 300 ms (moyenne 7 j), ou fatigue ≥ 4 / sommeil ≤ 2 ;
  raisonnement `r-pvt`.
- 147 tests (8 nouveaux), build vert.

## Écarts avec les mocks (tests de contrat mis à jour dans cette PR, commentés « Mouad : »)
- **Écart d'âge** : 0,5 %/an pour l'os (décision Mouad + Steve) → hanche **+4,0 ans** à J94 (mock : +2,0), +17,4 à J860.
- **Tendance 7 j des muscles** : cuisse ≈ **−0,4 %/sem** (pente réelle du modèle calé sur 6 % à J94), pas −0,8.
- **PhenoAge** : vraie valeur calculée (43,1 à J91), `mock` n'est plus posé.
- **Analytes** : je prends les noms des pages (`calcium_urinaire`, `phosphatases_alcalines`).

## Bloqué / risques
- Rien de bloquant.

## Demandes aux autres
### Afficher les modèles d'IA (tout est prêt côté données, `src/models/ml/index.ts`, aucun réseau)
| Où | Qui | Appel | Quoi afficher |
| :-- | :-- | :-- | :-- |
| Page Body, en-tête (à côté de PhenoAge) | **Walid** | `bloodAgeSeries().at(-1)` | « Âge sanguin 44,6 ans (âge réel 42,3) » + mini-courbe J0 → J91 ; étiquette « modèle d'IA, NHANES [Publié] » |
| Fenêtre organe hanche / cuisse / cœur | **Walid** | `organForecast(organe, 210 \| 860, plan ? 1 : 0)` → `p10 / p50 / p90` | Bande 10–90 % autour de la projection (Sol 0 et J860), suit le bouton « avec le plan » ; étiquette [H] |
| Page Raisonnement, section « Nos modèles d'IA » | **Ahmed** | `modelCards()` | Pour chaque modèle : titre, `learning`, `data`, `metrics`, `limits` (de quoi répondre au jury) |
| War Room, carte humeur (option) | **Ahmed** | `moodSignals()` → `{ day, score, alert }` | Courbe du score J27 → J94, seuil 0,44, « signal à regarder, jamais un diagnostic » |
- Fiche complète des 3 modèles pour le pitch : `docs/modeles-ml.md` (sur `main`).

- **Ahmed** : dans `WarRoom.tsx`, `triage(DAY)` et `planDay(DAY)` sont mémoïsés sur `[version]` seulement. Ajoute `dataVersion`
  aux dépendances pour que l'arrivée des vraies données montre recalcule le triage (fusion RÉEL ci-dessus).
- **Ahmed / Steve** : les ids de la to-do sont maintenant ceux de la bibliothèque (plus `t94-…`). Les raisonnements s'ouvrent
  avec `explain(item.reasoningId)`, rien à changer côté page.
- **Steve** : **on reste sur Sol 0 = J210** (décision Mouad, 14 nov.). C'est la valeur de tout le code (`DAY_SOL0` dans
  `src/sim/persona.ts` et `src/mocks/mission.ts`), des tests de contrat et du modèle B (projection « arrivée sur Mars »).
  Merci d'aligner la fiche, tes synthèses IA (jour clé « Sol 0 » = J210) et le pitch sur J210.
- **Walid** : réponse à ta question → `DAY_SOL0` = 210 confirmé, VO₂ pré-vol = 44 ml/kg/min ; après J94, `getDayBody` =
  rythme actuel (projection des modèles), `getDayBodyPlan(day, 1)` = avec le plan.
- **Walid** : `getAnalyteMeta` vient maintenant de mes données (unités réelles, ex. vitamine D en nmol/L). Vérifie l'affichage du panneau sang.
