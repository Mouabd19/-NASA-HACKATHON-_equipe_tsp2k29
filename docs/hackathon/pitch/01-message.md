# 01. Le message

Le mentor a raison : un jury retient une idée. On tranche.

## L'idée en une phrase

> **Quand le médecin est à onze minutes-lumière, Sol Zéro dit à l'astronaute quoi faire ce matin, et lui prouve pourquoi.**

Version slide (8 mots) : **Quoi faire ce matin, sans attendre la Terre.**

C'est **le seul slogan**. Il est dit trois fois, mot pour mot : slide 4 (Steve), démo D1 (Ahmed), clôture (Steve). Les autres titres de slides restent à l'écran, on ne les déclame pas. Le jury blanc a relevé qu'avec quatre formules concurrentes, il n'en retenait aucune.

Ce que le jury doit pouvoir répéter en sortant : *« C'est l'équipe où l'astronaute fait son check-in, reçoit une consigne calculée à bord, et peut remonter jusqu'à la norme NASA. »*

Pourquoi celle-là et pas une autre :

- Elle colle au texte du défi : *« enables astronauts to evaluate and act on the status of their health »*. Évaluer (check-in, montre), agir (la consigne).
- Elle répond d'avance à l'attaque n° 1 du mentor (« c'est de la prédiction, pas de l'auto-évaluation ») : on commence par **aujourd'hui**. La projection n'est là que pour répondre à « est-ce que ce que je fais suffit ? ».
- Elle s'appuie sur un chiffre réel du jour de la démo : la distance Terre-Mars calculée par JPL Horizons (11,0 min le 14/11/2026, 10,9 min le 15/11). Aucune autre équipe n'aura ce chiffre-là.
- Le « pourquoi » n'est pas une deuxième idée : c'est la preuve qui rend la première crédible.

## Hiérarchie des idées

### Niveau 1 : à dire absolument (4 min comme 7 min)

| # | Idée | Preuve à l'écran | Chiffre et source |
| :-- | :-- | :-- | :-- |
| 1 | Le médecin est loin, et à bord personne n'est forcément médecin | Slides 1 et 2 | 11,0 min aller le 14/11/2026 [NASA JPL Horizons] ; 2 CMO par véhicule, « souvent mais pas obligatoirement médecin » [NASA-STD-3001 V1 3006, V1 5003] |
| 2 | Le matin, l'astronaute s'évalue (check-in + montre) et reçoit **une consigne**, pas un graphique | Démo War Room | Check-in en 4 taps ; pouls réel de la montre d'Ahmed |
| 3 | MAINTENANT est calculé à bord et ne dépend jamais de la distance ; ENSUITE dit qui décide et quand la réponse arrive | Démo D1 (« calculée à bord », ENSUITE : 52 min) ; slide 6 en 7 min seulement | 52 min = 2 × 11,0 min + 30 min de traitement au sol [H], un majorant (le vaisseau est plus près que Mars) ; invariance testée sur 5 niveaux × 5 positions × 7 délais |
| 4 | Chaque seuil rouge est une norme NASA, et on peut le vérifier en un clic | Démo « Pourquoi ? » | Hanche ≥ 95 % du pré-vol [V1 4027], citée mot pour mot |
| 5 | Suivre le plan chaque jour change la fin de mission, et on le chiffre | Démo timeline J860 + slide 7 | Perte de la hanche à J860 : 8,70 % au rythme actuel, 4,22 % avec le plan [modèle, H] |
| 6 | Ce qui est réel, ce qui est simulé | Slide 11 | Réel : normes, distance JPL, pouls d'Ahmed. Simulé : Haddad |

### Niveau 2 : si on a le temps (7 min)

- **Le cœur à l'arrivée** : VO₂max de Haddad à Sol 0 (J210) = 36,5 ml/kg/min au rythme actuel, pile la limite NASA pour une sortie en surface [V1 4002] ; 37,3 avec le plan. C'est la réponse à « pourra-t-il marcher en sortant du vaisseau ? » (question qu'on ne pose plus à l'oral en v3).
- **Quand le plan ne suffit pas, c'est au médecin** (« Sol-routine ») : même avec le plan, la hanche reste ambre à J860 ; l'app ajoute une question pour le médecin au sol sur les bisphosphonates (exercice + bisphosphonates ≈ 0 % de perte dans les études en vol [NASA, justification de V1 4027]). L'app ne prescrit rien.
- **Santé mentale** : signal d'humeur comparé à la référence personnelle. Glissement injecté par l'équipe à J75 (on le dit avant le résultat), signal à J83 (modèle C), agents à J85. « Un signal à regarder, jamais un diagnostic. »
- **20 To à bord, 4 Ko vers la Terre** : un scan brut ≈ 20 To, estimé par l'équipe [H] ; le lien Mars-Terre fait au mieux quelques Mb/s, soit des mois, voire des années d'envoi ; donc tout se calcule à bord.
- **Gris = inconnu, jamais vert par défaut.**
- **Bénéfice sur Terre** : patients alités, sarcopénie, bases polaires (Concordia) ; analogues NASA (HERA, CHAPEA).

### Niveau 3 : seulement en questions-réponses

- Les 3 modèles d'IA et leurs métriques (voir `05-questions-jury.md`, Q8).
- Âge biologique PhenoAge (43,1 ans à J91) et âge sanguin NHANES (44,6 ans, R² 0,28, erreur moyenne ±11,8 ans : trop faible pour le pitch).
- Le scanner en centrifugeuse à bras court : ≈ 0,1 g à ≈ 5,5 tr/min pour un rayon de 3 m [H] ; il ne mesure pas l'os.
- Température centrale +1 °C en vol (Stahn 2017) : on compare à la référence de vol, pas au 38 °C terrestre.
- Précision du VO₂max Apple Watch : erreur ≈ 13 %, sous-estimation ≈ 6 ml/kg/min (Lambe 2025, *PLOS ONE*, n = 30).
- Faisabilité : export Santé de 534 Mo parsé en 1,6 s dans le navigateur ; 147 tests verts ; aucun appel réseau pendant la démo.
- Radiations : 1,84 mSv/j en croisière (Curiosity RAD, Zeitlin 2013), limite de carrière 600 mSv [V1 4030].
- Inspiration4 : les 4 civils portaient une Apple Watch, données dans l'OSDR de la NASA.
- Licences 3D (Z-Anatomy CC BY-SA 4.0, usage non commercial du dérivé).

## Ce qu'on NE dit PAS

| On ne dit pas | Pourquoi | On dit plutôt |
| :-- | :-- | :-- |
| « précis », « fiable à 100 % », « diagnostic » | Les modèles sont des hypothèses étiquetées | « estimé », « avec sa bande d'incertitude », « un signal à regarder » |
| « l'IA décide » | Faux, et c'est ce qui fait peur à un jury médical | « MAINTENANT vient de règles et de seuils NASA. L'IA n'écrit que des synthèses étiquetées, relues par le CMO de bord. » |
| « jumeau numérique », « clone biomédical », « révolutionnaire » | Mots creux, et on n'a pas de scanner à bord | « le corps du jour », « le modèle » |
| Bryan Johnson, Blueprint, AlphaGenome | Pseudo-science aux yeux d'un jury NASA, hors sujet | rien |
| « Midjourney a scanné Haddad » | Aucune donnée publique ; tous les scans sont simulés | « un scan par échographie, simulé, dans notre hypothèse de mission » |
| « le scanner mesure la densité osseuse » | Faux : l'échographie voit mal l'os | « l'os vient du bilan au sol, du modèle et des marqueurs urinaires » |
| « 7 min 12 s de retard », « réponse dans 15 minutes » | Chiffres de l'ancienne fiche. L'app affiche 11,0 min et 52 min | « onze minutes », « 52 minutes » |
| « 982 mSv » ou « 802 mSv » | La fiche (982) et l'app (802 à J860) ne comptent pas le retour de la même façon | Si on nous le demande : « au-dessus de la limite de carrière de 600 mSv, comme toute mission martienne » |
| « l'app gère la conjonction en direct », « on a un curseur lien Terre » | Il n'existe pas dans l'app actuelle : c'est la slide 6 qui le montre | « c'est la règle du routeur, testée automatiquement » |
| « Haddad est en ORANGE aujourd'hui » sans check-in | Sans check-in saisi, J94 est AMBRE. ORANGE vient de **notre** check-in en démo | décrire ce qu'on saisit |
| « la commandante », « elle » | Le code modélise un homme (`sex: 'M'`), la page Santé mentale dit « astronaute fictif… il » | « le commandant Haddad », « il » |
| « âge sanguin 44,6 ans » dans le pitch | R² 0,28 : un juré statisticien le démonte | en Q&R seulement, avec la limite |
| « VO₂max de 41 » pour Ahmed | Valeur de l'ancienne fiche, non vérifiée ; la montre n'a pas de VO₂max récent (dernier : déc. 2025) | ne pas citer de VO₂max d'Ahmed |
