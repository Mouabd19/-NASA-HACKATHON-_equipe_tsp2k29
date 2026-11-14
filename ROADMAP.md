# SOL ZÉRO — Roadmap hackathon (NASA Space Apps, Grand Palais)

> **À lire par chaque membre ET par son Claude avant de toucher au code.**
> v3 (sam. 12:40) : nouvelle interface en **2 pages** (War Room + Body Overview 3D), décidée au tableau blanc. Elle remplace les écrans de la fiche `sol-zero-fiche-v3` (silhouettes 2D, §3). Les **normes NASA, modèles et chiffres** de la fiche restent la référence.
> v3.1 (sam. 12:50) : scénario du scanner (module rotatif) et chaîne de données bord → Terre (§1).
> **Début du travail : sam. 13:30.** Temps disponible : **~29 h** (sam. 13:30 → dim. 18:30).

**Repo :** https://github.com/Mouabd19/-NASA-HACKATHON-_equipe_tsp2k29
```bash
git clone https://github.com/Mouabd19/-NASA-HACKATHON-_equipe_tsp2k29.git sol-zero
cd sol-zero
```

---

## 0. Principe : on travaille en asynchrone

- **Personne n'attend personne.** Chaque module a un **contrat fixé dans ce fichier** (types §6, signatures §7). On code contre le contrat, pas contre le code des autres.
- **Des stubs dès le départ.** Le bootstrap de Walid crée tous les fichiers de §7 avec des **données factices** (mocks). Les pages marchent tout de suite ; chacun remplace ensuite les stubs de **ses propres** fichiers.
- **Des échéances, pas de réunions.** Chacun a ses livrables (§3). Repas et sommeil libres.
- **Communication écrite** dans `status/<prénom>.md` (§5). Les Claude des autres y lisent ce qui est fait, ce qui bloque, ce qui est demandé.
- **Seuls moments synchrones :** les filages de dimanche après-midi et le jury.
- **Avant le bootstrap**, personne n'est bloqué : Mouad écrit son générateur en TS pur, Steve prépare les modèles 3D, Ahmed le parseur et le Raccourci. On recopie ensuite sur une branche `feature/*` partie de `develop`.

---

## 1. Le produit (version tableau blanc)

**Entrées :**
- **Scan corps entier type Midjourney Medical** (SIMULÉ). Un « corps du jour » est enregistré chaque jour (voir « Le scanner à bord » ci-dessous).
- **Apple Watch** (RÉEL, présentateur) : FC de repos, VFC, VO₂max estimé, **SpO₂ (% O₂ dans le sang)**, température du poignet, sommeil.
- **Prise de sang quotidienne** (SIMULÉ).
- **Normes NASA-STD-3001 Rev C** (RÉEL) pour tous les seuils rouges.

### Le scanner à bord (scénario de mission [Persona] / [H])

- **Problème :** le scanner (tomographie par ultrasons) plonge l'astronaute dans une cuve d'eau. En apesanteur, l'eau ne reste pas au fond de la cuve.
- **Solution retenue :** le vaisseau a un **module rotatif** de gravité artificielle, qui sert d'abord de **contre-mesure au déconditionnement**. Le scanner y est installé et profite de sa gravité.
  - Pas besoin de 1 g : il suffit que l'eau reste au fond. Le module tourne à **0,38 g, la gravité de Mars** : l'astronaute s'entraîne à l'arrivée, et le scanner fonctionne. Ordre de grandeur : a = ω²r, soit environ 21 m de rayon à 4 tours/min.
  - Patient **allongé**, corps parallèle à l'axe de rotation (pas de gradient de gravité tête/pieds) ; pas de scan pendant les manœuvres (ballottement).
  - Le même scanner sert ensuite **à la base martienne** (0,38 g naturels). Avant le départ et au retour : scan complet au sol.
- **Chaîne de données (le calcul qui compte) :** un scan produit environ 17 Go/s, soit **~20 To pour 20 min**. Le lien Mars–Terre fait quelques Mb/s : envoyer un seul scan brut prendrait **plus de 2 ans**. Donc :
  1. reconstruction et segmentation des organes **à bord** ;
  2. seules les **métriques par organe** (volumes, densités : quelques Ko) partent vers la Terre ;
  3. la Terre renvoie la **synthèse IA par organe** et l'avis médical, avec le délai radio réel.
- **Phrase de pitch :** « Notre module rotatif garde les astronautes en forme et fait tenir l'eau du scanner. Et vers la Terre, on n'envoie pas 20 téraoctets : on envoie 4 kilooctets. »
- **Honnêteté :** aucun vaisseau actuel n'a de module rotatif (seulement des concepts étudiés). C'est une hypothèse de mission, affichée comme telle.

### Page 1 — BODY (Overview Health)

- **Au centre :** reconstitution 3D du corps de l'astronaute, en **calques** activables :

| Calque | Ce qu'on y voit | Métriques principales |
| :-- | :-- | :-- |
| **Squelette** | Os, avec la hanche, le rachis et le col du fémur en évidence | Densité osseuse vs pré-vol (≥ 95 %, col ≥ 90 % [NASA V1 4027]) |
| **Muscles** | Muscles posturaux : cuisse, mollet, paravertébraux | Volume / atrophie vs J0 (scan) |
| **Organes** | Cœur, poumons, foie, reins, cerveau, yeux | Par organe (volume, métriques du scan, marqueurs sanguins associés) |
| **Cardiovasculaire / sang** | Cœur + réseau sanguin | VO₂max (≥ 80 % pré-vol, ≥ 36,5 ml/kg/min [NASA V1 4003/4002]), FC, **SpO₂**, tension, hémoglobine (anémie spatiale) |
| **Nerveux + yeux** | Cerveau, moelle, nerfs, nerf optique | Vigilance (PVT), sommeil, risque oculaire lié à la pression (fiche §2) |
| **Exposition** | Carte de chaleur des radiations sur le corps | Dose du jour vs prévu (1,84 mSv/j en croisière [Publié RAD]) |

- **Warnings sur le corps :** un panneau ⚠ (triangle + point d'exclamation) est **ancré en 3D** sur la zone en danger. Il pulse en ambre ou en rouge.
- **Survol d'un élément :** overlay avec le récap santé (statut, 2–3 métriques, norme NASA appliquée, **âge biologique** de l'organe vs âge réel).
- **Clic sur l'âge biologique → fenêtre organe :**
  - modèle 3D de l'organe seul, que l'on peut faire tourner ;
  - **synthèse IA** de l'état de l'organe (générée au sol, étiquetée « Synthèse IA — à valider par le CMO ») ;
  - **graphe de l'âge biologique dans le temps** : trait plein = mesuré (J0 → aujourd'hui), **pointillé = prédiction du modèle** (jusqu'à Sol 0 et J860), avec la bande d'incertitude.
- **Panneau gauche :** **résultats sanguins** du jour, chaque ligne cliquable → courbe dans le temps.
- **Widget SpO₂** (Apple Watch) avec sa courbe.
- **Timeline en bas :** on fait défiler les jours (J0 → aujourd'hui = corps enregistrés ; au-delà, jusqu'à Sol 0 / J860 = corps **projeté**, affiché en « fantôme »). Le corps change de couleur, les warnings apparaissent et disparaissent.

### Page 2 — WAR ROOM (to-do du jour)

- **En tête :** consigne du jour **MAINTENANT / ENSUITE** et délai radio du jour (fiche §6).
- **To-do list du jour**, fixée le matin (« le protocole décide, pas le moi du soir », fiche §9) :
  - **exercices** (ARED, vélo, tapis : durée, intensité) ;
  - **repas** du jour (menu, protéines, calcium, vitamine D, kcal) ;
  - **tests** à faire (prise de sang, check-in, PVT) ;
  - **actions médicales** (prévenir le CMO, point « Sol-routine » avec le médecin au sol).
- **Chaque item a un lien « Pourquoi ? » → page Raisonnement** : la chaîne **donnée → modèle → norme NASA → décision**, chaque maillon avec sa source et son étiquette.
- **To-do accessible depuis l'Apple Watch** (Raccourci iOS qui tourne sur la montre, §3 Ahmed).

### Direction artistique

Inspiration **Evangelion (interfaces NERV)** et **Cyberpunk 2077 (écran Cyberware : corps au centre, panneaux de systèmes à gauche et à droite reliés au corps par des traits fins)**, mais **sobre comme Apple / SpaceX** : noir, blanc, gris, et la couleur réservée aux statuts.

| Élément | Règle |
| :-- | :-- |
| Fond | `#050607` presque noir ; panneaux `rgba(255,255,255,0.03)`, bordure 1 px `rgba(255,255,255,0.12)`, coins en équerre (pas d'arrondis) |
| Texte | `#E8E8E6` ; secondaire `#8A8F98` |
| Corps 3D | Hologramme blanc-bleuté désaturé (`#9FB4C7`), matériau translucide avec effet fresnel, léger bloom |
| Statuts (seules couleurs vives) | OK `#30D158` · Ambre `#FF9F0A` · Rouge `#FF453A` · Inconnu `#636366` (gris = inconnu, **jamais vert par défaut**) |
| Typo | Inter pour le texte ; **JetBrains Mono en MAJUSCULES espacées** pour les labels et les données (`SYS-02 / SQUELETTE`) |
| Codes sci-fi | Traits de liaison panneau → corps, numéros de système, bandes hachurées en diagonale sur les alertes rouges, horodatage partout, panneaux hexagonaux pour les warnings |
| Interdit | Logos, polices ou éléments visuels copiés des œuvres citées. On reprend l'esprit, pas les éléments |

### Honnêteté (ce que le jury verra)

- Chaque écran porte **RÉEL**, **SIMULÉ** ou **[H]**.
- **Âge biologique = modèle de l'équipe [H]** (§8), construit sur des vitesses de perte publiées. La fiche §10 refusait l'« âge d'organe » non validé : on l'affiche donc comme **« âge biologique estimé [H] »**, avec sa formule visible dans Raisonnement.
- **Synthèse IA** : générée **hors ligne** à partir des chiffres traçables (pas d'appel réseau pendant la démo), étiquetée, jamais utilisée pour un seuil.
- **Scan Midjourney** : aucune donnée publique (fiche §10). Tous les scans sont simulés, et le pitch le dit. Le module rotatif est une hypothèse de mission [H].
- **Synthèse IA « générée au sol »** : cohérent avec la chaîne bord → Terre ci-dessus. Dans l'app, la fenêtre organe affiche « reçue de la Terre à HH:MM, délai X min ».

---

## 2. Qui fait quoi

| Rôle | Qui | Périmètre | Dossiers dont il/elle est **seul propriétaire** |
| :-- | :-- | :-- | :-- |
| **A — Body Overview 3D + intégration + release** (le plus gros morceau) | **Walid** (Claude Max) | Bootstrap, types, stubs, mocks, design system, routing ; **page Body** : scène 3D (react-three-fiber), calques, warnings 3D, survol, fenêtre organe (3D + synthèse + graphe pointillé), panneau sang, widget SpO₂, timeline ; branchement des vrais modules ; release | `src/App.tsx`, `src/types.ts`, `src/ui/` (design system), `src/pages/body/`, `src/three/`, `src/mocks/`, `package.json`, `vite.config.ts` |
| **B — War Room + Apple Watch** | **Ahmed** | **Page War Room** + **page Raisonnement** ; parseur `export.xml` (avec SpO₂) + référence 30 j ; API locale (`/api/todo`, `/ingest`) ; **Raccourci iOS sur la montre** (to-do + mesure en direct) ; mode secours | `src/pages/warroom/`, `src/pages/reasoning/`, `src/ingest/`, `server/` |
| **C — Données simulées + modèles + règles** | **Mouad** | Générateur Haddad J0 → J94 (scans, prise de sang, données montre) ; projections jusqu'à J860 ; **âge biologique** (mesuré + prédit + bande) ; alertes par organe ; triage + router ; **planificateur de la to-do** (exercices, repas, tests) ; chaînes de raisonnement ; tests d'or. Réglages du repo | `src/models/`, `src/sim/`, `scripts/generate-sim.ts`, `public/data/sim/`, `tests/models/` |
| **D — Assets 3D, science, contenus, pitch** | **Steve** | **Modèles 3D** (calques du corps + organes isolés, en `.glb`) + `manifest.json` ; normes et sources ; contenus (menus, exercices, textes) ; **synthèses IA** par organe ; `fetch-horizons` ; diapos, script, vidéos, soumission | `public/models/`, `scripts/fetch-horizons.ts`, `public/data/nasa/`, `public/data/summaries/`, `src/content/`, `docs/`, `pitch/` |

**Règle d'or :** on ne modifie **jamais** un fichier hors de son périmètre. Besoin d'un changement ailleurs → section « Demandes aux autres » de son `status/<prénom>.md`, et on continue avec le stub.

**Apple Watch :** le présentateur (= celui qui porte la montre) dépose son `export.zip` (app Santé → photo de profil → Exporter toutes les données) dans le drive de l'équipe **avant sam. 15:00**, avec la mesure **Oxygène sanguin** activée sur la montre.

---

## 3. Échéances (heure de Paris)

Repères des orgas : déjeuner sam. 13:00 · dîner sam. 19:30 · déjeuner dim. 13:00 · **1re présentation dim. 18:30** · fin des jurys 21:30.
« Livré » = mergé dans `develop`, tests verts.

### Walid (A) — Body Overview 3D
| Livré avant | Quoi |
| :-- | :-- |
| **sam. 14:30** | **Bootstrap** (§5) : scaffold, `src/types.ts` (§6), **tous les stubs** (§7), `src/mocks/`, design system de base (§1), routes `/body`, `/warroom`, `/reasoning/:id`, `status/`. **Priorité absolue.** |
| sam. 18:00 | Scène 3D avec un **corps de secours** (mannequin low-poly + organes en primitives positionnées), calques activables, survol → overlay récap (sur mocks) |
| sam. 22:00 | **Warnings 3D** ancrés (⚠ qui pulsent) ; **fenêtre organe** : 3D de l'organe + synthèse + graphe âge biologique (plein = mesuré, **pointillé = prédit**, bande) |
| dim. 02:00 | **Timeline** (J0 → aujourd'hui → Sol 0 → J860, corps fantôme dans le futur) ; panneau sang (courbes) ; widget SpO₂ |
| dim. 08:00 | Remplace le corps de secours par les **vrais .glb** de Steve ; branche les données de Mouad et d'Ahmed à la place des mocks |
| **dim. 10:00** | **Jalon MVP** (§4) : le parcours de démo tourne sans mock. Création de `release/1.0` |
| dim. 13:00 | Finitions visuelles (bloom, transitions, bandes hachurées), performances |

### Ahmed (B) — War Room + Apple Watch
| Livré avant | Quoi |
| :-- | :-- |
| sam. 16:00 | **`parseHealthExport`** en flux (y compris `OxygenSaturation`) sur le vrai export + `baseline30d` |
| sam. 20:00 | **Page War Room** sur mocks : carte MAINTENANT/ENSUITE, to-do groupée (exercices / repas / tests / médical), cases à cocher, lien « Pourquoi ? » |
| dim. 00:00 | **Page Raisonnement** : chaîne donnée → modèle → norme → décision, sources cliquables, étiquettes |
| **dim. 03:00** | **`server/api.ts`** : `GET /api/todo`, `POST /api/todo/:id/done`, `POST /ingest`, `GET /ingest/latest` ; **Raccourci iOS exécutable sur l'Apple Watch** qui affiche la to-do et coche un item (timebox : s'il ne marche pas à **dim. 09:00**, on coupe) |
| dim. 08:00 | Mesure en direct (FC / SpO₂) via Raccourci + mode secours (« dernière mesure enregistrée », saisie manuelle) ; War Room branchée sur le planificateur de Mouad |
| dim. 13:00 | Finitions, cas vides (« données insuffisantes », jamais vert) |

### Mouad (C) — Données simulées + modèles
| Livré avant | Quoi |
| :-- | :-- |
| sam. 13:45 | Réglages GitHub (collaborateurs, app Claude, protection de `main`) |
| sam. 16:00 | **`scripts/generate-sim.ts`** (graine fixe) → `public/data/sim/` : 95 `DayBody` (J0 → J94), prises de sang quotidiennes, données montre simulées de Haddad. Cohérent avec la fiche §7 |
| sam. 19:00 | Modèles de la fiche (`aerobic`, `bone`, `band`, `radiation`) + **`bioAge`** (§8) : série mesurée + prédite jusqu'à J860 avec bande ; tests d'or |
| sam. 23:00 | **`alerts`** (une alerte par organe en danger, avec niveau et règle) ; `triage` (+ Sol-routine) ; `router` + tests d'invariance |
| dim. 03:00 | **`planDay`** : la to-do du jour (exercices, repas, tests, actions médicales) tirée des alertes ; **`explain`** : la chaîne de raisonnement de chaque item |
| dim. 08:00 | Cas limites (donnée expirée → `DONNEES_INSUFFISANTES`) ; fusion des vraies données montre du présentateur |

### Steve (D) — Assets 3D, science, contenus, pitch
| Livré avant | Quoi |
| :-- | :-- |
| sam. 17:00 | **Modèles 3D** depuis **Z-Anatomy** (CC BY-SA 4.0, FBX/Blender, calques squelette / muscles / vaisseaux / nerfs / organes) : export **un .glb par calque**, décimé (< 8 Mo chacun), noms de nœuds → `organId` ; `public/models/manifest.json` (calque, fichier, organes, **position d'ancrage des warnings**) |
| sam. 20:00 | `.glb` des **organes isolés** pour la fenêtre organe (cœur, poumons, foie, reins, cerveau, œil, fémur/hanche, cuisse) |
| sam. 23:00 | `public/data/nasa/standards.json` (Rev C) ; références à vérifier (§8 : vitesses de vieillissement terrestres, normes sanguines, anémie spatiale, risque de calculs rénaux) ; `fetch-horizons` → `horizons.json` |
| dim. 02:00 | Contenus : bibliothèque d'**exercices** et de **menus** (`src/content/`) ; textes « Pourquoi ? » |
| dim. 06:00 | **Synthèses IA** par organe pour les jours clés (J0, J30, J60, J94, Sol 0, J860), générées à partir de `public/data/sim/` → `public/data/summaries/<organId>.json` |
| dim. 10:00 | Storyboard + diapos v1 (5 max) ; **vidéo de secours n° 1** dès le jalon MVP |
| dim. 13:00 | Script v2 chronométré ; test avec 2 personnes extérieures |

### Fin commune (dimanche, seule partie synchrone)
| Heure | Quoi |
| :-- | :-- |
| **14:00** | **🧊 Gel des fonctionnalités.** Plus que des `hotfix/*` sur `release/1.0` |
| 14:00–16:30 | **10 filages en mode avion, dont 3 avec la montre.** Chacun corrige son périmètre |
| 16:30 | Walid : merge `release/1.0` → `main` + tag `v1.0-demo`. Steve : **vidéo n° 2** + **soumission Space Apps** (deadline à vérifier auprès des orgas dès samedi) |
| 17:00–18:00 | 2 derniers filages, build de prod local (`npm run build && npm run preview`), chargeurs |
| **18:00** | **Prêts** |

**Sommeil :** libre, 4 h minimum. Avant de dormir : push + `status/<prénom>.md` à jour.

---

## 4. MVP gelé et règles de coupe

**MVP :**
1. Page Body : corps 3D, au moins 4 calques (squelette, muscles, organes, cardiovasculaire), survol avec récap.
2. Warnings 3D sur les zones en danger (au moins : hanche, cuisse, cœur/VO₂).
3. Fenêtre organe : synthèse + graphe âge biologique mesuré / **prédit en pointillé**.
4. Timeline J0 → J94 → projection Sol 0 / J860.
5. Résultats sanguins + SpO₂ avec courbes.
6. Page War Room : MAINTENANT/ENSUITE, to-do (exercices, repas, tests, médical), lien « Pourquoi ? » → Raisonnement.
7. Vraies données Apple Watch du présentateur (import `export.xml`).
8. Normes NASA Rev C sur tous les seuils rouges.

**Hors MVP, dans l'ordre :** to-do sur l'Apple Watch → mesure en direct → calque Nerveux + yeux → calque Exposition → 3D de l'organe dans la fenêtre (sinon image fixe) → curseur lien Terre → message du moi futur → animations.

**Règles de coupe :**
- Z-Anatomy pas exploitable à **dim. 04:00** → on garde le corps de secours stylisé (il colle au style hologramme).
- Raccourci Apple Watch pas fiable à **dim. 09:00** → to-do montrée sur l'iPhone, mesure via `export.xml` uniquement.
- Une page à plus de 30 FPS est obligatoire en démo : si la 3D rame, on réduit les polygones avant d'ajouter quoi que ce soit.
- Rien de pas fini à **dim. 14:00** ne part en démo. Un module en retard = l'interface garde le mock, étiqueté SIMULÉ.

---

## 5. Gitflow et règles pour les Claude

### Branches
| Branche | Rôle | Qui y écrit |
| :-- | :-- | :-- |
| `main` | Ce qui part en démo, tag `v1.0-demo` | Personne directement (sauf docs). Merge de `release/*` / `hotfix/*` par Walid |
| `develop` | Intégration continue | Via PR depuis `feature/*` |
| `feature/<prénom>-<sujet>` | Une feature = une branche, partie de `develop` | Son propriétaire |
| `release/1.0` | Créée au jalon MVP (dim. 10:00) | Walid (+ hotfix) |
| `hotfix/<sujet>` | Après le gel | Le propriétaire du fichier, PR vers `release/1.0` |

### Bootstrap (Walid, avant sam. 14:30)
```bash
git checkout main && git pull
git checkout -b develop
npm create vite@latest . -- --template react-ts      # garder README.md et ROADMAP.md
npm i three @react-three/fiber @react-three/drei @react-three/postprocessing recharts zustand react-router-dom
npm i -D vitest @types/three
# src/types.ts (§6), stubs (§7), src/mocks/, src/ui/tokens.ts (§1), routes, status/{walid,mouad,ahmed,steve}.md
npm test && npm run build
git add . && git commit -m "chore: bootstrap (scaffold, types, stubs, mocks, design system)"
git push -u origin develop
```
Puis sur GitHub : `develop` en branche par défaut.

### Workflow d'une feature
```bash
git checkout develop && git pull origin develop
git checkout -b feature/mouad-bioage
# ... remplacer le stub par la vraie implémentation, dans SON périmètre ...
npm test
git add -A && git commit -m "feat(models): âge biologique mesuré + prédit"
git pull --rebase origin develop
git push -u origin feature/mouad-bioage
gh pr create --base develop --fill
```
- Chacun **merge sa propre PR** vers `develop` quand les tests passent et qu'il reste dans son périmètre.
- **Changer le contrat** (§6, §7) : uniquement par **ajout** (champ optionnel, nouvelle fonction). Demande à Walid via ton status ; il fait la PR.
- **Commits** : `feat(scope): …`, `fix(scope): …`, `test(scope): …`, `docs: …`, `chore: …`. Scopes : `body`, `three`, `warroom`, `reasoning`, `ingest`, `api`, `sim`, `models`, `assets`, `content`, `pitch`.
- **Gros fichiers** : `.glb` < 8 Mo chacun. Rien au-dessus de 50 Mo dans le repo (pas de `.blend`, pas d'`export.xml` : ils vont dans le drive).
- **Petites PR, souvent** (une toutes les 1–2 h). Push avant chaque repas et avant de dormir.

### Le fichier `status/<prénom>.md` (chacun le sien uniquement)
```md
# Status — Mouad (C)
_Mis à jour : dim. 01:40_
## Livré sur develop
- generate-sim (J0–J94), bioAge (tests OK)
## En cours
- planDay (reste les repas)
## Bloqué / risques
- rien
## Demandes aux autres
- @Walid : ajouter `trend?: number` à OrganState (ajout, non cassant)
```

### Consignes pour les Claude de l'équipe
1. Lire ce fichier et les `status/*.md` avant de coder. Pour les seuils et modèles, la référence est la fiche `sol-zero-fiche-v3` (§7, tests d'or §11).
2. **Ne jamais pousser directement sur `main` ni `develop`** : branche `feature/<prénom>-<sujet>` partie de `develop`, puis PR vers `develop`.
3. Ne modifier **que** le périmètre de ton humain (§2). Sinon : demande dans le status de l'autre, et continue avec le stub.
4. Respecter **exactement** les types (§6) et signatures (§7) : les autres codent contre en parallèle.
5. `git pull --rebase origin develop` puis `npm test` avant chaque push ; mettre à jour `status/<prénom>.md` dans la même PR.
6. Chaque chiffre affiché porte `[NASA]` (+ identifiant, ex. `V1 4027`), `[Publié]`, `[H]` ou `[Persona]` ; chaque écran porte RÉEL / SIMULÉ / [H].
7. **Aucun appel réseau pendant la démo** : tout est pré-calculé dans `public/`. Pas d'appel à une API d'IA depuis l'app.
8. Respecter la direction artistique (§1) : `src/ui/tokens.ts` est la seule source des couleurs et typos.
9. Après le gel (dim. 14:00) : uniquement des `hotfix/*`.

---

## 6. Contrat de types (`src/types.ts`)

```ts
export type Color = 'green' | 'amber' | 'red' | 'grey';
export type Tag = 'NASA' | 'Publié' | 'H' | 'Persona';
export type Provenance = 'RÉEL' | 'SIMULÉ' | 'H';
export type Level = 'VERT' | 'AMBRE' | 'ORANGE' | 'ROUGE' | 'DONNEES_INSUFFISANTES';
export type LinkPos = 'ISS' | 'Lune' | 'MarsProche' | 'MarsScenario' | 'Conjonction';
export type LayerId = 'squelette' | 'muscles' | 'organes' | 'cardio' | 'nerveux' | 'exposition';
export type OrganId =
  | 'hanche' | 'rachis' | 'femur'                 // squelette
  | 'cuisse' | 'mollet' | 'paravertebraux'        // muscles
  | 'coeur' | 'poumons' | 'foie' | 'reins' | 'cerveau' | 'yeux'  // organes
  | 'sang'                                        // cardio
  | string;

export interface Metric {
  key: string;                  // 'densite_osseuse', 'volume', 'vo2max', 'spo2'...
  label: string;
  value: number;
  unit: string;
  ref?: { low?: number; high?: number; standardId?: string };
  color: Color;
  tag: Tag;
  provenance: Provenance;
}

export interface BioAgePoint {
  day: number;
  bioAge: number;
  band?: [number, number];
  predicted: boolean;           // true → tracé en pointillé
}

export interface OrganState {
  id: OrganId;
  layer: LayerId;
  name: string;
  status: Color;
  metrics: Metric[];
  chronoAge: number;
  bioAge: number;
  bioAgeTag: 'H';
}

export interface DayBody {      // le « corps du jour » (un par jour)
  day: number;                  // J0..J94 mesuré ; > 94 = projeté
  date: string;
  projected: boolean;
  organs: OrganState[];
  source: 'scan-midjourney-sim' | 'echo-bord-sim' | 'projection';
}

export interface Alert {
  id: string;
  organId: OrganId;
  level: Level;
  title: string;                // 'HANCHE — PERTE OSSEUSE'
  message: string;
  rule: string;                 // 'V1 4027' ou 'R13'
}

export interface BloodTest {
  day: number;
  analyte: 'hemoglobine' | 'hematocrite' | 'leucocytes' | 'crp' | 'calcium'
         | 'vitamine_d' | 'creatinine' | 'glucose' | 'cortisol' | string;
  value: number;
  unit: string;
  refLow: number;
  refHigh: number;
  tag: Tag;
}

export interface Measurement {
  type: 'RestingHeartRate' | 'HeartRateVariabilitySDNN' | 'VO2Max' | 'OxygenSaturation'
      | 'AppleSleepingWristTemperature' | 'SleepAnalysis' | 'HeartRate';
  value: number;
  unit: string;
  date: string;
  source: 'apple-watch-export' | 'apple-watch-live' | 'manual' | 'simulated';
}

export interface Baseline { type: Measurement['type']; mean: number; sd: number; n: number }

export interface TodoItem {
  id: string;
  kind: 'exercice' | 'repas' | 'test' | 'medical';
  title: string;                // 'ARED — squat 4×8'
  detail: string;
  time?: string;                // '07:30'
  done: boolean;
  reasoningId: string;
  priority: 1 | 2 | 3;
}

export interface ReasoningStep {
  kind: 'donnee' | 'modele' | 'norme' | 'decision';
  text: string;
  source?: { label: string; url?: string };
  tag: Tag;
}
export interface Reasoning { id: string; title: string; steps: ReasoningStep[] }

export interface RouterOutput {
  maintenant: string;           // NE DÉPEND JAMAIS du lien Terre
  ensuite: { decideur: 'moi' | 'CMO' | 'sol' | 'equipage'; reponseMin?: number; texte: string };
}

export interface TriageResult { level: Level; reasons: string[]; groundRoutine: string[] }

export interface OrganSummary { organId: OrganId; day: number; text: string; generatedBy: 'IA-sol'; reviewed: false }

export interface ModelManifest {
  layers: { id: LayerId; file: string; organs: OrganId[] }[];
  organs: { id: OrganId; file?: string; anchor: [number, number, number] }[];  // anchor = position du warning ⚠
  credits: string;              // 'Z-Anatomy — CC BY-SA 4.0'
}
```

---

## 7. Signatures des modules (les stubs du bootstrap)

Chaque fichier existe dès le bootstrap avec sa signature et un retour factice. Son propriétaire remplace l'implémentation **sans changer la signature**.

| Fichier | Propriétaire | Export(s) |
| :-- | :-- | :-- |
| `src/sim/load.ts` | Mouad | `getDayBody(day: number): DayBody` · `getDays(): number[]` · `getBloodTests(analyte?: string): BloodTest[]` · `getWatchSeries(type: Measurement['type']): Measurement[]` |
| `src/models/bioAge.ts` | Mouad | `bioAgeSeries(organId: OrganId, adherence: number): BioAgePoint[]` (mesuré J0–J94 + prédit jusqu'à J860) |
| `src/models/band.ts` | Mouad | `colorWithBand(value: number, band: [number, number], t: { amber: number; red: number }): { color: Color; worst: Color }` |
| `src/models/aerobic.ts`, `bone.ts`, `radiation.ts` | Mouad | Modèles de la fiche §7 (signatures libres, internes à Mouad) |
| `src/models/alerts.ts` | Mouad | `alertsForDay(day: number): Alert[]` |
| `src/models/triage.ts` | Mouad | `triage(day: number): TriageResult` |
| `src/models/router.ts` | Mouad | `router(t: TriageResult, pos: LinkPos, delayMin: number): RouterOutput` |
| `src/models/planDay.ts` | Mouad | `planDay(day: number): TodoItem[]` |
| `src/models/explain.ts` | Mouad | `explain(reasoningId: string): Reasoning` |
| `src/ingest/healthExport.ts` | Ahmed | `parseHealthExport(file: File, onProgress?: (pct: number) => void): Promise<Measurement[]>` |
| `src/ingest/baseline30d.ts` | Ahmed | `baseline30d(ms: Measurement[], type: Measurement['type']): Baseline` |
| `src/ingest/live.ts` | Ahmed | `latestLive(type: Measurement['type']): Promise<Measurement \| null>` |
| `src/ingest/todoSync.ts` | Ahmed | `pushTodo(items: TodoItem[]): Promise<void>` · `pullDone(): Promise<string[]>` |
| `server/api.ts` | Ahmed | Plugin Vite : `GET /api/todo`, `POST /api/todo/:id/done`, `POST /ingest` (objet plat `{type, value, unit, date}`), `GET /ingest/latest` |
| `src/pages/warroom/WarRoom.tsx` | Ahmed | `export function WarRoom(): JSX.Element` |
| `src/pages/reasoning/Reasoning.tsx` | Ahmed | `export function ReasoningPage(): JSX.Element` (lit `:id` dans l'URL) |
| `src/pages/body/Body.tsx` | Walid | `export function Body(): JSX.Element` |
| `src/content/library.ts` | Steve | `getExercise(id: string)` · `getMeal(id: string)` · `whyText(rule: string): string` |
| `src/content/summaries.ts` | Steve | `getSummary(organId: OrganId, day: number): OrganSummary \| null` (jour clé le plus proche) |
| `src/content/standards.ts` | Steve | `getStandard(id: string): { id: string; title: string; quote: string; url: string; verified: boolean }` |
| `src/content/horizons.ts` | Steve | `lightTimeMin(date: string): number` (test : 11,01 le 2026-11-14) |
| `public/models/manifest.json` | Steve | Format `ModelManifest` (§6) |

**Mocks (Walid, `src/mocks/`)** — chiffres de la fiche §7, pour que tout s'affiche avant les vrais modules :
- Haddad, 42 ans [Persona], J94. VO₂ : déficit 10,84 % à J94 ; Sol 0 : 36,5 (rythme actuel) / 37,3 (avec le plan).
- Hanche : perte 1,99 % à J94 ; J860 : 8,70 % (rythme) / 4,22 % (plan).
- Alertes J94 : hanche AMBRE (projection J860 rouge), cuisse AMBRE, cœur/VO₂ AMBRE (Sol 0 à la limite 36,5).
- SpO₂ 97–99 %, hémoglobine en légère baisse (anémie spatiale).

---

## 8. Modèles nouveaux (Mouad), à sourcer (Steve)

### Âge biologique estimé [H]
Idée : « combien d'années de vieillissement terrestre représente la perte subie en vol ».

```
bioAge(organe, jour) = âgeRéel(jour) + perteCumulée%(organe, jour) / vitesseVieillissementTerre%/an(organe)
```

| Organe | Perte en vol (source) | Vitesse de vieillissement terrestre [H, à sourcer par Steve] |
| :-- | :-- | :-- |
| Hanche | Modèle `bone` (fiche §7) | ≈ 1 %/an |
| Cuisse / mollet | Volume au scan vs J0 | ≈ 1 %/an |
| Cœur (VO₂max) | Modèle `aerobic` (fiche §7) | ≈ 1 %/an (≈ 10 %/décennie) |
| Autres organes | Pas de modèle → `bioAge = âgeRéel`, statut **gris** (« non modélisé ») | — |

Exemple : hanche à J94, perte 1,99 % → **+2,0 ans** ; à J860 au rythme actuel, 8,70 % → **+8,7 ans** ; avec le plan, 4,22 % → **+4,2 ans**. La **prédiction** (pointillé) prolonge `bone`/`aerobic` avec leur bande.

### Prise de sang quotidienne (SIMULÉ)
Analytes : hémoglobine, hématocrite, leucocytes, CRP, calcium, vitamine D, créatinine, glucose, cortisol. Valeurs de référence terrestres + tendances spatiales connues (baisse de l'hémoglobine liée à l'anémie spatiale, hausse du calcium liée à la perte osseuse → risque de calculs rénaux). **Steve vérifie les sources** et les met dans `standards.json` / Raisonnement.

### Planificateur de la to-do (`planDay`)
Chaque alerte produit des items, chaque item garde son `reasoningId` :
- hanche AMBRE → ARED charge lourde (squat, soulevé de terre) + repas riche en calcium / vitamine D + point Sol-routine (bisphosphonates, fiche §6) ;
- VO₂ AMBRE → vélo / tapis par intervalles ;
- donnée manquante ou expirée → test à faire (prise de sang, check-in, PVT) ;
- signes d'alerte (fiche R13) → item médical **en tête**, prévenir le CMO.

---

## 9. Démo de 3 minutes (à affiner par Steve)

| Temps | Ce qu'on montre |
| :-- | :-- |
| 0:00–0:15 | Accroche : « Pourrez-vous marcher en sortant du vaisseau ? » + délai radio du jour |
| 0:15–0:45 | **Body** : le corps 3D de Haddad à J94 (scan du matin dans le module rotatif, métriques envoyées à la Terre, synthèse reçue), calques, un ⚠ sur la hanche |
| 0:45–1:20 | Survol → récap ; clic → fenêtre organe : synthèse IA, âge biologique +2 ans, **pointillé** vers +8,7 ans au retour |
| 1:20–1:45 | **Timeline** J0 → J94 → Sol 0 : le corps fantôme se dégrade ; on active le plan → il se dégrade moins |
| 1:45–2:10 | **RÉEL** : SpO₂ et FC du présentateur depuis sa montre, comparés à sa référence |
| 2:10–2:45 | **War Room** : la to-do du jour, « Pourquoi ? » → la chaîne jusqu'à la norme NASA ; la même to-do sur la montre |
| 2:45–3:00 | Conclusion |

---

## 10. Définition de « fini » et checklist démo

**Avant de merger dans `develop` :**
- [ ] Signature identique au stub (§7).
- [ ] Tests verts (dont les tests d'or de la fiche §11 pour les modèles).
- [ ] Marche **sans réseau**.
- [ ] Aucun vert par défaut quand la donnée manque.
- [ ] Étiquettes RÉEL / SIMULÉ / [H] présentes.
- [ ] `status/<prénom>.md` à jour.

**Checklist démo (dim. 17:00) :**
- [ ] `main` taggé `v1.0-demo`, build de prod local qui tourne en mode avion, > 30 FPS sur la page Body.
- [ ] Export Santé du présentateur chargé ; plan B « dernière mesure » testé.
- [ ] Raccourci to-do testé sur la montre (ou retiré du script).
- [ ] Crédit Z-Anatomy (CC BY-SA 4.0) visible dans l'app et le README.
- [ ] Vidéos de secours n° 1 et n° 2 sur 2 ordinateurs + une clé USB.
- [ ] Diapos (5 max) + script chronométré à 3:00.
- [ ] Soumission Space Apps faite.
