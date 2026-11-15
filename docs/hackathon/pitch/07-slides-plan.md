# 07. Plan des slides (pour le designer)

> **Version 3 (après le jury du 15/11, 7,5/10). À lire avant tout.**
> - **Compatible avec le deck existant** : mêmes 13 slides, même ordre, mêmes annexes, mêmes animations, même mode 4 min (touche S). Aucune slide ajoutée, retirée ou déplacée.
> - **Ce qui change dans ce plan** (textes à l'écran et pieds de slide, d'après le retour du jury) : slide 1, pied sans « J94 » ; slide 6, « plan du jour » au lieu de « to-do du jour » ; slide 7, une seule ligne de légende et « 4,2 % » en blanc ; slide 8, « Faut-il des bisphosphonates ? » ; slide 9, pied « glissement injecté par l'équipe » ; slide 11, le check-in passe dans la colonne Simulé ; slide 8, titre « Dans le pire cas, même avec le plan, c'est au médecin » ; slide 12, passée sans parler dans le 7 min ; slide 13, point « Haddad » retiré. Chaque point est marqué **(v3)** plus bas.
> - **Le deck (`slides/`) est tenu par un autre agent** cette nuit. Il a appliqué ces changements dans le commit `428ed79` (détail dans `slides/README.md`, « Deuxième passage ») ; ce plan est aligné dessus. Vérifier sur `slides/index.html` avant le filage. Si un point n'y est pas, c'est le deck qui fait foi pour l'image et ce plan pour l'intention.
> - Repères de temps recalés sur le script v3 (6:30 en 7 min, 3:50 en 4 min). Les notes orateur du deck sont générées depuis `03-scripts.md` (`python3 slides/tools/build-notes.py`) : à relancer.
>
> Version 2 (après le jury blanc) : le deck est construit, `slides/index.html` (voir `slides/README.md`).

13 slides pour 7 min, 7 pour 4 min, plus 3 annexes de secours. Le jury écoute, regarde la démo et lit en même temps : **une idée par slide, 12 mots maximum à l'écran**, le reste se dit.

## Direction générale

- **Même univers que l'app**, pour que le passage slide ↔ démo ne choque pas. Valeurs de `src/ui/tokens.ts` :
  - fond `#0B0D10`, panneaux `#12151A`, bordures `#252A32` ;
  - texte `#E6E8EB`, secondaire `#959CA6`, tertiaire `#69707B` ;
  - statuts seulement : vert `#3DB46D`, ambre `#E3A22E`, rouge `#E5544B`, gris inconnu `#69707B` ;
  - corps / hologramme : `#A9B8C6`.
- **Une police : Inter** (chiffres tabulaires). Titres 56 à 72 px en 1920×1080, sources 16 px en `#69707B`.
- **La couleur porte un statut, jamais une décoration.** Pas de dégradé, pas de lueur, pas d'emoji, pas de capitales espacées.
- **Chaque chiffre affiché a sa source** en bas à gauche, petite : `[NASA V1 4027]`, `[NASA JPL Horizons]`, `[Publié]`, `[H]`, `[Persona]`.
- Format 16:9, 1920×1080. Prévoir que le projecteur peut être en 1280×720 : rien d'important à moins de 60 px des bords.
- **Animations** : utiles seulement (elles montrent un mécanisme), 2 à 4 s, déclenchées à l'arrivée de la slide ou au clic suivant (indiqué). Facile à couper : chaque slide doit rester lisible sur sa dernière image (PDF de secours).
- Nom : « Sol Zéro », écrit comme dans l'app, en Inter medium. Il n'apparaît que deux fois : en grand sur la slide 4, et dans les crédits de la slide 13. Pas de micro-étiquette en capitales sur les autres slides. Pas de logo NASA (règle Space Apps : pas d'impression d'aval NASA).

## Ordre et durées

| # | Titre court | 7 min | 4 min | Orateur | Temps à l'écran (7 min) |
| :-- | :-- | :-: | :-: | :-- | :-- |
| 1 | Mars est à 11 minutes | oui | oui | Steve | 0:00 → 0:24 |
| 2 | Personne n'est forcément médecin | oui | oui | Steve | 0:24 → 0:43 |
| 3 | Haddad, jour 94 sur 860 | oui | oui | Steve | 0:43 → 1:03 |
| 4 | Quoi faire ce matin, sans attendre la Terre | oui | oui | Steve | 1:03 → 1:12 |
| | *Démo Plan du jour + Pourquoi* | | | Ahmed | 1:12 → 2:37 |
| 5 | Chaque rouge est une norme NASA | oui | **saute** | Ahmed | 2:37 → 2:54 |
| 6 | MAINTENANT ne dépend jamais de la distance | oui | **saute** | Ahmed | 2:54 → 3:20 |
| | *Démo Corps* | | | Walid | 3:20 → 4:30 |
| 7 | Suivre le plan chaque jour divise la perte par deux | oui | oui | Walid | 4:30 → 4:45 |
| 8 | Le pire cas : le médecin | oui | **saute** | Walid | 4:45 → 5:04 |
| 9 | Un signal, jamais un diagnostic | oui | **saute** | Mouad | 5:04 → 5:34 |
| 10 | 20 To à bord, 4 Ko vers la Terre | oui | **saute** | Mouad | 5:34 → 5:51 |
| 11 | Réel / Simulé | oui | oui | Mouad (Steve en 4 min) | 5:51 → 6:13 |
| 12 | Avant Mars : CHAPEA | passée sans parler (v3) | **saute** | — | ≈ 1 s |
| 13 | La réponse est à bord | oui | oui | Steve | 6:13 → 6:30 |
| A1–A3 | Annexes de secours | après la fin | | | |

Pour le 4 min : un seul fichier, touche **S** dans le deck (mode 4 min), qui saute les slides 5, 6, 8, 9, 10, 12 et la transition d2. **En 4 min, l'écran reste sur la démo de D1 à D5.** Comme le deck est sur un autre bureau, Steve n'a rien à faire pendant la démo : au retour, son prochain appui depuis la transition d1 mène directement à la slide 7.

---

## Slide 1 · Mars est à 11 minutes

- **Le seul message** : le médecin est loin, et c'est mesurable aujourd'hui.
- **Texte à l'écran** : « Mars est à 11 minutes. » (5 mots)
- **Source (v3)** : « Temps-lumière Terre–Mars le 14/11/2026 : 11,0 min [NASA JPL Horizons] ». Plus de « J94 » ni de « jour 94 de Haddad » dans ce pied : à J94, Haddad est plus près de la Terre, son délai n'est pas 11,0 min. Même date que l'app. À l'oral, Steve dit « cette semaine », pas « ce matin ».
- **Visuel** : fond noir. À gauche, un point bleu-gris (la Terre, petit). À droite, un point ocre éteint (Mars). Une ligne fine les relie. Rien d'autre.
- **Animation (motion utile : le délai visualisé comme la lumière qui voyage)** :
  1. La lumière ne part pas seule : Steve appuie une fois (clic, flèche, télécommande) sur « la question met onze minutes à partir ». L'impulsion blanche part de la Terre vers Mars (6 s). Le compteur sous la ligne défile `0 → 11 min 01 s` en accéléré, synchronisé avec l'impulsion.
  2. Quand l'impulsion touche Mars, petite pause, puis une deuxième impulsion repart de Mars vers la Terre (6 s) ; le compteur continue jusqu'à `22 min 02 s` et un libellé apparaît : « aller-retour ». L'appui suivant passe à la slide 2.
  3. Calé sur la phrase « la question met onze minutes à partir. La réponse, onze minutes à revenir ».
- **Note** : ne pas écrire « 11,0 min » en gros. « 11 minutes » est vrai le 14/11 (11,0) comme le jour du pitch, le 15/11 (10,9).

## Slide 2 · À bord, personne n'est forcément médecin

- **Le seul message** : l'astronaute doit s'évaluer lui-même.
- **Texte** : « À bord, personne n'est forcément médecin. » (6 mots)
- **Source** : « 2 officiers médicaux (CMO) par véhicule, "souvent, mais pas obligatoirement, médecins" [NASA-STD-3001 V1 3006, V1 5003] »
- **Visuel** : deux pictogrammes de personnes au trait fin, chacun avec un badge « CMO ». Au-dessus de chacun, un petit cercle **gris creux** (le gris de l'app = inconnu) avec « médecin ? ».
- **Animation** : les deux badges « CMO » apparaissent, puis les deux cercles gris « médecin ? » (0,5 s chacun). C'est un clin d'œil à la règle « gris = inconnu » qu'on reverra dans l'app.

## Slide 3 · Haddad, jour 94 sur 860

- **Le seul message** : voici l'astronaute, il est fictif, et il est au milieu du voyage.
- **Texte** : « Commandant Haddad. Jour 94 sur 860. » (6 mots) + étiquette `[Persona]` à côté du nom.
- **Visuel** : une frise horizontale pleine largeur : `J0 départ` · `J94 aujourd'hui` · `J210 Sol 0, arrivée sur Mars` · `J710 départ de Mars` · `J860 retour`. Segment J0→J94 plein (mesuré), J94→J860 hachuré (projeté), comme la timeline de l'app.
- **Animation (le compte J94 → Sol 0)** :
  1. Un curseur file de J0 à J94 (1,5 s), un compteur au-dessus affiche `J0 → J94`.
  2. Arrêt sur J94, puis un second compteur s'affiche au-dessus de Sol 0 et décompte `Mars dans 116 jours` (de 210 à 116, 1 s).
- **Données** : 210 j d'aller, 500 j en surface, 150 j de retour [Persona] ; J0 = 12/08/2026, J94 = 14/11/2026.

## Slide 4 · Quoi faire ce matin, sans attendre la Terre

- **Le seul message** : la promesse du produit (c'est la phrase que le jury doit retenir).
- **Texte** : « Quoi faire ce matin, sans attendre la Terre. » (8 mots) ; en petit, au-dessous, apparaissant en dernier : « Et pourquoi. »
- **Visuel** : texte seul, centré, très grand. Au-dessus, le nom « Sol Zéro » en grand (64 px) : première apparition du nom.
- **Animation** : le nom, puis la phrase ; « Et pourquoi. » apparaît 2,6 s plus tard (au moment où Steve le dit). Puis bascule vers la démo.

## Slide 5 · Chaque rouge est une norme NASA *(7 min)*

- **Le seul message** : aucun seuil n'est inventé, tout est sourcé.
- **Texte** : « Chaque rouge est une norme NASA. » (6 mots)
- **Visuel** : une jauge horizontale « densité osseuse de la hanche, % du pré-vol » de 100 à 90. Une ligne rouge verticale à 95. Une étiquette reliée à la ligne par un trait fin : la citation exacte en anglais, petite : *« Countermeasures shall maintain bone mineral density of the hip and spine at or above 95% of pre-mission values… »* `NASA-STD-3001 Vol. 1 Rev C · V1 4027`. En bas, les 4 étiquettes de l'app en ligne, neutres (sans couleur) : `[NASA]` `[Publié]` `[H] hypothèse de l'équipe` `[Persona]`.
- **Animation** : la ligne rouge se dessine de haut en bas (0,6 s), puis le trait de liaison part vers la citation, qui apparaît. Puis les 4 étiquettes, une par une, au rythme de « NASA, publié, hypothèse de l'équipe, ou persona ».

## Slide 6 · MAINTENANT ne dépend jamais de la distance

- **Le seul message** : la consigne est calculée à bord ; seul « qui décide ensuite » dépend du lien Terre.
- **Texte** : « MAINTENANT ne dépend jamais de la distance. » (6 mots)
- **Visuel** : deux cartes copiées du style de l'app, côte à côte.
  - Carte **MAINTENANT** (gauche, large) : pastille ambre « Attention renforcée », texte : « Appliquer le plan du jour sans report et prévenir le CMO de bord dans la journée. » **(v3)** « plan du jour » au lieu de « to-do du jour » sur la slide. L'app affiche encore « to-do » : à l'oral, on dit « le plan ».
  - Carte **ENSUITE** (droite) : « Décide : … » et « Réponse dans … ».
  - Sous les cartes, un curseur horizontal à 6 crans : `ISS` · `Lune` · `Mars proche` · `Mars aujourd'hui` · `Mars au plus loin` · `Conjonction`, avec la Terre qui s'éloigne.
- **Animation (le mécanisme du routeur)** : le curseur avance cran par cran, toutes les 0,8 s. La carte MAINTENANT **ne bouge pas d'un pixel** (aucun fondu, c'est le message). La carte ENSUITE change à chaque cran :

| Cran | Délai aller | Décide | Réponse |
| :-- | :-- | :-- | :-- |
| ISS | < 1 s | Médecin au sol | ≈ 30 min |
| Lune | 1,3 s | Médecin au sol | ≈ 30 min |
| Mars proche | 3,0 min | Médecin au sol | ≈ 36 min |
| Mars aujourd'hui | 11,0 min | Médecin au sol | ≈ 52 min |
| Mars au plus loin | 22,3 min | Médecin au sol | ≈ 75 min |
| Conjonction | lien coupé | **CMO de bord** | « dès que le lien revient » |

- **Source** (bas) : « Réponse = 2 × délai + 30 min de traitement [H]. Règle testée : 5 niveaux × 5 positions × 7 délais. Délais : JPL Horizons. Pour Haddad, on prend le délai Terre–Mars du jour : un majorant, le vaisseau est plus près [H]. »
- **Note designer** : au cran « Conjonction », la ligne Terre ↔ vaisseau se coupe (pointillé qui s'efface) et l'en-tête dit « Lien Terre : coupé » (aux autres crans : « Délai Terre : 11,0 min », etc.). On écrit « CMO de bord », pas « médecin de bord » : la slide 2 vient de dire qu'il n'est pas forcément médecin. Dernière image = cran « Conjonction » affiché, MAINTENANT intact.

## Slide 7 · Suivre le plan chaque jour divise la perte par deux

- **Le seul message** : suivre le plan divise par deux la perte osseuse en fin de mission.
- **Texte** : « Suivre le plan chaque jour divise la perte par deux. » (10 mots) ; deux gros chiffres : **8,7 %** (rouge) et **4,2 %** (ambre). Le titre dit « chaque jour » : un seul matin ne change rien, c'est la régularité qui compte.
- **Source** : « Modèle os de l'équipe [H], calé sur LeBlanc 2000 et la justification de V1 4027. Limite : NASA V1 4027. »
- **Visuel (la courbe de densité osseuse qui se trace jusqu'à la limite NASA)** : graphique, x = jour de mission (0 → 860), y = densité de la hanche en % du pré-vol (100 en haut → 90 en bas). Ligne horizontale rouge pointillée à **95 %** étiquetée « limite NASA ». Repères verticaux fins à J94 (aujourd'hui) et J210 (Sol 0).
- **Données (densité = 100 − perte)** :

| Jour | 0 | 30 | 60 | 94 | 150 | 210 | 300 | 400 | 500 | 600 | 700 | 860 |
| :-- | --: | --: | --: | --: | --: | --: | --: | --: | --: | --: | --: | --: |
| Perte, rythme actuel (%) | 0 | 0,68 | 1,32 | 1,99 | 2,98 | 3,91 | 5,08 | 6,11 | 6,93 | 7,58 | 8,09 | 8,70 |
| Perte, avec le plan (%) | 0 | 0,68 | 1,32 | 1,99 | 2,32 | 2,63 | 3,02 | 3,36 | 3,63 | 3,85 | 4,02 | 4,22 |

  Bande d'incertitude à J860 (modèle d'IA B, 10 %–90 %) : rythme actuel 6,39–11,74 % ; avec le plan 3,01–6,25 %. Trait plein de J0 à J94 (mesuré), pointillé après (projeté).
- **Animation** :
  1. Le trait plein se trace de J0 à J94 (1 s).
  2. La courbe « rythme actuel » continue en pointillé jusqu'à J860 (2 s). Au moment où elle passe sous 95 % (vers J290), elle **change de couleur, ambre → rouge**. « 8,7 % » apparaît au bout.
  3. Au clic suivant (ou 1 s plus tard) : la courbe « avec le plan » se trace depuis J94 et reste au-dessus de 95 %. Elle est verte, puis ambre à partir de J550, quand les trois quarts de la marge de 5 % sont consommés (perte ≥ 3,75 %, règle `boneColor` de `rules.ts`). « 4,2 % » apparaît. La bande d'incertitude s'estompe autour des deux fins de courbe. Une légende courte explique les trois couleurs. **(v3)** Une seule ligne de légende : la deuxième (« couleur : règle de l'app, ambre dès 3/4 de la marge… ») est retirée, illisible à 5 m. Le chiffre « 4,2 % » est en blanc : l'ambre reste sur le trait, sinon le jury lit « le plan échoue aussi ». Seuil à vérifier si on le cite : la slide disait 3,75 %, la fiche v3 et ses tests disent ambre à 4 %.
- **Option** (si place) : petite ligne sous le graphique, « Cœur à l'arrivée : 36,5 → 37,3 ml/kg/min (minimum de sortie NASA : 36,5) [V1 4002] ».

## Slide 8 · Le pire cas : le médecin *(7 min)*

- **Le seul message** : l'app sait dire « ce n'est plus à moi de décider ».
- **Texte** : « Quand le plan ne suffit pas, c'est au médecin. » (9 mots). **(v3)** Le titre reste dans le deck, mais Walid ne le lit pas : la médiane avec le plan (95,8 %) respecte la norme. Il dit : « Dans le pire cas, même avec le plan, la hanche passe sous la limite. » Le deck a pris ce titre : « Dans le pire cas, même avec le plan, c'est au médecin. »
- **Visuel** : à gauche, la fin de la courbe « avec le plan » de la slide 7 (zoom J700 → J860) : point ambre à 95,8 %, sa bande qui **touche** la ligne rouge (bas de bande 93,8 %). À droite, une carte message comme dans l'app : « Pour le médecin au sol : faut-il des bisphosphonates ? » **(v3)** (« réévaluer » laissait croire qu'il en prend déjà) avec « arrive dans ≈ 52 min » et un pictogramme d'envoi.
- **Source** : « Exercice + bisphosphonates : perte osseuse ≈ 0 % dans les études en vol [NASA, justification de V1 4027]. L'app ne prescrit pas. »
- **Animation** : la bande touche la ligne rouge (flash bref de la zone de contact, pas de clignotement continu), puis la carte message glisse de la courbe vers la droite.

## Slide 9 · Un signal, jamais un diagnostic *(7 min)*

- **Le seul message** : la santé mentale est suivie en comparant l'astronaute à lui-même, avec des garde-fous.
- **Texte** : « Un signal, jamais un diagnostic. » (5 mots) ; en petit : « L'astronaute voit d'abord. Il choisit de partager. »
- **Visuel** : courbe du score du modèle C (0 à 1) de J27 à J94, ligne de seuil grise marquée « seuil » (sans valeur à l'écran). Axe : « J27 · premier score », titre d'axe « référence (J0–J20) » : 21 jours de référence plus une fenêtre de 7 jours. Deux repères verticaux : **J75** « glissement simulé » (gris) et **J83** « signal » (ambre).
- **Données** : score ≈ 0 de J28 à J72 ; J72 0,005 ; J76 0,024 ; J80 0,081 ; **J83 0,617 (premier jour au-dessus du seuil)** ; J85 0,913 ; J88 0,977 ; J94 0,994.
- **Source (v3)** : « Données simulées, glissement injecté par l'équipe à J75 [H]. » Une ligne. Écart à connaître : `/mental` (prototype multi-agents) donne le signal à J85, le modèle C à J83 ; réponse prête dans `05-questions-jury.md`, question 19. Les performances du modèle C (92 % d'épisodes détectés, délai médian 13 j, 6 % de fausses alertes, cohorte simulée de 1 500) passent en annexe A2.
- **Animation** : la courbe se trace, reste plate, le repère J75 apparaît alors que la courbe ne bouge pas encore (« le modèle ne le sait pas »), puis elle monte et franchit le seuil à J83 : le repère ambre s'allume.

## Slide 10 · 20 To à bord, 4 Ko vers la Terre *(7 min)*

- **Le seul message** : tout doit être calculé à bord ; c'est aussi pour ça que la consigne ne peut pas venir de la Terre.
- **Texte** : « 20 To à bord. 4 Ko vers la Terre. » (8 mots)
- **Source** : « Scan brut ≈ 20 To, estimé par l'équipe [H]. Au mieux quelques Mb/s : des mois, voire des années d'envoi. Mesures par organe : quelques Ko [H]. » (20 To à 6 Mb/s ≈ 10 mois ; à 2 Mb/s ≈ 2,5 ans. On n'écrit plus « plus de 2 ans », faux au-dessus de 2,5 Mb/s.)
- **Visuel** : à gauche (le vaisseau), un grand carré plein « 20 To ». À droite, la Terre (même point que slide 1).
- **Animation (rapport d'échelle)** : le carré se comprime en un point minuscule (« 4 Ko ») qui part vers la Terre le long de la ligne de la slide 1, à la même vitesse lente que l'impulsion de lumière (rappel visuel du délai).

## Slide 11 · Réel / Simulé

- **Le seul message** : on dit exactement ce qui est vrai.
- **Texte** (deux colonnes, 12 mots au plus par colonne) :
  - **RÉEL** : Normes NASA · Distance Terre-Mars · Pouls d'Ahmed
  - **SIMULÉ** : Haddad · Ses scans · Ses prises de sang · Ses réponses au check-in
  - **(v3)** « Check-in saisi » sort de la colonne Réel : la saisie est en direct, mais les valeurs 2/4/0/2 sont celles d'un persona fictif.
  - En bas : « Les règles appliquées sont réelles. »
- **Visuel** : deux panneaux de même taille, mêmes styles que les étiquettes de provenance de l'app (« RÉEL », « SIMULÉ »). Pas de couleur de statut (ce ne sont pas des statuts).
- **Animation** : aucune. Apparition directe. C'est une slide de confiance, elle doit être calme.

## Slide 12 · Avant Mars : CHAPEA *(7 min)*

- **Le seul message** : il existe un terrain réel et proche, avant Mars.
- **Texte** : « Avant Mars, un premier terrain. » ; trois chiffres : **378 jours**, **4 personnes**, **isolées** (CHAPEA, NASA, mission 1) ; une ligne : « Le check-in et la consigne s'y appliquent tels quels. Pas le scanner. »
- **Visuel** : chiffres seuls, pas de photo. (La v1 avait quatre vignettes génériques : le jury blanc les a jugées vagues.)
- **Animation** : les chiffres, puis les deux phrases.
- **(v3)** Dans le 7 min, Steve passe cette slide sans parler (un clic). Elle reste dans le deck pour la question « Et après le hackathon ? ».

## Slide 13 · La réponse est à bord

- **Le seul message** : la phrase de fin.
- **Texte** : « Mars est à 11 minutes. La réponse est à bord. » (10 mots) ; en bas : « Sol Zéro · TSP2k29 · Ahmed, Mouad, Steve, Walid · NASA Space Apps 2026 ».
- **Visuel** : reprise exacte de la slide 1 (Terre, ligne, Mars), avec cette fois un petit point fixe : le vaisseau, étiqueté « Haddad, J94 », placé à 45 % du trajet (J94 sur 210 jours d'aller). C'est une position en temps, pas en distance. **(v3)** Le point « Haddad, J94 » est retiré du deck : à 45 % du trajet, il suggérait environ 5 min de délai, alors que la démo affiche 52 min calculées avec 11 min. La slide garde la ligne Terre–Mars et l'impulsion.
- **Animation** : une impulsion part de la Terre, mais un halo blanc s'allume d'abord **sur le vaisseau** (la réponse est déjà là) pendant que l'impulsion continue son voyage. « La réponse est à bord. » apparaît à ce moment-là.

---

## Annexes (après la slide 13, jamais montrées sauf besoin)

- **A1 · Démo de secours** : 5 captures plein écran (réduites à 87,5 %, légende sous l'image) prises sur la build de démo : War Room après le check-in (2/4/0/2), page « Pourquoi » de la hanche, Corps J94, Corps J860 rythme actuel et avec le plan. Si le portable de démo lâche, Mouad passe ces captures pendant que les orateurs disent le même texte. À faire dimanche après le gel (les captures de `status/shots/` datent d'avant la refonte d'interface). **(v3)** Les captures actuelles montrent « Aucune mesure » pour la FC, « Check-in du matin » encore à faire alors qu'il est rempli, et « Prévenir le CMO » à 06:45 avant le check-in de 07:00. À refaire avec le pouls réel après le gel, ou à ne pas montrer.
- **A2 · Nos trois modèles d'IA** (pour les questions) : tableau à 3 lignes.

| Modèle | Méthode | Données | Résultat |
| :-- | :-- | :-- | :-- |
| A. Âge sanguin | Régression ElasticNet | NHANES 2015–2018, réel (≈ 9 300 adultes) | R² 0,28, ±11,8 ans : faible, affiché avec sa limite |
| B. Projection des organes | Régression quantile 10/50/90 % | Cohorte simulée calibrée NASA (2 000) | Bat la projection sans IA partout (cuisse J860 : 0,9 contre 2,7 points) ; la bande couvre ≈ 80 % |
| C. Signal d'humeur | Régression logistique sur la référence personnelle | Cohorte simulée (1 500), épisodes injectés | 92 % détectés, délai médian 13 j, 6 % de fausses alertes |

- **A3 · Sources** : NASA-STD-3001 Vol. 1 Rev C (V1 3006, 4002, 4003, 4027, 4030, 5003) ; JPL Horizons ; Zeitlin 2013 et Hassler 2014 (RAD) ; LeBlanc 2000 ; Moore 2014 ; Stahn 2017 ; Lambe 2025 ; Levine 2018 (PhenoAge) ; crédits 3D Z-Anatomy, BodyParts3D.
