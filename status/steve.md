# Status — Steve (D)
_Mis à jour : sam. 15:00_

## Livré (poussé sur `feature/steve-models` ; PR vers `develop` dès que Walid aura créé la branche)
- **Modèles 3D** (jalon 17:00, en avance) : `public/models/{squelette,muscles,organes,cardio,nerveux}.glb` (170–260 k triangles chacun, 1,2–2,9 Mo, ~1 M triangles si tout est affiché) + `manifest.json` (ancres des ⚠) + `CREDITS.md`.
- **Organes isolés** (jalon 20:00, en avance) : `public/models/organs/<organId>.glb` pour coeur, poumons, foie, reins, cerveau, yeux, hanche, femur, rachis, cuisse, mollet, paravertebraux. Centrés à l'origine.
- **Normes NASA Rev C** : `public/data/nasa/standards.json` (13 entrées : V1 4001/4002/4003/4027/4030/3006/5003/4011/6001/6004/6010/7001 + glossaire bisphosphonates), citations relues dans le PDF, `verified` + `partialQuote`. `src/content/standards.ts` → `getStandard(id)` (signature §7 ; id inconnu → `verified: false`).
- **PhenoAge** : coefficients vérifiés + vecteurs de test → `docs/sources/phenoage.md`.

## En cours
- `fetch-horizons` + `horizons.ts` (étape 2), puis références v3.2 (étape 3). Jalon 23:00.

## Bloqué / risques
- ⚠ **Correction de la fiche** : la dose de carrière 600 mSv est **[V1 4030]**. Et la Rev C ne contient **pas** l'affirmation « bisphosphonates → perte ~0 % » ni « < 5 % de perte à la hanche avec l'ARED » (attribuées à la justification de V1 4027) : les bisphosphonates n'y sont que dans le glossaire. Ne pas afficher ces chiffres en [NASA] tant que je n'ai pas trouvé la vraie source (étape 3).
- Licence des modèles : **CC BY-NC-SA 4.0** (rein + oreille interne NC). OK pour le hackathon uniquement ; crédit visible obligatoire dans l'app et le README.
- Constante finale de PhenoAge : 0.090165 (Aging 2018) vs 0.09165 (correction PLOS Med 2019). Recommandation : 0.090165.

## Demandes aux autres
- @Mouad / @Ahmed : `rule` des alertes et `standardId` des métriques = ids de `standards.json` (`'V1 4027'`, `'V1 4030'`…).
- @Walid : charger avec `useGLTF(url, false, true)` (**meshopt**, pas de Draco → pas de décodeur CDN). Organes repérés par `userData.organId`. Ancres du ⚠ dans `manifest.json` (+Z = avant ; `rachis` et `paravertebraux` sont ancrés dans le dos). Crédits de `public/models/CREDITS.md` à afficher dans l'app.
- @Walid : le calque `cardio.glb` a 4 nœuds : `coeur`, `aorte`, **`arteres`**, **`veines`** (+ `cardio:reste`, quasi vide). Choix de Steve : teinte artères rouge / veines bleu dans ce calque (exception assumée à « couleur = statut seulement »). `arteres` et `veines` sont des `organId` en plus du contrat (`OrganId` accepte `string`, donc non cassant). `sang` reste ancré sur l'aorte, sans fichier.
- @Mouad : PhenoAge → `docs/sources/phenoage.md` (formule SI, conversions, tests d'or). Pour le mock « 43,1 ans à J91 », le générateur doit dégrader CRP / albumine / IDR, sinon on sort ~35 ans.
