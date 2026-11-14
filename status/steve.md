# Status — Steve (D)
_Mis à jour : sam. 18:20_

## Livré (poussé sur `feature/steve-models` ; PR vers `develop` dès que Walid aura créé la branche)
- **Modèles 3D** (jalon 17:00, en avance) : `public/models/{squelette,muscles,organes,cardio,nerveux}.glb` (170–260 k triangles chacun, 1,2–2,9 Mo, ~1 M triangles si tout est affiché) + `manifest.json` (ancres des ⚠) + `CREDITS.md`.
- **Organes isolés** (jalon 20:00, en avance) : `public/models/organs/<organId>.glb` pour coeur, poumons, foie, reins, cerveau, yeux, hanche, femur, rachis, cuisse, mollet, paravertebraux. Centrés à l'origine.
- **Normes NASA Rev C** : `public/data/nasa/standards.json` (13 entrées : V1 4001/4002/4003/4027/4030/3006/5003/4011/6001/6004/6010/7001 + glossaire bisphosphonates), citations relues dans le PDF, `verified` + `partialQuote`. `src/content/standards.ts` → `getStandard(id)` (signature §7 ; id inconnu → `verified: false`).
- **Délai radio** : `scripts/fetch-horizons.ts` (vraie API JPL Horizons) + `src/content/horizons.ts` → `lightTimeMin(date)` (test : **11,016 min le 2026-11-14** ✓) + ajouts non cassants `isConjunction(date)` (conjonction 2028-03-08 → 2028-04-03) et `horizonsTag`. Mission J0 = 2026-08-12 → J860.
- **Sources v3.2** : `public/data/nasa/references.json` (15 sources vérifiées) + synthèse `docs/sources/references-v3.2.md` (anémie, calcium urinaire, bisphosphonates, nerf optique, échographie/os, centrifugeuse AGBRESA, Oh 2023, vitesses de vieillissement terrestre).
- **Bibliothèque de contenus** (jalon dim. 02:00, en avance) : `src/content/library.ts` → `getExercise(id)`, `getMeal(id)`, `whyText(rule)` (signatures §7) + ajouts `listExercises()`, `listMeals()`, `listWhyRules()`. 9 exercices sourcés NASA (OCHMO), 6 menus [H], 6 tests (`getTest`, ajout), 16 textes « Pourquoi ? ». Contrat `whyText` : renvoie TOUJOURS une chaîne (repli si règle inconnue) ; `hasWhy(rule)` (ajout) pour savoir si elle est documentée.
- **PhenoAge** : coefficients vérifiés + vecteurs de test → `docs/sources/phenoage.md`.

## En cours
- **Prototype santé mentale (§11)**, dossiers `proto/mental/` + `public/data/mental/` : générateur de journées simulées (glissement à J75 + témoin) ✅, 3 observateurs + 3 psychologues + dossier pour le psy humain ✅ (testé à blanc). Moteur : **API Claude** (Haiku 5.5 utilisé, Sonnet 5.5 par défaut) si `ANTHROPIC_API_KEY` est défini, sinon Ollama local (testé, trop lent). ✅ **Résultats figés** (Claude Haiku 5.5, seuils précisés) dans `public/data/mental/` + page `proto/mental/viewer.html` (ouvrir dans un navigateur, hors ligne). Trouble (dès J75) : J74 rien → J85 à surveiller → **J94 proposer un échange (3/3)**. Témoin : **0 proposition d'échange**, 4/5 jours « rien » (J65 = mauvais jour de fond, présent dans les deux scénarios). Seuils calibrés sur des données simulées : à dire tel quel dans le pitch. Page de visualisation pour la capture : `node proto/mental/build-viewer.mjs` → `proto/mental/viewer.html` (autonome, hors ligne). Biomarqueurs provisoires dans le proto : à brancher sur ceux de Mouad quand `public/data/sim/` existe.
- Jalons 23:00 et 02:00 **livrés**. Suite : script des synthèses IA par organe (06:00), dès que `public/data/sim/` de Mouad est poussé.

## Bloqué / risques
- `horizons.json` est **PROVISOIRE** (calcul local, `provisional: true`, étiquette [H]) : mon environnement ne joint pas ssd.jpl.nasa.gov. **Quelqu'un doit lancer `npx tsx scripts/fetch-horizons.ts` sur son portable** (30 s) avant le gel pour avoir la vraie donnée [NASA]. Écart attendu < 0,01 min.
- ⚠ **Correction de la fiche** : la dose de carrière 600 mSv est **[V1 4030]**. Et la Rev C ne contient **pas** l'affirmation « bisphosphonates → perte ~0 % » ni « < 5 % de perte à la hanche avec l'ARED » (attribuées à la justification de V1 4027) : les bisphosphonates n'y sont que dans le glossaire. Ne pas afficher ces chiffres en [NASA] tant que je n'ai pas trouvé la vraie source (étape 3).
- Licence des modèles : **CC BY-NC-SA 4.0** (rein + oreille interne NC). OK pour le hackathon uniquement ; crédit visible obligatoire dans l'app et le README.
- Constante finale de PhenoAge : 0.090165 (Aging 2018) vs 0.09165 (correction PLOS Med 2019). Recommandation : 0.090165.

## Demandes aux autres
- @Walid **(bloque la PR vers develop)** : `develop` a été mergé dans `feature/steve-models`, le code compile et le build passe, mais **5 de tes tests vérifient les valeurs provisoires des stubs** et échouent avec les vraies implémentations. Proposition de mise à jour (c'est ton périmètre, dis-moi si tu préfères que je le fasse dans la PR) :
  1. `délai radio` : `toBe(11.01)` → `toBeCloseTo(11.01, 1)` (horizons.json donne 11,016 ; provisoire tant que fetch-horizons n'a pas tourné) ;
  2. `normes … non vérifiées` : les 3 normes sont maintenant **vérifiées** (`verified: true`, citations relues) ;
  3. `bibliothèque` : ids réels `ared-squat` et `menu-calcium-vitd` (au lieu de `ared-squat-sdt`, `dej-calcium`) ;
  4. `lightTimeSource` : la table couvre toute la mission J0 → J860, donc '2027-03-10' est `'table'` ; une date hors mission (ex. '2030-01-01') est `'approx'` ;
  5. `manifest — ancres` : les ancres sont maintenant celles des vrais modèles Z-Anatomy (calculées sur la géométrie), plus celles du corps procédural.
- @Walid : `manifest.json` suit le contrat (6 calques, chaque organe dans un seul calque) + 2 champs en plus : `avatar: 'avatar.glb'` (silhouette Z-Anatomy de Haddad, en cours, pour remplacer ton enveloppe procédurale et porter la carte de dose) et `extraNodes` (organId présents dans chaque .glb, dont `arteres`, `veines`, `aorte`). Peux-tu ajouter `avatar?: string` à `ModelManifest` (ajout non cassant) ?
- @Ahmed : ✅ tests ajoutés : `test-pvt`, `test-vision`, `test-prelevement`, `test-urine`, `test-echo-reins`, `test-checkin` via `getTest(id)` (ajout). `whyText` ne renvoie jamais null : phrase de repli + `hasWhy(rule)`.
- @Ahmed : **ids de la bibliothèque** (`src/content/library.ts`) à utiliser dans tes mocks de to-do et par Mouad dans `planDay` :
  - exercices : `ared-squat`, `ared-souleve-de-terre`, `ared-mollets`, `velo-intervalles`, `velo-continu`, `tapis-intervalles`, `tapis-continu`, `mobilite-dos`, `respiration` ;
  - repas : `menu-calcium-vitd`, `menu-proteines`, `menu-anti-calculs`, `menu-standard`, `menu-recuperation`, `menu-diner-leger` ;
  - « Pourquoi ? » : `whyText(rule)` avec `rule` = id de norme (`'V1 4027'`, `'V1 4003'`, `'V1 4002'`, `'V1 4030'`…) ou règle (`'R13'`, `'sol-routine'`, `'calcium-urinaire'`, `'nerf-optique'`, `'point-psy'`, `'anemie'`, `'donnees-manquantes'`, `'exercice-quotidien'`).
  Id inconnu → `null` (ou texte générique pour `whyText`), jamais d'exception. Besoin d'un autre id ? Dis-le dans ton status.
- @Mouad : mêmes ids pour `planDay` (hanche AMBRE → `ared-squat` + `ared-souleve-de-terre` + `menu-calcium-vitd` ; VO₂ AMBRE → `velo-intervalles` / `tapis-intervalles` ; calcium urinaire → `menu-anti-calculs`).
- @Mouad : ✅ réponses lues (vieillissement sourcé, PhenoAge 43,1, urine). Pitch : présenter la cuisse « +15 ans » comme un **équivalent** en années de vieillissement normal, en partie réversible.
- @Mouad : ✅ fiche dans le repo → `docs/sol-zero-fiche-v3.md`. ✅ **Sol 0 = J180** (2027-02-08 ; 180 j d'aller), confirmé par Steve. Vitesses de vieillissement : voir ligne ci-dessous.
- @Mouad **(décision à prendre)** : vitesses de vieillissement terrestre sourcées = hanche **0,5 %/an**, muscle **0,4 %/an**, VO₂ 1 %/an (au lieu de 1 %/an partout). Avec la formule §8 : hanche J94 → **+4,0 ans**, J860 → +17,4 (rythme) / +8,4 (plan). Garder 1 %/an = hypothèse prudente [H] à afficher comme telle. Détail : `docs/sources/references-v3.2.md`.
- @Mouad : calcium suivi dans l'**urine** (monte dès J15–J30, NTX aussi) ; calcium sanguin stable. Hémoglobine : baisse lente sur toute la mission (anémie spatiale, réversible après retour).
- @Ahmed : étiquettes Raisonnement — bisphosphonates = [Publié] LeBlanc 2013 (`leblanc2013`), PAS [NASA].
- @Mouad / @Ahmed : `rule` des alertes et `standardId` des métriques = ids de `standards.json` (`'V1 4027'`, `'V1 4030'`…).
- @Walid : charger avec `useGLTF(url, false, true)` (**meshopt**, pas de Draco → pas de décodeur CDN). Organes repérés par `userData.organId`. Ancres du ⚠ dans `manifest.json` (+Z = avant ; `rachis` et `paravertebraux` sont ancrés dans le dos). Crédits de `public/models/CREDITS.md` à afficher dans l'app.
- @Walid : le calque `cardio.glb` a 4 nœuds : `coeur`, `aorte`, **`arteres`**, **`veines`** (+ `cardio:reste`, quasi vide). Choix de Steve : teinte artères rouge / veines bleu dans ce calque (exception assumée à « couleur = statut seulement »). `arteres` et `veines` sont des `organId` en plus du contrat (`OrganId` accepte `string`, donc non cassant). `sang` reste ancré sur l'aorte, sans fichier.
- @Mouad : PhenoAge → `docs/sources/phenoage.md` (formule SI, conversions, tests d'or). Pour le mock « 43,1 ans à J91 », le générateur doit dégrader CRP / albumine / IDR, sinon on sort ~35 ans.
