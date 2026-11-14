# Status — Mouad (C)
_Mis à jour : sam. 14 nov. 17:10_

## Livré (PR `feature/mouad-sim` → `develop`)
- **Générateur Haddad J0 → J94** : `node scripts/generate-sim.ts` → `public/data/sim/{meta,days,blood,urine,checkins,watch}.json`.
  Graine fixe 2029 (déterministe), scans quotidiens (muscles, fluides, nerf optique) + hebdo (cœur, reins),
  prélèvement capillaire hebdo (14 analytes, PhenoAge J91 = 43,1), urine quotidienne, check-ins, montre (6 séries).
- **Modèles** (`src/models/`) : `bone`, `aerobic`, `muscle` (courbes de perte calées sur la fiche), `phenoAgeFormula`
  (Levine 2018, k = 0,090165), `agingRates` (os 0,5 %/an, muscle 0,4 %/an, cœur 1 %/an — sources de Steve), `rules`, `stats`.
  Alias des stubs conservés (`vo2maxAt`, `vo2DeficitAt`, `boneThresholdPct`…).
- **Tests** : `tests/models/` (41 tests) + contrat de Walid vert (86 au total). `npm run build` vert.

## En cours
- **Brancher `src/sim/load.ts` sur mes données** : il délègue ENCORE aux mocks de Walid. Mon accès aux données est
  dans `src/sim/loadSim.ts`. J'aligne la forme sur `tests/mocks.contract.test.ts` (14 organes dont `dose`,
  `perte_osseuse`, `projection_j860`, `vo2_pct`, `taille`, `calculs`, `calcium_urinaire` en mg/24 h, mémoïsation…)
  puis `load.ts` réexporte `loadSim.ts`. Les pages ne changent pas.
- **Trois modèles d'IA entraînés** (voir `plans/mouad.md`) : âge sanguin (NHANES, CDC), projection des organes
  (cohorte calibrée NASA), schémas d'humeur.

## Écarts avec les mocks (je mettrai les tests de contrat à jour dans la PR de branchement)
- **Écart d'âge** : 0,5 %/an pour l'os (décision Mouad + Steve) → hanche **+4,0 ans** à J94 (mock : +2,0), +17,4 à J860.
- **Tendance 7 j des muscles** : cuisse ≈ **−0,4 %/sem** (pente réelle du modèle calé sur 6 % à J94), pas −0,8.
- **Analytes** : je prends les noms des pages (`calcium_urinaire`, `phosphatases_alcalines`).

## Bloqué / risques
- Rien de bloquant.

## Demandes aux autres
- **Walid** : ok pour garder `getAnalyteMeta` dans `src/mocks/blood.ts` (métadonnées d'affichage) ?
