# SOL ZÉRO — Roadmap hackathon (NASA Space Apps, Grand Palais)

> **À lire par chaque membre ET par son Claude avant de toucher au code.**
> v3 (sam. 12:40) : nouvelle interface en **2 pages** (War Room + Body Overview 3D), décidée au tableau blanc. Elle remplace les écrans de la fiche `sol-zero-fiche-v3` (silhouettes 2D, §3). Les **normes NASA, modèles et chiffres** de la fiche restent la référence.
> v3.1 (sam. 12:50) : scénario du scanner (module rotatif) et chaîne de données bord → Terre (§1).
> v3.2 (sam. 13:20, revue mentor) : le scanner ne mesure **que ce que l'échographie sait mesurer** (muscle, fluides, reins, nerf optique, cœur) ; la densité osseuse vient du **sol + modèle + marqueurs** ; module rotatif → **centrifugeuse à bras court** ; âge biologique global = **PhenoAge [Publié]** ; alertes sur **tendance 7 j** ; **check-in humeur** + santé mentale (§1, §8, §11) ; démo recentrée sur **aujourd'hui** (§9). Les types (§6) ne changent **que par ajout**.
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

**Phrase signature :** « L'astronaute sait **ce matin** dans quel état il est et **quoi faire**, sans attendre la Terre, et peut vérifier **pourquoi** jusqu'à la norme NASA. »

**Entrées :**
- **Scan corps entier type Midjourney Medical** (SIMULÉ). Un « corps du jour » est enregistré chaque jour, avec **uniquement les métriques que l'échographie sait mesurer** (voir « Le scanner à bord » ci-dessous).
- **Apple Watch** (RÉEL, présentateur) : FC de repos, VFC, VO₂max estimé, **SpO₂ (% O₂ dans le sang)**, température du poignet, sommeil.
- **Analyses biologiques** (SIMULÉ) : **urine quotidienne** (calcium, marqueurs de résorption osseuse) + **micro-prélèvement capillaire hebdomadaire** (hémoglobine, CRP, glucose, créatinine, albumine, cortisol…). Une prise de sang veineuse quotidienne serait invasive et irréaliste en vol.
- **Check-in du matin** (RÉEL, saisi en démo) : humeur, fatigue, douleur, sommeil ressenti, en **2 taps** chacun.
- **Normes NASA-STD-3001 Rev C** (RÉEL) pour tous les seuils rouges.

**Couverture des mesures citées par le défi** (un juré compte) :

| Citée par le défi | Où dans SOL ZÉRO |
| :-- | :-- |
| Fréquence cardiaque | Apple Watch (RÉEL) |
| Tension artérielle | Calque cardio (SIMULÉ) |
| Glycémie | Prélèvement capillaire (SIMULÉ) |
| Température | Poignet Apple Watch (RÉEL) |
| Sommeil | Apple Watch (RÉEL) + check-in |
| Humeur | Check-in du matin (RÉEL) + indicateurs de santé mentale (§11) |

### Le scanner à bord (scénario de mission [Persona] / [H])

- **Problème :** le scanner (tomographie par ultrasons) plonge l'astronaute dans une cuve d'eau. En apesanteur, l'eau ne reste pas au fond de la cuve.
- **Solution retenue :** le scanner est installé dans une **centrifugeuse à bras court**. Ce type d'équipement existe **au sol** (ESA/DLR, Cologne), où on l'étudie comme **contre-mesure au déconditionnement**, et son embarquement fait partie des pistes publiées. Aucun équipement de ce type ne vole aujourd'hui : c'est notre **hypothèse de mission [H]**.
  - **Pas besoin de beaucoup de gravité :** il suffit que l'eau reste au fond et que les bulles d'air remontent. Avec a = ω²r et un rayon de 3 m : **≈ 0,1 g à ~5,5 tr/min** suffit pour le scan. On peut monter à **0,38 g (gravité de Mars) à ~10,6 tr/min** pour les séances d'entraînement.
  - Patient **allongé et immobile** (les mouvements de tête en centrifugeuse donnent le mal des transports), corps parallèle à l'axe de rotation (pas de gradient de gravité tête/pieds) ; pas de scan pendant les manœuvres (ballottement).
  - Le scan est couplé à la séance de centrifugeuse : **pas de temps d'équipage en plus**.
  - Le même scanner sert ensuite **à la base martienne** (0,38 g naturels). Avant le départ et au retour : bilan complet au sol, **densitométrie osseuse comprise**.
- **Ce que le scanner mesure (et ne mesure pas) :**

| Mesure | Rythme | Pourquoi |
| :-- | :-- | :-- |
| Volume des muscles posturaux (cuisse, mollet, paravertébraux) | quotidien, alerte sur tendance 7 j | L'atrophie musculaire est le point fort de l'échographie et un risque spatial majeur |
| **Déplacement des fluides** (volume des jambes, œdème visage/cou) | **quotidien** | En apesanteur, les fluides montent vers la tête ; ça varie d'un jour à l'autre |
| Reins : présence et taille de **calculs** | hebdo (quotidien si alerte calcium) | Le calcium libéré par les os augmente le risque de calculs ; l'échographie les détecte bien |
| **Diamètre de la gaine du nerf optique** | quotidien | Reflet de la pression intracrânienne → risque oculaire SANS. Cette mesure se fait **déjà par échographie sur l'ISS** |
| Cœur : taille, fraction d'éjection | hebdo | Atrophie cardiaque en apesanteur |
| ✗ **Densité osseuse** | — | L'os renvoie presque toute l'onde ultrasonore : Midjourney ne publie aucune précision sur l'os. La densité vient du **bilan au sol** (avant/après), du **modèle `bone`** et des **marqueurs urinaires** quotidiens |

- **Bruit de mesure :** un scan quotidien coûte peu en stockage (« qui peut le plus peut le moins »), mais une valeur du jour peut être bruitée. On **affiche** le point du jour, on **alerte** seulement sur la **tendance des 7 derniers jours**, avec la bande de bruit de mesure.
- **Chaîne de données (le calcul qui compte) :** un scan produit environ 17 Go/s, soit **~20 To pour 20 min**. Le lien Mars–Terre fait quelques Mb/s : envoyer un seul scan brut prendrait **plus de 2 ans**. Donc :
  1. reconstruction et segmentation des organes **à bord** ;
  2. seules les **métriques par organe** (volumes, densités : quelques Ko) partent vers la Terre ;
  3. la Terre renvoie la **synthèse IA par organe** et l'avis médical, avec le délai radio réel. Cette synthèse arrive dans **ENSUITE**, jamais dans MAINTENANT, qui se calcule **à bord** à partir des seuils NASA. (Vision : IA embarquée.)
- **Phrase de pitch :** « Notre centrifugeuse garde les astronautes en forme et fait tenir l'eau du scanner. Et vers la Terre, on n'envoie pas 20 téraoctets : on envoie 4 kilooctets. »
- **Honnêteté :** aucun vaisseau actuel n'a de centrifugeuse pour l'équipage (seulement des prototypes au sol et des concepts). Le scanner Midjourney n'a **pas encore de données de précision publiées**. Les deux sont des hypothèses de mission, affichées comme telles.

### Page 1 — BODY (Overview Health)

- **Au centre :** reconstitution 3D du corps de l'astronaute, en **calques** activables :

| Calque | Ce qu'on y voit | Métriques principales |
| :-- | :-- | :-- |
| **Squelette** | Os, avec la hanche, le rachis et le col du fémur en évidence | Densité osseuse **estimée** vs pré-vol (≥ 95 %, col ≥ 90 % [NASA V1 4027]) : modèle `bone` recalé sur le bilan au sol + marqueurs urinaires (**pas** mesurée par le scanner) |
| **Muscles** | Muscles posturaux : cuisse, mollet, paravertébraux | Volume / atrophie vs J0 (scan, tendance 7 j) |
| **Organes** | Cœur, reins (+ poumons, foie, cerveau en gris « non modélisé ») | Cœur : taille, fraction d'éjection (scan) ; reins : calculs (scan) + calcium urinaire |
| **Cardiovasculaire / sang** | Cœur + réseau sanguin + fluides | VO₂max (≥ 80 % pré-vol, ≥ 36,5 ml/kg/min [NASA V1 4003/4002]), FC, **SpO₂**, tension, hémoglobine (anémie spatiale), **déplacement des fluides** (volume des jambes, scan) |
| **Nerveux + yeux** | Cerveau, moelle, nerfs, nerf optique | **Diamètre de la gaine du nerf optique** (scan) → risque SANS ; vigilance (PVT), sommeil, humeur (check-in) |
| **Exposition** | Carte de chaleur des radiations sur le corps | Dose du jour vs prévu (1,84 mSv/j en croisière [Publié RAD]) |

- **Warnings sur le corps :** un panneau ⚠ (triangle + point d'exclamation) est **ancré en 3D** sur la zone en danger. Il pulse en ambre ou en rouge.
- **Survol d'un élément :** overlay avec le récap santé **du jour** (statut, 2–3 métriques, norme NASA appliquée, tendance 7 j, **écart d'âge** de l'organe [H]).
- **En tête de page :** l'**âge biologique global** (PhenoAge [Publié], calculé sur le dernier prélèvement) vs l'âge réel, et le **statut du jour**. La page s'ouvre sur **aujourd'hui** ; la projection n'arrive qu'en faisant défiler la timeline.
- **Clic sur l'âge biologique → fenêtre organe :**
  - modèle 3D de l'organe seul, que l'on peut faire tourner ;
  - **synthèse IA** de l'état de l'organe (générée au sol, étiquetée « Synthèse IA — à valider par le CMO ») ;
  - **graphe de l'âge biologique dans le temps** : trait plein = mesuré (J0 → aujourd'hui), **pointillé = prédiction du modèle** (jusqu'à Sol 0 et J860), avec la bande d'incertitude.
- **Panneau gauche :** **résultats sanguins** du jour, chaque ligne cliquable → courbe dans le temps.
- **Widget SpO₂** (Apple Watch) avec sa courbe.
- **Timeline en bas :** on fait défiler les jours (J0 → aujourd'hui = corps enregistrés ; au-delà, jusqu'à Sol 0 / J860 = corps **projeté**, affiché en « fantôme »). Le corps change de couleur, les warnings apparaissent et disparaissent.

### Page 2 — WAR ROOM (to-do du jour)

- **En tête :** consigne du jour **MAINTENANT / ENSUITE** et délai radio du jour (fiche §6). MAINTENANT se calcule à bord ; la synthèse IA de la Terre et l'avis du médical au sol vont dans ENSUITE (« reçu à HH:MM, délai X min »).
- **Check-in du matin** (premier écran de la journée, ≤ 30 s) : humeur, fatigue, douleur, sommeil ressenti. C'est **l'auto-évaluation**, et elle alimente le triage du jour.
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
- **Âge biologique global = PhenoAge [Publié]** (Levine et al., 2018), calculé à partir de la prise de sang. **Écart d'âge par organe = indicateur de l'équipe [H]** (§8), affiché comme **« écart d'âge estimé [H] »**, avec sa formule et sa limite visibles dans Raisonnement : la perte osseuse ou musculaire spatiale est en partie réversible ; ce n'est pas du vieillissement, mais un équivalent en années.
- **Bénéfice sur Terre :** le même suivi (muscle, fluides, os) sert aux patients alités, à la sarcopénie des personnes âgées et aux sites isolés (bases polaires comme Concordia). **Métrique d'impact :** perte de la hanche à J860 de 8,70 % au rythme actuel contre 4,22 % avec le plan suivi [H].
- **Synthèse IA** : générée **hors ligne** à partir des chiffres traçables (pas d'appel réseau pendant la démo), étiquetée, jamais utilisée pour un seuil.
- **Scan Midjourney** : aucune donnée publique (fiche §10). Tous les scans sont simulés, et le pitch le dit. Aucune métrique osseuse n'est attribuée au scanner. La centrifugeuse embarquée est une hypothèse de mission [H].
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
| sam. 20:00 | **Page War Room** sur mocks : **check-in du matin** (humeur, fatigue, douleur, sommeil ressenti, 2 taps chacun → `CheckIn`), carte MAINTENANT/ENSUITE, to-do groupée (exercices / repas / tests / médical), cases à cocher, lien « Pourquoi ? » |
| dim. 00:00 | **Page Raisonnement** : chaîne donnée → modèle → norme → décision, sources cliquables, étiquettes |
| **dim. 03:00** | **`server/api.ts`** : `GET /api/todo`, `POST /api/todo/:id/done`, `POST /ingest`, `GET /ingest/latest` ; **Raccourci iOS exécutable sur l'Apple Watch** qui affiche la to-do et coche un item (timebox : s'il ne marche pas à **dim. 09:00**, on coupe) |
| dim. 08:00 | Mesure en direct (FC / SpO₂) via Raccourci + mode secours (« dernière mesure enregistrée », saisie manuelle) ; War Room branchée sur le planificateur de Mouad |
| dim. 13:00 | Finitions, cas vides (« données insuffisantes », jamais vert) |

### Mouad (C) — Données simulées + modèles
| Livré avant | Quoi |
| :-- | :-- |
| sam. 13:45 | Réglages GitHub (collaborateurs, app Claude, protection de `main`) |
| sam. 16:00 | **`scripts/generate-sim.ts`** (graine fixe) → `public/data/sim/` : 95 `DayBody` (J0 → J94) avec **uniquement les métriques du scanner** (§1 : muscle, fluides, reins, nerf optique, cœur) **+ bruit de mesure**, urine quotidienne, prélèvement capillaire hebdo, check-ins simulés, données montre simulées de Haddad. Cohérent avec la fiche §7 |
| sam. 19:00 | Modèles de la fiche (`aerobic`, `bone`, `band`, `radiation`) + **`phenoAge`** (PhenoAge, §8) + **`bioAge`** (écart par organe [H]) : série mesurée + prédite jusqu'à J860 avec bande ; tests d'or |
| sam. 23:00 | **`trend7d`** ; **`alerts`** (une alerte par organe en danger, **sur la tendance 7 j**, avec niveau et règle) ; `triage` (+ check-in + Sol-routine) ; `router` + tests d'invariance |
| dim. 03:00 | **`planDay`** : la to-do du jour (exercices, repas, tests, actions médicales) tirée des alertes ; **`explain`** : la chaîne de raisonnement de chaque item |
| dim. 08:00 | Cas limites (donnée expirée → `DONNEES_INSUFFISANTES`) ; fusion des vraies données montre du présentateur |

### Steve (D) — Assets 3D, science, contenus, pitch
| Livré avant | Quoi |
| :-- | :-- |
| sam. 17:00 | **Modèles 3D** depuis **Z-Anatomy** (CC BY-SA 4.0, FBX/Blender, calques squelette / muscles / vaisseaux / nerfs / organes) : export **un .glb par calque**, décimé (< 8 Mo chacun), noms de nœuds → `organId` ; `public/models/manifest.json` (calque, fichier, organes, **position d'ancrage des warnings**) |
| sam. 20:00 | `.glb` des **organes isolés** pour la fenêtre organe (cœur, poumons, foie, reins, cerveau, œil, fémur/hanche, cuisse) |
| sam. 23:00 | `public/data/nasa/standards.json` (Rev C) ; références à vérifier (§8 : **PhenoAge, Levine 2018** (coefficients exacts) ; **âges d'organes à partir du plasma, Oh et al., Nature 2023** ; vitesses de vieillissement terrestres ; normes sanguines ; anémie spatiale ; calculs rénaux ; **échographie du nerf optique sur l'ISS** ; centrifugeuse à bras court ESA/DLR ; **limites de l'échographie sur l'os**) ; `fetch-horizons` → `horizons.json` |
| dim. 02:00 | Contenus : bibliothèque d'**exercices** et de **menus** (`src/content/`) ; textes « Pourquoi ? » |
| dim. 06:00 | **Synthèses IA** par organe pour les jours clés (J0, J30, J60, J94, Sol 0, J860), générées à partir de `public/data/sim/` → `public/data/summaries/<organId>.json` |
| dim. 10:00 | Storyboard + diapos v1 (5 max, dont **1 slide Vision** : IA embarquée + compagnon santé mentale §11) ; **vidéo de secours n° 1** dès le jalon MVP |
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
3. Fenêtre organe : synthèse + graphe écart d'âge mesuré / **prédit en pointillé** ; âge PhenoAge global en tête de page.
4. Timeline J0 → J94 → projection Sol 0 / J860.
5. Résultats sanguins + SpO₂ avec courbes.
6. Page War Room : **check-in du matin**, MAINTENANT/ENSUITE, to-do (exercices, repas, tests, médical), lien « Pourquoi ? » → Raisonnement.
7. Vraies données Apple Watch du présentateur (import `export.xml`).
8. Normes NASA Rev C sur tous les seuils rouges.

**Hors MVP, dans l'ordre :** to-do sur l'Apple Watch → mesure en direct → calque Nerveux + yeux → prototype multi-agents santé mentale (§11, piste parallèle, sorties pré-calculées) → calque Exposition → 3D de l'organe dans la fenêtre (sinon image fixe) → curseur lien Terre → message du moi futur → animations.

**Règles de coupe :**
- Z-Anatomy pas exploitable à **dim. 04:00** → on garde le corps de secours stylisé (il colle au style hologramme).
- Raccourci Apple Watch pas fiable à **dim. 09:00** → to-do montrée sur l'iPhone, mesure via `export.xml` uniquement.
- Une page à plus de 30 FPS est obligatoire en démo : si la 3D rame, on réduit les polygones avant d'ajouter quoi que ce soit.
- Rien de pas fini à **dim. 14:00** ne part en démo. Un module en retard = l'interface garde le mock, étiqueté SIMULÉ.
- Prototype multi-agents (§11) pas convaincant à **dim. 06:00** → il reste en slide Vision, avec un exemple de sortie figé.

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
  trend7d?: number;             // v3.2 (ajout) : pente sur 7 j, en %/semaine — c'est elle qui déclenche l'alerte
  noise?: number;               // v3.2 (ajout) : bruit de mesure (± même unité que value)
}

export interface CheckIn {      // v3.2 (ajout) : auto-évaluation du matin, 2 taps par ligne
  day: number;
  mood: 1 | 2 | 3 | 4 | 5;
  fatigue: 1 | 2 | 3 | 4 | 5;
  pain: 0 | 1 | 2 | 3;          // 0 = aucune
  painZone?: OrganId;
  sleepFelt: 1 | 2 | 3 | 4 | 5;
  source: 'manual' | 'simulated';
}

export interface PhenoAgeResult { // v3.2 (ajout) : âge biologique global [Publié]
  day: number;                  // jour du prélèvement utilisé
  phenoAge: number;
  chronoAge: number;
  inputs: Record<string, number>; // marqueurs utilisés, visibles dans Raisonnement
  tag: 'Publié';
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
| `src/models/phenoAge.ts` | Mouad | *(v3.2, ajout)* `phenoAge(day: number): PhenoAgeResult \| null` (dernier prélèvement ≤ `day`) |
| `src/models/trend.ts` | Mouad | *(v3.2, ajout)* `trend7d(organId: OrganId, metricKey: string, day: number): number \| null` |
| `src/sim/load.ts` (ajout) | Mouad | *(v3.2)* `getCheckIn(day: number): CheckIn \| null` |
| `src/models/alerts.ts` | Mouad | `alertsForDay(day: number): Alert[]` (sur la tendance 7 j, jamais sur un point isolé) |
| `src/models/triage.ts` | Mouad | `triage(day: number): TriageResult` |
| `src/models/router.ts` | Mouad | `router(t: TriageResult, pos: LinkPos, delayMin: number): RouterOutput` |
| `src/models/planDay.ts` | Mouad | `planDay(day: number): TodoItem[]` |
| `src/models/explain.ts` | Mouad | `explain(reasoningId: string): Reasoning` |
| `src/ingest/healthExport.ts` | Ahmed | `parseHealthExport(file: File, onProgress?: (pct: number) => void): Promise<Measurement[]>` |
| `src/ingest/baseline30d.ts` | Ahmed | `baseline30d(ms: Measurement[], type: Measurement['type']): Baseline` |
| `src/ingest/live.ts` | Ahmed | `latestLive(type: Measurement['type']): Promise<Measurement \| null>` |
| `src/ingest/todoSync.ts` | Ahmed | `pushTodo(items: TodoItem[]): Promise<void>` · `pullDone(): Promise<string[]>` |
| `src/ingest/checkin.ts` | Ahmed | *(v3.2, ajout)* `saveCheckIn(c: CheckIn): void` · `todayCheckIn(): CheckIn \| null` (le check-in saisi en démo remplace le simulé du jour) |
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
- *(v3.2)* Check-in J94 : humeur 3/5, fatigue 3/5, douleur 1 (bas du dos). PhenoAge J91 (dernier prélèvement) : 43,1 ans pour 42 ans réels [mock]. Gaine du nerf optique en légère hausse (AMBRE), calcium urinaire en hausse.

---

## 8. Modèles nouveaux (Mouad), à sourcer (Steve)

### Âge biologique global : PhenoAge [Publié]
Formule publiée (Levine et al., *Aging*, 2018) à partir d'une prise de sang standard : albumine, créatinine, glucose, CRP, % de lymphocytes, VGM, IDR, phosphatases alcalines, leucocytes + âge réel. **Steve vérifie les coefficients exacts** avant que Mouad les code. On ajoute donc ces marqueurs au prélèvement capillaire simulé. Affiché en tête de la page Body.

### Écart d'âge par organe [H]
Idée : « combien d'années de vieillissement terrestre représente la perte subie en vol ». Cette idée s'appuie sur des travaux publiés qui estiment un âge par organe (Oh et al., *Nature*, 2023, à partir des protéines du plasma). Notre calcul, lui, est **un indicateur de l'équipe**, plus simple.
**Limite à afficher dans Raisonnement :** la perte spatiale est en partie réversible au retour ; c'est un *équivalent en années*, pas un vieillissement réel.

```
bioAge(organe, jour) = âgeRéel(jour) + perteCumulée%(organe, jour) / vitesseVieillissementTerre%/an(organe)
```

| Organe | Perte en vol (source) | Vitesse de vieillissement terrestre [H, à sourcer par Steve] |
| :-- | :-- | :-- |
| Hanche | Modèle `bone` (fiche §7), recalé sur le bilan au sol + marqueurs urinaires | ≈ 1 %/an |
| Cuisse / mollet | Volume au scan vs J0 (tendance 7 j) | ≈ 1 %/an |
| Cœur (VO₂max) | Modèle `aerobic` (fiche §7) | ≈ 1 %/an (≈ 10 %/décennie) |
| Autres organes | Pas de modèle → `bioAge = âgeRéel`, statut **gris** (« non modélisé ») | — |

Exemple : hanche à J94, perte 1,99 % → **+2,0 ans** ; à J860 au rythme actuel, 8,70 % → **+8,7 ans** ; avec le plan, 4,22 % → **+4,2 ans**. La **prédiction** (pointillé) prolonge `bone`/`aerobic` avec leur bande.

### Analyses biologiques (SIMULÉ)
- **Urine quotidienne :** calcium, marqueurs de résorption osseuse. Ils servent de suivi **quotidien** de l'os, que le scanner ne mesure pas.
- **Micro-prélèvement capillaire hebdomadaire :** hémoglobine, hématocrite, leucocytes, % de lymphocytes, VGM, IDR, CRP, calcium, vitamine D, créatinine, albumine, phosphatases alcalines, glucose, cortisol (les entrées de PhenoAge sont incluses).
- Valeurs de référence terrestres + tendances spatiales connues (baisse de l'hémoglobine liée à l'anémie spatiale, hausse du calcium liée à la perte osseuse → risque de calculs rénaux, à recouper avec le scan des reins). **Steve vérifie les sources** et les met dans `standards.json` / Raisonnement.

### Alertes sur tendance 7 j
Une alerte se déclenche sur la **pente des 7 derniers jours** (régression simple), **jamais sur un point isolé**, et seulement si la pente sort de la bande de bruit de mesure (`noise`). Exception : un seuil rouge NASA franchi sur 2 mesures consécutives donne une alerte immédiate. Le point du jour reste **affiché**.

### Planificateur de la to-do (`planDay`)
Chaque alerte produit des items, chaque item garde son `reasoningId` :
- hanche AMBRE → ARED charge lourde (squat, soulevé de terre) + repas riche en calcium / vitamine D + point Sol-routine (bisphosphonates, fiche §6) ;
- VO₂ AMBRE → vélo / tapis par intervalles ;
- donnée manquante ou expirée → test à faire (prélèvement, check-in, PVT) ;
- nerf optique AMBRE → test de vision + point Sol-routine (risque SANS) ;
- calcium urinaire en hausse ou calcul au scan → hydratation renforcée + scan des reins le lendemain ;
- check-in : humeur ≤ 2 pendant 3 jours, ou humeur basse + cortisol en hausse + sommeil dégradé → item « point psy » (proposé à l'astronaute, **jamais imposé**) ;
- signes d'alerte (fiche R13) → item médical **en tête**, prévenir le CMO.

---

## 9. Démo de 3 minutes (à affiner par Steve)

Fil rouge : **aujourd'hui d'abord** (auto-évaluation), la projection ensuite (« est-ce que ce que je fais suffit ? »).

| Temps | Ce qu'on montre |
| :-- | :-- |
| 0:00–0:15 | Accroche : « Pourrez-vous marcher en sortant du vaisseau ? » + délai radio du jour |
| 0:15–0:35 | **War Room** : le présentateur fait **le check-in du matin en direct** (humeur, fatigue, douleur) → MAINTENANT s'affiche, calculé à bord |
| 0:35–1:10 | **Body, J94 aujourd'hui** : scan du matin (centrifugeuse), calques, ⚠ sur la hanche (estimée) et sur la cuisse (tendance 7 j) ; **RÉEL** : SpO₂ et FC du présentateur comparées à sa référence 30 j |
| 1:10–1:35 | Clic sur un item de la to-do → « Pourquoi ? » : donnée → modèle → **norme NASA V1 4027**, chaque maillon avec sa source |
| 1:35–2:05 | **Timeline** J94 → Sol 0 → J860 : sans le plan, hanche à 8,7 % de perte ; avec le plan, 4,2 % (**métrique d'impact**). Fenêtre organe : écart d'âge [H] en pointillé |
| 2:05–2:30 | « Vers la Terre, on n'envoie pas 20 To, on envoie 4 Ko. » La synthèse IA arrive dans **ENSUITE**, 11 min plus tard |
| 2:30–3:00 | Slide Vision (compagnon santé mentale, IA embarquée) + **bénéfice sur Terre** (patients alités, sarcopénie, bases polaires) + phrase signature |

**Réponses prêtes (20 s chacune) :**
- « Prédiction ou auto-évaluation ? » → « Le corps du jour et le check-in, c'est l'auto-évaluation. La projection sert à vérifier si le plan d'aujourd'hui suffit. »
- « Le scanner mesure la densité osseuse ? » → « Non : l'échographie ne voit pas bien l'os. L'os vient du bilan au sol, du modèle et des marqueurs urinaires ; le scanner fait le muscle, les fluides, les reins, le nerf optique et le cœur. »
- « Pourquoi un scan par jour ? » → « Les fluides et le nerf optique bougent chaque jour, et le scan ne coûte pas de temps puisqu'il se fait pendant la séance de centrifugeuse. Pour le reste, on alerte sur la tendance 7 j, pas sur le bruit. »
- « Ça existe, la centrifugeuse ? » → « Au sol oui (ESA/DLR) ; en vol, non : c'est notre hypothèse de mission, et elle n'a besoin que de ~0,1 g pour le scanner. »

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

---

## 11. Santé mentale : compagnon (Vision) et prototype multi-agents (hors MVP)

### Dans le MVP (déjà ci-dessus)
Check-in du matin (humeur, fatigue, sommeil ressenti) + **cortisol** (prélèvement), **sommeil et VFC** (montre), **PVT**. Règle `planDay` : humeur basse persistante ou combinaison humeur + cortisol + sommeil → item « point psy » **proposé**, jamais imposé (§8).

### Vision : le compagnon (slide, pas codé dans l'app)
Des lunettes connectées portées en mission. L'IA en déduit des **indicateurs** (débit de parole, minutes d'interaction sociale, rythme d'activité, isolement) pour détecter tôt des schémas typiques d'un épisode dépressif. Le bénéfice : en séance, l'astronaute n'a plus à tout réexpliquer, le psy a déjà le contexte, et la séance est plus efficace.

**Garde-fous (à afficher sur la slide, c'est ce qui gagne le critère éthique) :**
1. **Tout l'équipage porte les lunettes et y consent**, avant le départ, avec le droit de revenir sur ce consentement.
2. **Mode privé** activable à tout moment (appels avec la famille, intimité). Les personnes **hors équipage** (famille, interlocuteurs au sol) ne sont jamais analysées.
3. Traitement **à bord, sur l'appareil**. La vidéo et le son bruts sont effacés après extraction des indicateurs ; ils ne partent jamais vers la Terre (cohérent avec « 20 To → 4 Ko »).
4. **Pare-feu :** utilisé **uniquement pendant la mission, pour aider**. Jamais en phase de sélection, jamais pour une décision d'affectation ou de retrait de mission. Ça enlève la raison de cacher ses symptômes.
5. **L'astronaute voit ses indicateurs en premier** et décide de les partager avec le psy. C'est de l'auto-évaluation, pas de la surveillance.
6. Sortie = **« signal à regarder »**, jamais un diagnostic.

### Prototype multi-agents (piste parallèle, timebox dim. 06:00)
- **But :** montrer sur un exemple que l'analyse hiérarchique produit des signaux utiles et argumentés. Il illustre la slide Vision (une capture ou 20 s de vidéo) et n'entre pas dans le parcours de démo principal.
- **Propriétaire :** volontaire, le premier qui a livré ses jalons de sam. 23:00 (à défaut, ça reste une slide). Dossiers **à lui seul** : `scripts/mental-agents/` (scripts, hors de `src/`) et `public/data/mental/` (sorties).
- **Entrées (100 % SIMULÉ, aucune personne réelle) :** journal d'activité et transcriptions synthétiques de Haddad sur J60 → J94, avec un glissement dépressif progressif injecté à partir de J75 (vérité connue → on peut mesurer si le système le voit, et quand), + check-ins, cortisol, sommeil, VFC du générateur de Mouad.
- **Hiérarchie des agents :**

| Agent | Rôle | Sortie |
| :-- | :-- | :-- |
| **Observateur** | Lit la journée, extrait des **faits** sans les interpréter (interactions, durée de parole, tâches abandonnées, mots d'irritabilité, repas sautés) | Indicateurs du jour + citations sources |
| **Psychologue** | Compare à la **référence personnelle** de l'astronaute (pas à une norme), formule des hypothèses de schéma (retrait social, anhédonie, troubles du sommeil), chacune avec ses preuves | Hypothèses + niveau de confiance |
| **Chef psychologue** | Contre-expertise : rejette ce qui manque de preuves, recoupe avec les biomarqueurs, choisit le niveau (*rien* / *à surveiller* / *proposer un échange*), **rédige le message à l'astronaute** | Signal final, message, raisonnement |

- **Exécution :** lancé **avant** la démo via l'API Claude (`claude-opus-5-5`), résultats figés dans `public/data/mental/J<n>.json`. **Aucun appel réseau pendant la démo** (règle 7 du §5).
- **Métrique à montrer :** jour de détection vs J75 (début injecté) et nombre de fausses alertes sur J60 → J74.
- **Étiquette :** « Prototype — données SIMULÉES — signal IA, pas un diagnostic ».
