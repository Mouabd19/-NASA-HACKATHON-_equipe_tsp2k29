# 08. Retours du jury, point par point

Deux passages. Le plus récent est en haut.

## Jury du 15/11 au matin : 7,5/10 (contre 7 au jury blanc)

Verdict : le pitch tient, mais trois incohérences peuvent coûter des points devant un juré du métier. Ce qui marche et qu'on garde tel quel : une seule idée, le problème et la cible posés avant 1:00, des chiffres conformes à la fiche v3, le « Pourquoi » qui descend jusqu'à la citation V1 4027, les slides 5, 6 et 12, le 4 min comme sous-ensemble strict du 7 min, les phrases de rattrapage.

Légende : **corrigé**, **partiel**, **pas corrigé** (avec la raison).

### Les trois incohérences

| # | Reproche | Statut | Ce qu'on a fait |
| :-- | :-- | :-- | :-- |
| 1 | D2 contredit l'écran : le « Pourquoi » du squat suspendu justifie de faire le squat. La vraie cause (fatigue 4, humeur 2, règle R13) n'est jamais dite. | **Corrigé** | D2 réécrit dans les deux versions : « Pourquoi suspendre ce squat ? Fatigue quatre, humeur deux : pas de charge lourde sur un corps épuisé. Et le sauter est sans risque : sa hanche est à 98 %. La norme NASA, citée mot pour mot, dit 95. » La cause est à l'écran pendant qu'Ahmed la dit : Mouad pointe le détail de « Prévenir le CMO de bord » (« Humeur 2/5 avec fatigue 4/5 »). On garde le clic sur le squat, pour la citation V1 4027. Le « Pourquoi » de « Prévenir le CMO » (R13 + V1 3006) est prêt pour les questions (`04-demo.md`, D2 point 5 ; `05-questions-jury.md`, question 17). |
| 2 | Accroche fausse : « un astronaute en route vers Mars », 11 min, alors qu'à J94 le vaisseau est bien plus près. | **Corrigé à l'oral** | « Si un astronaute **sur Mars** demande à son médecin… ». Haddad, en transit, vient en slide 3 (« en route vers Mars »). Variante C aussi : « Si j'étais sur Mars cette semaine ». Le pied de la slide 1 (« J94 ») est dans le deck : demandé dans `07-slides-plan.md` (v3), à vérifier. |
| 3 | Slide 11 : « Check-in saisi » rangé dans RÉEL alors que les valeurs 2/4/0/2 sont celles d'un persona. | **Corrigé à l'oral, partiel à l'écran** | S11 dit « Ce qui est simulé : Haddad, ses scans, ses prises de sang, ses réponses au check-in » (4 et 7 min), C6 aussi. Questions 3 et 13 corrigées. Plan de la slide 11 modifié (check-in dans Simulé). **Pas corrigé dans l'app** : le « Pourquoi » du check-in écrit « RÉEL, saisi » pour une saisie de démo. On ne l'ouvre pas sur scène (`04-demo.md`, D2 point 4). L'app est hors de mon périmètre cette nuit. |

### Corrections du pitch (`pitchFixes`)

| # | Point | Statut | Détail |
| :-- | :-- | :-- | :-- |
| 1 | Réécrire D2 | **Corrigé** | Voir incohérence 1. |
| 2 | Accroche « sur Mars » | **Corrigé** | Voir incohérence 2. |
| 3 | « Ce matin » contre une slide datée du 14/11 | **Corrigé** | « Cette semaine, Mars est à onze minutes-lumière ». Vrai le 14/11 (11,0) comme le 15/11 (10,9). On n'a pas relancé `fetch-horizons` : ça changerait les données de l'app et du deck, hors de mon périmètre, pour un gain nul à l'oral. |
| 4 | Le 7 min dépasse 7:00 ; 741 « pondérés » faux | **Corrigé** | Recompté : la v2 faisait 769 mots prononcés. La v3 en fait **682** (697 pondérés). S12 n'est plus dite (Steve la passe d'un clic), D1, D3, S8 allégés, clôture raccourcie. Repère calculé : **6:30**. Première coupe si besoin : S10 (−0:17), puis D4. |
| 5 | D1 du 7 min trop chargé ; Ahmed lit la consigne avant qu'elle s'affiche | **Corrigé** | Retirés : « Pas du matériel de vol », « À droite, ENSUITE : qui décide après », l'explication des 52 minutes (« en comptant large » suffit ; la slide 6 et la question éclair l'expliquent). D1 passe de 113 à 92 mots pondérés. Ahmed se tait jusqu'au clic « Valider » et à l'affichage ; Mouad lui fait signe. |
| 6 | Qui est qui : le pouls d'Ahmed nourrit-il la consigne de Haddad ? | **Corrigé** | « Il ne change pas la consigne de Haddad : il prouve que l'entrée marche. » (4 et 7 min). Variante C : « Mon pouls ne change pas sa consigne. » |
| 7 | S8 : « Quand le plan ne suffit pas » passe mal (médiane 95,8 %) | **Corrigé à l'oral** | Walid ne lit pas le titre et dit : « Mais dans le pire cas, même avec le plan, la hanche passe sous la limite. » Phrase retirée de S7 pour ne pas la dire deux fois. Titre de slide : proposition dans `07-slides-plan.md`, le deck décide. |
| 8 | S9 : dire que le glissement est injecté avant le résultat | **Corrigé** | « Pour tester, on a injecté nous-mêmes un glissement chez Haddad, au jour 75. Le modèle lève un signal au jour 83. » |
| 9 | « Pourra-t-il marcher en sortant du vaisseau ? » sans préparation | **Corrigé** | Retirée de la clôture. On a choisi de la retirer plutôt que de la poser en S3 : ça coûtait 5 s dans un 7 min déjà juste. `02-accroches.md` et `00-LISEZMOI.md` mis à jour. |
| 10 | Ne pas lire « to-do », « Médecin de bord », « Sol-routine 14:00 » | **Corrigé** | Règle ajoutée dans les conventions de `03-scripts.md` et en tête de `04-demo.md`. Phrase de rattrapage si un juré lit 14:00. « To-do » retiré des fichiers du pitch où il désignait le plan. Dans l'app, ces libellés restent : pas corrigé (hors périmètre). |

### Minutage (`timingCheck`)

| Version | Jury | v3 calculée | Remarque |
| :-- | :-- | :-- | :-- |
| 4 min | 410 mots, fin 3:30 à 3:55 | 389 mots prononcés, **3:50** | D1 allégé aussi (l'explication des 52 min), D3 sans la liste des quatre organes (ils sont à l'écran). Marge 10 s. |
| 7 min | 769 mots, fin 6:25 à 7:05 | 682 mots prononcés, **6:30** | Objectif du jury atteint sur le papier. |
| Variante C | 286 mots, 2:50 à 3:00 | environ 300 mots, **≈ 3:00** | Trois demi-phrases ajoutées (pouls, fatigue, check-in simulé). |
| 5 min | 4:50 à 5:10 sans marge | **≈ 4:40** (4 min + S6 + D4) | S9 retirée de la version 5 min, comme conseillé. |

**Pas fait : le filage mesuré.** Personne n'a pu chronométrer cette nuit. Le tableau en fin de `03-scripts.md` est prêt, avec les fins calculées. Il est obligatoire ce matin, une fois par version.

### Questions manquantes (`likelyJuryQuestionsMissing`)

Les onze sont ajoutées dans `05-questions-jury.md`, questions 16 à 26 (check-in sous-déclaré, vrai motif du squat, pourquoi pas le vrai délai avec Horizons, circularité de la cohorte simulée, relecture médicale des règles, rendez-vous de 14:00, échelles validées, référence J0–J20, matériel et certification, extrapolation au-delà de 180 jours, effet de l'adhérence). Réponses vérifiées dans le code : le signal d'humeur ne change pas le niveau du jour, il propose un point psy (`triage.ts`) ; le « plan » est un facteur calé par l'équipe (`bone.ts`, `PLAN_FACTOR`), dit comme tel. Trois questions éclair ajoutées : « Prévenir le CMO » à 06:45, slide 9 trop propre, renvoi Horizons.

### Corrections des slides (`slidesFixes`)

Le deck (`slides/`) est tenu par un autre agent, qui a appliqué ces points dans le commit `428ed79`. Je n'y ai pas touché. `07-slides-plan.md` est aligné sur ce commit (points marqués **v3**), sans changer l'ordre ni le nombre de slides.

| Slide | Point | Côté pitch |
| :-- | :-- | :-- |
| 1 | Pied sans « jour 94 de Haddad » | Plan mis à jour. Oral : « cette semaine », « sur Mars ». |
| 11 | Check-in hors de Réel | Plan mis à jour, oral corrigé. |
| 7 | Deuxième ligne de légende, seuil 3,75 % contre 4 %, « 4,2 % » en ambre | Plan mis à jour ; le seuil n'est jamais dit à l'oral. |
| 6 | « To-do du jour » → « plan du jour » | Plan mis à jour. L'app garde « to-do » : on ne le lit pas. |
| 8 | « Réévaluer » → « Faut-il des bisphosphonates ? » ; titre | Plan mis à jour ; l'oral disait déjà « Faut-il un médicament ? ». Le deck a aussi pris le titre « Dans le pire cas, même avec le plan, c'est au médecin », qui colle à la phrase de Walid. |
| 13 | Haddad à 45 % du trajet contre 52 min | Point retiré par le deck (`428ed79`), plan aligné. Réponse prête quand même (question éclair « pourquoi 11 minutes », question 18). |
| 9 | Pied « glissement injecté par l'équipe » ; J83 contre J85 | Plan mis à jour, oral corrigé, écart expliqué (question 19). |
| A1 | Captures à refaire (FC « Aucune mesure », check-in à faire, CMO à 06:45) | Noté dans le plan. **Pas fait** : il faut l'app gelée et la montre branchée. |
| — | Graphie « Sol Zéro » / « SOL ZÉRO » | **Corrigé** côté pitch : « Sol Zéro » partout, comme le logo de l'app et les slides. Seule exception, le nom du raccourci iOS « SOL ZÉRO — Pouls en continu », écrit tel qu'il apparaît sur l'iPhone. |

### Reste à faire ce matin

1. **Filage chronométré** des versions 4 et 7 min, temps notés dans `03-scripts.md`.
2. **Notes orateur du deck** : régénérer depuis le script v3 (`python3 slides/tools/build-notes.py`), sinon elles affichent l'ancien D2 et l'ancienne accroche. C'est dans `slides/`, donc pour l'agent ou la personne qui tient le deck.
3. **Vérifier le deck** contre les points **v3** de `07-slides-plan.md`, surtout les slides 1 et 11. Seuil ambre de la hanche : le deck suit le code (3,75 %), la fiche v3 dit 4 % ; on ne cite pas ce seuil à l'oral.
4. **App, si quelqu'un a 10 minutes avant le gel** : « Médecin de bord » → « CMO de bord » (`NowNextCard.tsx`) ; « to-do du jour » → « plan du jour » dans la consigne ; « Point Sol-routine » → « Message au médecin au sol » ; heure de « Prévenir le CMO » après le check-in ; le « Pourquoi » du check-in ne devrait pas écrire « RÉEL » pour des valeurs de persona. Sinon, ne pas lire ces mots et ne pas ouvrir ce « Pourquoi ».
5. **Captures A1** avec le pouls réel.

---

## Jury blanc (nuit du 14 au 15/11, 7/10) : ce qui a changé en v2

Jury blanc dans la nuit du 14 au 15/11 : **7/10**. Deck jugé sobre. Les reproches portaient surtout sur la cohérence entre ce qu'on dit, ce que montre l'app et ce qu'affichent les slides. Ce fichier liste chaque point et ce qu'on a fait. La colonne de gauche est reformulée à partir de nos notes, pas recopiée mot pour mot. Les changements du deck lui-même sont détaillés dans `slides/README.md`, section « Retour du jury ».

### Le texte dit (`03-scripts.md`)

| Problème relevé | Ce qui change |
| :-- | :-- |
| La démo montre le squat lourd « Suspendu », mais le texte n'en parle pas, puis D2 explique pourquoi le faire | On assume la suspension. D1 : « Seule la séance lourde est suspendue d'office. » D2 : « Pourquoi ce squat lourd ? [...] Il a de la marge aujourd'hui, pas en fin de mission. » En 7 min : « Une séance suspendue, ce n'est pas grave. Toutes, si. » |
| « 52 minutes » présenté comme exact, alors que Haddad n'est pas sur Mars à J94 | « On compte large » à l'oral. Slide 6 : le délai Terre–Mars du jour est un majorant [H]. Question éclair ajoutée dans `05-questions-jury.md`. |
| Quatre formules concurrentes (« une consigne », « pas un tableau de bord », « le plan change l'arrivée »...) | Un seul slogan, dit trois fois mot pour mot : « Quoi faire ce matin, sans attendre la Terre. » |
| On ne sait pas pour qui c'est avant la démo | La cible est nommée en slide 3 (vers 0:45) : « Chaque matin, Sol Zéro lui dit quoi faire. » |
| Le 4 min fait trois bascules slides / démo en 2 minutes | Le 4 min saute la slide 6. L'écran reste sur la démo de D1 à D5, une seule sortie vers la slide 7. |
| Repères à 140 mots/min trop optimistes | Recalculés à 125 mots/min, avec 1 s par clic, 3 s par bascule, 2 s par changement d'orateur et les temps de démo. Résultat : **3:46** (4 min), **6:57** (7 min), **2:59** (variante C). |
| « Le plan de ce matin divise la perte par deux » : un seul matin ne change rien | « Suivre le plan chaque jour divise la perte par deux. » Même formule à l'oral (D5, S7) et sur la slide 7. |
| « Médecin de bord » à la conjonction contredit la slide 2 | On dit et on écrit « CMO de bord ». |

### Les slides (`07-slides-plan.md`, `slides/`)

Résumé, le détail est dans `slides/README.md` :

- slide 1 : la lumière part au clic de Steve, plus toute seule ; tout est daté du 14/11 (J94, 11,0 min), comme l'app ;
- slide 4 : le nom « Sol Zéro » en grand, première apparition ; plus de micro-étiquette en capitales ailleurs ;
- slide 6 : « CMO de bord », « Lien Terre : coupé », majorant indiqué ;
- slide 7 : couleurs selon la règle de l'app (`boneColor`), légende ajoutée ;
- slide 8 : 93,8 % au lieu de 93,75 % ;
- slide 9 : axe expliqué (J27, premier score), seuil sans valeur, note réduite ;
- slide 10 : « des mois, voire des années d'envoi » au lieu de « plus de 2 ans », 17 Go/s retiré ;
- slide 12 : remplacée par CHAPEA (378 jours, 4 personnes) ;
- slide 13 : Haddad placé à 45 % du trajet, comme J94 sur 210 jours d'aller.

Le mode 4 min du deck (touche S) saute maintenant aussi la slide 6 et la transition d2. Objectifs du chrono mis à jour.

### Pas encore fait (v2) (à faire dimanche matin)

1. **Filage chronométré** des deux versions, temps réels notés dans le tableau en fin de `03-scripts.md`. Les repères actuels sont calculés, pas mesurés.
2. **Captures A1 avec le pouls réel**, une fois l'app gelée et la montre branchée (`slides/assets/app/`).
3. **App** : `NowNextCard.tsx` affiche encore « Médecin de bord » pour le décideur CMO, et la consigne dit « to-do du jour ». À aligner sur le deck (« CMO de bord ») si quelqu'un a 10 minutes avant le gel. Sinon, ne pas lire ces mots à voix haute.
4. **Fiche v3** : la bande d'incertitude de la hanche avec le plan y est 3,32–5,02 %, l'app dit 3,01–6,25 %. Mouad cite celle de l'app.
5. **Notes orateur du deck** : régénérées depuis le script v2 (`python3 slides/tools/build-notes.py`). À relancer si le script change encore.
