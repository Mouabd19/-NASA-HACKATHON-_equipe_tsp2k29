> **Plan Mouad (rôle C) : données simulées, modèles et règles.** Le statut au fil de l'eau sera dans `status/mouad.md` dès que le bootstrap existe.
>
> **Demandes aux autres (toutes par ajout, non cassantes) :**
> - **@Steve** :
>   - mettre la **fiche `sol-zero-fiche-v3`** dans le repo (`docs/`) ou le drive : j'en ai besoin pour les modèles `aerobic`, `bone` et `radiation` (fiche §7) et pour les tests d'or (fiche §11). D'ici là, je cale les modèles sur les chiffres des mocks (ROADMAP §7) ;
>   - me confirmer le **jour de Sol 0** (arrivée sur Mars) en jours de mission ;
>   - les **vitesses de vieillissement terrestre** par organe (ROADMAP §8 : hanche, cuisse/mollet, VO₂max ≈ 1 %/an, à sourcer).
>   - ✅ Coefficients PhenoAge reçus (`docs/sources/phenoage.md` sur `feature/steve-models`), merci. Je prends **k = 0,090165** et je dégrade CRP, albumine et IDR pour retrouver **43,1 ans à J91**.
> - **@Walid** :
>   - `src/sim/load.ts` importe les JSON de `public/data/sim/` par **chemin relatif** (`import days from '../../public/data/sim/days.json'`), car `getDayBody` est synchrone. Si tu préfères un autre emplacement, dis-le dans ton status ;
>   - me prévenir dans ton status quand `develop` et les stubs de §7 sont poussés.
> - **@Ahmed** : ✅ OK pour tes deux demandes. `triage` et `planDay` liront `todayCheckIn() ?? getCheckIn(day)`, et `getWatchSeries` fusionnera `getRealSeries(type)` (jalon dim. 08:00).

# Plan Mouad (rôle C) : données simulées, modèles et règles

## En une phrase
Je fabrique **tout ce que l'app affiche comme données et décisions** : la mission simulée de Haddad (J0 → J94), les projections jusqu'à J860, les alertes, le triage et la to-do du jour, avec pour chaque décision la chaîne « donnée → modèle → norme NASA → décision ». Les pages de Walid (Body) et d'Ahmed (War Room, Raisonnement) **lisent** mes fonctions, elles ne calculent rien elles-mêmes.

## Contexte
- **Périmètre exclusif de Mouad :** `src/models/`, `src/sim/`, `scripts/generate-sim.ts`, `public/data/sim/`, `tests/models/`, plus `status/mouad.md` et ce plan.
- **Contrat :** types de `ROADMAP.md` §6 et signatures §7, **sans les changer** (ajouts seulement, via le status de Walid).
- **Règles qui me concernent le plus :** aucun vert par défaut (donnée manquante → `grey` / `DONNEES_INSUFFISANTES`) ; chaque chiffre porte son étiquette (`NASA`, `Publié`, `H`, `Persona`) et sa provenance (`RÉEL`, `SIMULÉ`, `H`) ; tout est **pré-calculé**, aucun appel réseau ; MAINTENANT ne dépend **jamais** du lien Terre.

## Qui fait quoi : Mouad et son Claude
| Mouad | Claude (son assistant de code) |
| :-- | :-- |
| Réglages GitHub (collaborateurs, app Claude, protection de `main`) | Écrit le générateur, les modèles, les règles et les tests |
| Installe Node 20+ et `gh` sur sa machine | Lance `npm test` et le générateur, vérifie les chiffres |
| Valide les choix médicaux et les seuils (relit les sorties) | Crée les branches `feature/mouad-*`, commits et PR vers `develop` |
| Merge ses PR quand les tests sont verts | Tient `status/mouad.md` à jour dans chaque PR |
| Tranche quand une règle est ambiguë | Ne touche **jamais** un fichier hors du périmètre ci-dessus |

## Le scénario simulé (persona Haddad [Persona])
- Homme, **42 ans**, mission vers Mars. **J94 = aujourd'hui = 2026-11-14**, donc J0 = 2026-08-12.
- **Graine fixe** (générateur pseudo-aléatoire `mulberry32`, graine `2029`) : la même commande donne toujours exactement les mêmes fichiers, donc des démos et des tests reproductibles.
- Chiffres à retrouver à J94 (mocks du ROADMAP §7, ils deviennent mes **tests d'or**) :

| Indicateur | Valeur attendue | Statut J94 |
| :-- | :-- | :-- |
| Hanche, perte osseuse estimée | 1,99 % à J94 · 8,70 % à J860 au rythme actuel · 4,22 % avec le plan | AMBRE (projection J860 rouge) |
| Cuisse, volume musculaire | baisse continue, tendance 7 j hors bande de bruit | AMBRE |
| Cœur / VO₂max | déficit 10,84 % à J94 · Sol 0 : 36,5 (rythme) / 37,3 (plan), limite NASA 36,5 | AMBRE |
| Nerf optique (gaine) | légère hausse | AMBRE |
| Calcium urinaire | en hausse | → hydratation + scan des reins |
| SpO₂ / hémoglobine | 97–99 % / légère baisse (anémie spatiale) | VERT / à surveiller |
| PhenoAge (prélèvement J91) | **43,1 ans** pour 42 ans réels | [Publié] |
| Check-in J94 | humeur 3/5, fatigue 3/5, douleur 1 (bas du dos) | — |

## Fichiers produits par le générateur (`public/data/sim/`)
| Fichier | Contenu | Type (§6) |
| :-- | :-- | :-- |
| `days.json` | 95 « corps du jour » J0 → J94, **uniquement les métriques que l'échographie mesure** (muscles, fluides, reins, nerf optique, cœur), chacune avec `noise` ; l'os vient du modèle `bone` (étiquette [H], jamais attribué au scanner) | `DayBody[]` |
| `blood.json` | Micro-prélèvement capillaire **hebdomadaire** (J0, J7 … J91) : hémoglobine, hématocrite, leucocytes, % lymphocytes, VGM, IDR, CRP, calcium, vitamine D, créatinine, albumine, PAL, glucose, cortisol | `BloodTest[]` |
| `urine.json` | Urine **quotidienne** : calcium urinaire, marqueur de résorption osseuse (analytes `urine_calcium`, `urine_ctx`) | `BloodTest[]` |
| `checkins.json` | Check-in du matin simulé, J0 → J94 | `CheckIn[]` |
| `watch.json` | Données montre simulées de Haddad : FC de repos, VFC, VO₂max, SpO₂, température poignet, sommeil | `Measurement[]` |
| `meta.json` | Graine, version, date de génération, persona | — |

Commande : `npx tsx scripts/generate-sim.ts` (ou `npm run sim` si Walid ajoute le script). Les JSON sont commités, la démo n'a rien à calculer au démarrage.

## Phase 0 — maintenant → bootstrap (~14:30-15:00) : TypeScript pur
Dans un brouillon hors repo, sans dépendance :
1. Générateur pseudo-aléatoire à graine + petites fonctions de bruit (gaussien borné).
2. Trajectoires par métrique (courbe de base + bruit de mesure) calées sur le tableau ci-dessus.
3. Formule **PhenoAge** + ses 4 vecteurs de test (Steve : 24,1 / 34,8 / 50,8 / 68,6 ans, ± 0,1).

## Phase 1 — sam. 16:00 : données simulées (`feature/mouad-sim` → PR `develop`)
- `scripts/generate-sim.ts` → les 6 fichiers ci-dessus.
- `src/sim/load.ts` : `getDayBody(day)`, `getDays()`, `getBloodTests(analyte?)` (capillaire + urine), `getWatchSeries(type)`, `getCheckIn(day)`.
  - Jour inconnu → `DayBody` avec organes en `grey`, jamais une erreur qui casse la page.
- Tests : déterminisme (2 générations = mêmes octets), 95 jours, aucune métrique osseuse avec `source` scanner, prélèvements tous les 7 jours, valeurs dans des plages physiologiques.

## Phase 2 — sam. 19:00 : modèles (`feature/mouad-models`)
- `bone.ts` : perte osseuse estimée de la hanche/col du fémur, recalée sur le bilan au sol (J0) + calcium urinaire ; deux scénarios « rythme actuel » / « avec le plan », avec bande d'incertitude. Norme **[NASA V1 4027]** (≥ 95 % du pré-vol, col ≥ 90 %).
- `aerobic.ts` : VO₂max ; déficit vs pré-vol, projection jusqu'à Sol 0 / J860. Normes **[NASA V1 4003/4002]** (≥ 80 % du pré-vol, ≥ 36,5 ml/kg/min).
- `radiation.ts` : dose cumulée, 1,84 mSv/j en croisière **[Publié RAD]**.
- `band.ts` : `colorWithBand(value, band, {amber, red})` → couleur de la valeur + **pire** couleur dans la bande.
- `phenoAge.ts` : `phenoAge(day)` sur le dernier prélèvement ≤ `day`, `null` s'il n'y en a pas ; `inputs` renvoyés pour la page Raisonnement.
- `bioAge.ts` : `bioAgeSeries(organId, adherence)` = âge réel + perte cumulée % / vitesse de vieillissement terrestre %/an ; `predicted: false` jusqu'à J94 (trait plein), `true` au-delà (pointillé) avec bande. Organe sans modèle → `bioAge = âge réel`, statut gris « non modélisé ».
- **Tests d'or** : 1,99 / 8,70 / 4,22 % (hanche), 10,84 % / 36,5 / 37,3 (VO₂), +2,0 / +8,7 / +4,2 ans (écart d'âge hanche), vecteurs PhenoAge, 43,1 ans à J91.

## Phase 3 — sam. 23:00 : règles (`feature/mouad-rules`)
- `trend.ts` : `trend7d(organId, metricKey, day)` = pente de régression linéaire sur les 7 derniers jours, en **%/semaine** ; `null` s'il manque des points.
- `alerts.ts` : `alertsForDay(day)` = **une alerte par organe en danger**, déclenchée par la **tendance 7 j** seulement si la pente sort de la bande de bruit (`noise`). Exception : seuil rouge NASA franchi sur **2 mesures consécutives** → alerte immédiate. Chaque alerte porte sa règle (`V1 4027`, `R13`…).
- `triage.ts` : `triage(day)` combine alertes + check-in (`todayCheckIn() ?? getCheckIn(day)`) + signes d'alerte R13 → niveau, raisons, points « Sol-routine ». Donnée expirée → `DONNEES_INSUFFISANTES`.
- `router.ts` : `router(t, pos, delayMin)` → MAINTENANT (calculé à bord) + ENSUITE (décideur, délai de réponse ≈ aller-retour radio). **Tests d'invariance** : MAINTENANT identique quels que soient `pos` et `delayMin`.

## Phase 4 — dim. 03:00 : to-do et raisonnements (`feature/mouad-planday`)
- `planDay.ts` : `planDay(day)` tire la to-do des alertes (ROADMAP §8) :
  - hanche AMBRE → ARED charge lourde + repas calcium / vitamine D + point Sol-routine ;
  - VO₂ AMBRE → vélo / tapis par intervalles ;
  - donnée manquante ou expirée → test à faire (prélèvement, check-in, PVT) ;
  - nerf optique AMBRE → test de vision + point Sol-routine (risque SANS) ;
  - calcium urinaire en hausse ou calcul au scan → hydratation + scan des reins le lendemain ;
  - humeur ≤ 2 pendant 3 jours, ou humeur basse + cortisol en hausse + sommeil dégradé → « point psy » **proposé, jamais imposé** ;
  - signes d'alerte R13 → item médical **en tête**, prévenir le CMO.
  - Exercices et repas pris dans la bibliothèque de Steve (`getExercise`, `getMeal`).
- `explain.ts` : `explain(reasoningId)` → la chaîne **donnée → modèle → norme → décision** de chaque item, chaque maillon avec sa source et son étiquette, + la limite des indicateurs [H] (écart d'âge = équivalent en années, perte en partie réversible).

## Phase 5 — dim. 08:00 : cas limites et vraies données
- Donnée expirée / manquante partout → gris, `DONNEES_INSUFFISANTES`, jamais vert.
- `getWatchSeries` fusionne les vraies mesures du présentateur (`getRealSeries`, Ahmed) avec la série simulée, étiquetées RÉEL — NON NASA.
- Relecture des sorties J94 avec l'équipe avant le gel de 14:00.

## Risques
- **Fiche v3 absente du repo** : sans elle, les modèles `bone` / `aerobic` sont calés sur les seuls chiffres des mocks. Ça suffit pour la démo, mais il faudra le dire si un juré demande la source.
- **Machine de Mouad sans Node ni `gh`** : à installer tout de suite, sinon ni générateur ni tests.
- **Retard du bootstrap** : je ne suis pas bloqué (Phase 0 en TS pur), je recopie ensuite sur `feature/mouad-*`.

## Vérification
- `npm test` : tests d'or, déterminisme du générateur, invariance du router, aucun vert sur donnée manquante.
- `npx tsx scripts/generate-sim.ts` deux fois → aucun diff git.
- Dans l'app (après branchement) : page Body à J94 avec ⚠ hanche, cuisse, cœur ; War Room avec une to-do cohérente et un « Pourquoi ? » qui remonte à la norme NASA.

## Réponses à Steve (sam. 14/11, 16:05)
- **Calcium urinaire et hémoglobine** : déjà dans le générateur. Calcium urinaire en hausse dès J15 et plateau vers J30, calcium sanguin stable dans les normes ; hémoglobine 15,2 → 14,3 g/dL de J0 à J91.
- **PhenoAge 43,1 ans à J91** : on garde le chiffre. Le générateur fait déjà monter la CRP (0,6 → 1,5 mg/L) et baisser l'albumine (45 → 42 g/L), et la CRP est calibrée automatiquement pour donner 43,1 (k = 0,090165). Tous les marqueurs restent dans les plages de référence (inflammation légère en vol, plausible).
- **Vitesses de vieillissement (§8)** : on prend les **valeurs sourcées** de `docs/sources/references-v3.2.md`, étiquette [Publié] : os 0,5 %/an (hanche, fémur, rachis), muscle 0,4 %/an (cuisse, mollet, paravertébraux), cœur 1 %/an inchangé. Déjà codé et testé (`src/models/agingRates.ts`, sur `feature/mouad-sim`). Écarts d'âge à J94 : hanche +4,0, fémur +4,4, rachis +2,0, cuisse +15,0, mollet +11,3, paravertébraux +8,8, cœur +10,8 ans. J860 hanche : +17,4 ans au rythme actuel. Le « +15 ans » de la cuisse est à assumer dans le pitch (sources mesurées sur des adultes plus âgés → plutôt sous-estimé).
- **Corrections 2 et 3** (bisphosphonates → LeBlanc 2013 [Publié] ; pas de « < 5 % avec l'ARED ») : notées, rien dans mes fichiers ne les affiche.
