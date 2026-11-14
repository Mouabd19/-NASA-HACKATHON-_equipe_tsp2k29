# Status — Mouad (C)
_Mis à jour : sam. 14 nov. 18:40_

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
- **Encore sur mocks** (phases suivantes) : `triage`, `router`, `planDay`, `explain`.
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

**Walid / Ahmed** : rien n'est encore affiché. Idées : âge sanguin à côté de PhenoAge, bande du modèle B dans la
fenêtre organe, `moodSignals()` → item « point psy » proposé dans `planDay` (Ahmed / moi en phase 4).
**Glissement d'humeur injecté chez Haddad à J75** (ROADMAP §11) : humeur, sommeil, VFC, cortisol. Check-in J94 inchangé.

## Écarts avec les mocks (tests de contrat mis à jour dans cette PR, commentés « Mouad : »)
- **Écart d'âge** : 0,5 %/an pour l'os (décision Mouad + Steve) → hanche **+4,0 ans** à J94 (mock : +2,0), +17,4 à J860.
- **Tendance 7 j des muscles** : cuisse ≈ **−0,4 %/sem** (pente réelle du modèle calé sur 6 % à J94), pas −0,8.
- **PhenoAge** : vraie valeur calculée (43,1 à J91), `mock` n'est plus posé.
- **Analytes** : je prends les noms des pages (`calcium_urinaire`, `phosphatases_alcalines`).

## Bloqué / risques
- Rien de bloquant.

## Demandes aux autres
- **Walid** : `getAnalyteMeta` vient maintenant de mes données (unités réelles, ex. vitamine D en nmol/L). Vérifie l'affichage du panneau sang.
