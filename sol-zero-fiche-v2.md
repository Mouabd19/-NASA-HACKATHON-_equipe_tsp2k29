# SOL ZÉRO v2 — fiche projet enrichie

NASA Space Apps 2026, défi « Health monitoring software for astronauts ».

> **En deux mots.** Chaque jour, un check-in de 90 secondes. Une partie des mesures vient d'une **vraie Apple Watch**. SOL ZÉRO répond à trois questions :
> 1. **Quoi faire maintenant**, et qui prévenir (moi, le médecin de bord, le médecin au sol) selon le délai radio réel.
> 2. **Dans quel état j'arriverai sur Mars** et au retour, comparé aux **vraies normes de la NASA**.
> 3. **Ce que la séance de ce soir y change.**
>

---

## 0. Ce qui change par rapport à la v1

| Ajout ou changement | D'où ça vient | Pourquoi |
|---|---|---|
| **Seuils corrigés** sur la norme NASA en vigueur (NASA-STD-3001 Vol. 1 **Rev C**, 2023) | Vérification des sources | La v1 citait 75 % pour le VO₂ et un T-score de −2,0. La Rev C dit **80 %** et **95 % de la densité osseuse de la hanche**. Un juré qui connaît la norme l'aurait vu. |
| **Apple Watch** en entrée réelle pour une partie de la démo | Votre demande | Une vraie mesure en direct, et un pont concret vers les capteurs de vol |
| **Consigne MAINTENANT / ENSUITE + curseur « lien Terre » + message au médecin** | SOL CHECK (5ᵉ) | Répond à la question du sujet : « quand faut-il prévenir l'équipage ou les flight surgeons ? » |
| **Données NASA réelles** : JPL Horizons, Curiosity/RAD, normes Rev C | Votre demande | Tout chiffre affiché a une source cliquable |
| **Rejeu de la tempête solaire supprimé** | Votre demande | On est l'astronaute en plein voyage : pas de simulation d'événement passé. Les radiations restent un indicateur suivi au quotidien |
| **Message du « moi futur »** | Angle original (discussion précédente) | Ce qui différencie le projet dans le pitch |
| **Idées tirées du protocole Blueprint de Bryan Johnson** : vitesse de déconditionnement, FC au coucher, « le protocole décide, pas le moi du soir » | Votre demande | Trois mécaniques simples, transposées au vol (§9). Ses chiffres ne servent **pas** de normes |
| **Scanner d'organes (Midjourney Medical) → « jumeau d'organes »** | Votre demande | Chaque organe a son état mesuré, son état attendu à J+X et sa vitesse de dégradation. Chaque scan resserre la bande d'incertitude (§10) |

**Règle de la v2 : chaque chiffre porte une étiquette.**
- **[NASA]** : norme ou donnée NASA, vérifiée.
- **[Publié]** : article scientifique.
- **[H]** : hypothèse de l'équipe, réglable dans l'app.
- **[Persona]** : choix du scénario de démo.

---

## 1. Nom et pitch

**SOL ZÉRO** (« sol » = un jour martien ; Sol 0 = le jour de l'arrivée).

> « Les autres outils vous disent comment vous allez aujourd'hui. SOL ZÉRO vous dit quoi faire maintenant, qui prévenir, et dans quel état vous poserez le pied sur Mars, comparé aux limites que la NASA s'impose. »

**Accroche du pitch** (reprise de DRIFT) : « Pourrez-vous marcher en sortant du vaisseau ? »

---

## 2. Le problème, en faits

**La cible.** La Cdt L. Haddad **[Persona]** est en transit Terre → Mars, au jour 94 (J94) d'une mission de 860 jours :
- 180 j d'aller ;
- 500 j en surface ;
- 180 j de retour.

**1. Personne à bord n'est forcément médecin.**
- La NASA exige au moins **2 Crew Medical Officers (CMO)** par véhicule **[NASA, V1 3006]**.
- Un CMO « est souvent, mais pas obligatoirement, médecin » **[NASA, V1 5003]**.

**2. Le médecin au sol est loin.**
- Délai radio aller Terre–Mars : 3,0 min au plus près, 22,3 min au plus loin. C'est le calcul distance / vitesse de la lumière, pour 54,6 et 401 millions de km.
- **Le 14 novembre 2026, Mars est à 11,0 minutes-lumière de la Terre** **[NASA, JPL Horizons]**.
- Pendant la conjonction solaire (le Soleil entre la Terre et Mars), les missions martiennes suspendent leurs commandes pendant **environ 2 semaines** **[NASA]**.

**3. Deux dégradations lentes ont une limite NASA chiffrée.**

| Système | Norme NASA (Rev C) | Ce qui se passe en vol |
|---|---|---|
| **Cœur / endurance** | VO₂max en mission **≥ 80 % du pré-vol** **[NASA, V1 4003]**. Pour une sortie (EVA) sur une surface planétaire : **VO₂max ≥ 36,5 ml/kg/min** **[NASA, V1 4002]** | Chute en début de vol, rattrapage partiel par l'exercice, nouveau creux au retour en gravité (Moore 2014) **[Publié]** |
| **Os / hanche** | Densité osseuse de la hanche et du rachis **≥ 95 % du pré-vol**, col du fémur ≥ 90 % **[NASA, V1 4027]** | Sans contre-mesure, la hanche perd 1 à 1,5 % par mois (LeBlanc 2000) **[Publié]**. Avec l'ARED, la plupart des astronautes reviennent de 6 mois sur l'ISS avec moins de 5 % de perte à la hanche **[NASA, justification de V1 4027]** |

**4. La température « normale » change en apesanteur.** La température centrale au repos des astronautes de l'ISS monte d'environ **+1 °C** et se stabilise après environ 75 jours (Stahn et al. 2017, *Scientific Reports*) **[Publié]**. Un seuil de fièvre « terrestre » à 38 °C déclencherait donc de fausses alertes. C'est pour cela que SOL ZÉRO compare toujours chaque mesure à **la référence de vol de l'astronaute**.

**L'existant.**
- Bio-Monitor (ASC), Apple Watch, Oura : ils mesurent l'état du jour.
- L'Integrated Medical Model de la NASA projette les risques côté sol, à l'échelle d'une population.
- **Aucun outil côté astronaute ne projette *sa* marge sur *les normes NASA*, à *son* échéance, en disant *qui* doit décider selon le délai radio.**

---

## 3. Le concept (lisible en 10 secondes)

L'écran principal a **trois blocs** :

**① La consigne du jour (de SOL CHECK)**
- **MAINTENANT** : ce que je fais tout de suite. Cette ligne **ne dépend jamais** de la distance à la Terre.
- **ENSUITE** : qui décide (moi, le CMO, le médecin au sol) et quand arrivera la réponse. Cette ligne **dépend du lien Terre**.

**② Deux silhouettes : « Moi J94 » et « Moi à l'échéance »**
- Un curseur de temps J94 → Sol 0 → J860 recolore la silhouette (idée de LANDFALL).
- Chaque zone affiche la norme NASA qu'elle applique et une **bande d'incertitude**. Si la bande franchit un seuil, la zone est hachurée.
- **Gris = inconnu, jamais vert par défaut** (idée de TETHER).

**③ Le message du « moi futur »**
- Chaque soir, un court message écrit à partir des projections chiffrées par des **gabarits**, sans IA libre.
- Il arrive avec le vrai délai radio du jour : « reçu avec 7 min 12 s de retard ».

---

## 4. Les données réelles de la NASA utilisées

| Source | Ce qu'on en tire | Comment (en 48 h) | Statut |
|---|---|---|---|
| **NASA-STD-3001 Vol. 1 Rev C** (sept. 2023) | Tous les seuils rouges : VO₂ 80 % et 36,5 ml/kg/min, hanche 95 %, dose de carrière 600 mSv, 2 CMO | `standards.json` : chaque entrée porte son identifiant (« V1 4003 »), la citation exacte et le lien PDF. Cliquable dans l'app | **Vérifié** (texte de la norme lu) |
| **JPL Horizons API** (`ssd.jpl.nasa.gov/api/horizons.api`) | Distance Terre–Mars réelle → délai radio à n'importe quelle date ; dates de conjonction | `scripts/fetch-horizons.ts` : quantités 20 (distance) et 21 (temps-lumière), pas d'un jour sur toute la mission | **Testé** : 11,01 min le 14/11/2026 |
| **Curiosity / RAD** | Dose en croisière : **1,84 mSv/j** (Zeitlin 2013) ; en surface : **0,64 mSv/j** (Hassler 2014) | `environments/*.json` | **[Publié]**, données sur le Planetary Data System de la NASA |
| **NASA OSDR — Inspiration4** | Preuve que l'Apple Watch a déjà volé : les 4 civils d'Inspiration4 (2021) portaient une Apple Watch Series 6. Leurs données sont dans l'Open Science Data Repository de la NASA | Diapo « et après » ; H0–H2 : identifier le jeu de données exact | **Partiel** : présence confirmée, jeu exact à trouver |
| **Perseverance, 18/02/2021** | Délai radio le jour de l'atterrissage : 11 min 22 s | Phrase du pitch | **[NASA]** |

**Ce qui reste simulé, et le dit à l'écran** : l'historique de Haddad (fichier généré à graine fixe), son dosimètre, ses séances. Toutes les **règles et seuils** appliqués à ces données simulées sont réels.

---

## 5. L'Apple Watch dans la démo

### Ce qu'elle apporte
L'Apple Watch donne **de vraies mesures en direct** sur le présentateur. Elle joue le rôle des capteurs portés à bord, comme le Bio-Monitor de l'Agence spatiale canadienne sur l'ISS.

**Phrase honnête pour le jury** : « Ce n'est pas du matériel de vol. C'est un capteur grand public qui prouve que le logiciel accepte de vraies données. »

### Ce qu'on lit, et à quoi ça sert

| Mesure Apple Watch (nom HealthKit) | Usage dans SOL ZÉRO | Limite à afficher |
|---|---|---|
| FC de repos (`RestingHeartRate`) | Référence de vol, alerte à +10 bpm pendant 3 jours | — |
| VFC (`HeartRateVariabilitySDNN`) | Indicateur de fatigue et de stress, en tendance | Mesure ponctuelle, bruitée : tendance seulement |
| **VO₂max estimé** (« Forme cardio », `VO2Max`, en ml/kg/min) | **Comparé directement à la norme NASA de 36,5 ml/kg/min [V1 4002]** | Erreur moyenne d'environ **13 %**, avec une **sous-estimation** moyenne d'environ 6 ml/kg/min (Lambe et al. 2025, *PLOS ONE*, n = 30) **[Publié]**. L'app affiche donc une bande de ±13 % et l'étiquette « estimation montre, à confirmer par test d'effort » |
| Température du poignet la nuit (`AppleSleepingWristTemperature`, Series 8 et plus, Ultra) | Écart à la référence personnelle, le même principe que la référence de vol (Stahn 2017) | Température de la peau, pas température centrale |
| Sommeil (`SleepAnalysis`) | Dette de sommeil sur 7 jours | — |
| **FC au coucher** (`HeartRate`, moyenne des 10 min avant l'endormissement) | Idée Blueprint (§9) : prédire la qualité de la nuit et la vigilance du lendemain | Lien non validé scientifiquement : testé sur **les propres données** de l'utilisateur, affiché « hypothèse » tant que la corrélation n'est pas établie |
| ECG 1 dérivation (app ECG, 30 s) | En cas de palpitations : l'enregistrement est **joint au message au médecin** | Sert à orienter, pas à diagnostiquer |

### Comment les données arrivent dans l'app web (sans écrire d'app iPhone)
Un navigateur **ne peut pas lire l'Apple Watch directement** : HealthKit n'a pas d'API web. On utilise donc deux voies.

1. **Historique (MVP, fiable).**
   - Sur l'iPhone : app Santé → photo de profil → **Exporter toutes les données de santé**. On obtient `export.zip`, qui contient `export.xml`.
   - On le glisse dans SOL ZÉRO. Un parseur en flux (le fichier peut faire des centaines de Mo) ne garde que les types du tableau.
   - Résultat : la **vraie référence sur 30 jours du présentateur**.
2. **Mesure en direct (le moment fort).**
   - Un **Raccourci iOS** enchaîne « Rechercher des échantillons de santé » (fréquence cardiaque, la plus récente) puis « Obtenir le contenu de l'URL » (POST vers le portable, sur le partage de connexion du téléphone).
   - Un mini serveur local (middleware Vite, environ 30 lignes) reçoit la valeur, et l'écran affiche « Mesure Apple Watch reçue à 14:02:37 ».
   - Avant le passage : ouvrir l'app Fréquence cardiaque sur la montre pour forcer une mesure fraîche.
   - Piège connu : le JSON de Raccourcis est capricieux. Il faut envoyer un objet plat construit dans une action Texte.
3. **Plan de secours** : bouton « dernière mesure enregistrée » et saisie manuelle. La démo ne dépend jamais du réseau.

### Le moment de démo
Le présentateur lève le poignet. Son pouls arrive à l'écran, comparé à **sa** référence sur 30 jours. Puis :

> « Ma montre m'estime à 41 ml/kg/min. La NASA exige 36,5 pour marcher sur Mars. À ±13 % près, et l'app me le dit, je passe. »

---

## 6. Prévenir le bon médecin au bon moment (idées de SOL CHECK)

### La consigne en deux parties
Chaque alerte produit une carte unique :

| MAINTENANT (indépendant de la distance) | ENSUITE (dépend du lien Terre) |
|---|---|
| L'action à faire tout de suite, tirée de la fiche protocole | Qui décide, à quelle heure arrive la réponse, et quoi faire en attendant (idée de CASCADE) |

### Le curseur « lien Terre »

| Position | Délai aller | ORANGE (ambre urgent) | ROUGE |
|---|---|---|---|
| ISS | < 1 s | CMO + médecin au sol en direct | Le sol guide le protocole déjà lancé |
| Lune | 1,3 s | Idem | Idem |
| Mars proche | 3,0 min | Le CMO décide, le sol est informé | Le CMO dirige, le sol suit en parallèle |
| **Mars, date du scénario** | **Calculé par JPL Horizons** | Le CMO décide, rapport au sol | Le CMO dirige **maintenant**, avec un compte à rebours de réponse |
| Conjonction | Aucun lien | Décision en équipage, journal pour le sol | L'équipage dirige, message mis en file d'attente |

- **Compte à rebours** : heure d'envoi + 2 × délai + 20 min de traitement au sol **[H]**. Pour Haddad à J94 (délai 7,2 min **[Persona]**), la réponse arrive au plus tôt après 14,4 min, et vers 34 min de façon réaliste.
- **Deux règles testées automatiquement** :
  1. MAINTENANT est **identique** aux 5 positions.
  2. La distance ne baisse **jamais** le niveau et ne retire jamais une action.

### Trois façons de « contacter le médecin »
1. **Prévenir le CMO** (à bord, immédiat) : un bouton qui envoie la carte au CMO de garde.
2. **Message urgent au flight surgeon**. Le paquet contient :
   - les mesures du jour ;
   - la règle déclenchée ;
   - la tendance Apple Watch ;
   - l'ECG s'il y en a un.

   L'écran montre **l'aperçu exact** avant l'envoi, l'heure d'arrivée et l'heure de réponse au plus tôt. L'humeur est **décochée par défaut**.
3. **Point de routine avec le médecin au sol (nouveau niveau « Sol-routine »)**. Il se déclenche quand le plan d'exercice ne suffit pas à rester dans la norme, même parfaitement suivi.
   - Exemple Haddad : la hanche au retour reste ambre, même avec le plan.
   - La norme NASA indique que les **bisphosphonates** associés à l'exercice ont ramené la perte osseuse à environ 0 % dans les études en vol **[NASA, justification de V1 4027]**.
   - Seul un médecin peut prescrire. L'app ajoute donc la question au prochain paquet sol, **sans alarme**.

### Signes d'alerte (règle R13 de SOL CHECK)
- Douleur thoracique, essoufflement inhabituel, malaise : la carte passe **ORANGE immédiatement**.
- MAINTENANT : « arrête l'effort, allonge-toi, mesure FC et tension, ECG montre si palpitations ».
- L'app n'attend pas la mesure pour réagir.
- **Une entrée obligatoire expirée donne « données insuffisantes », jamais VERT.**

---

## 7. Modèles et chiffres corrigés (Haddad, J94)

### Cœur : VO₂max
- **Modèle** : identique à la v1 (plancher en vol F = 10 %, rattrapage λ, perte sans exercice u, creux au retour L = +5 points).
- **Seuils corrigés** :
  - rouge si le déficit est ≥ 20 % (norme 80 % [V1 4003]) ;
  - ambre si ≥ 15 % **[H]** ;
  - en absolu, rouge si < 36,5 ml/kg/min (EVA de surface [V1 4002]).
- **VO₂max pré-vol de Haddad** : 44 ml/kg/min **[Persona]**.

| | J94 | Sol 0, rythme actuel (adhérence 0,5) | Sol 0, avec le plan (adhérence 1) |
|---|---|---|---|
| Déficit | 10,84 % | **17,09 %** (bande 13,52–20,38) | **15,15 %** (11,80–18,38) |
| VO₂max | 39,2 | **36,5** (35,0–38,1) | **37,3** (35,9–38,8) |
| Lecture | Vert | **Ambre ; le pire cas franchit les deux limites NASA** (hachuré rouge) | **Ambre ; plus aucun scénario sous les 80 %.** Le pire cas reste sous 36,5 : hachuré |

**Phrase de démo** : « Au rythme actuel, elle arrive sur Mars à 36,5, exactement la limite NASA pour sortir. Avec le plan, 37,3. »

### Hanche : densité osseuse
- **Seuils corrigés** :
  - rouge si la perte est > 5 % (norme ≥ 95 % [V1 4027]) ;
  - ambre si > 4 % **[H]**.
- Le T-score reste affiché **en information**, avec les seuils de l'OMS repris dans le glossaire de la Rev C : −1,0 pour l'ostéopénie, −2,5 pour l'ostéoporose. La référence utilisée est NHANES III (Looker 1998), à vérifier entre H0 et H2.
- J860≥ reste une **borne basse** : les 500 jours en surface ne sont pas comptés.

| | J94 | Sol 0 (J180), rythme / plan | **Retour J860≥, rythme actuel** | **Retour J860≥, avec le plan** |
|---|---|---|---|---|
| Perte | 1,99 % | 4,16 % (ambre) / 2,71 % (vert) | **8,70 %** (6,84–10,36) | **4,22 %** (3,32–5,02) |
| Lecture | Vert | — | **Rouge, sur toute la bande** ; T −1,13 | **Ambre ; le pire cas touche le rouge** ; T −0,81 |
| Action | — | — | Plan d'exercice | **« Sol-routine » : discuter des bisphosphonates avec le flight surgeon** |

**Ce que ça raconte** : l'exercice seul ne suffit pas sur 860 jours, et c'est ce que montrent les données de la NASA. L'app ne prétend pas tout régler : elle dit **quand c'est au médecin de décider**.

### Radiation
- **Débits** : croisière 1,84 mSv/j, surface 0,64 mSv/j **[Publié, RAD]**.
- **Au quotidien** : le dosimètre de bord donne la dose du jour, comparée au débit prévu. Si son alarme se déclenche, la carte passe ROUGE avec MAINTENANT « abri » : aucune attente du sol.
- **Dose de mission** : 2 × 180 × 1,84 + 500 × 0,64 = **982 mSv**, au-dessus de la limite de carrière de 600 mSv.
- C'est un **problème connu de toute mission martienne**, pas un bug de l'app. Il est affiché comme information de mission. Seul l'**excès par rapport au prévu** déclenche une alerte : seuils sur 7 jours et en cumul **[H]**, comme en v1.

### Le reste (inchangé)
- Vigilance (PVT-B, dette de sommeil), humeur (PHQ-2), tension, température par rapport à la référence de vol.
- « Retour gravité » grisé, avec son protocole J-3.
- Triage à 2 canaux (Aujourd'hui / Échéance).

---

## 8. Le message du « moi futur »

**Principe.** Chaque soir, après le check-in, un message de 2 ou 3 phrases écrit par des gabarits à partir des projections.

> « Ici toi, à Sol 0. Avec tes séances, j'arrive à 37,3 de VO₂max : je pourrai sortir. Ma hanche, elle, a besoin qu'on en parle au médecin. Ce soir, ARED. »
> *— reçu avec 7 min 12 s de retard*

**Pourquoi c'est sérieux.**
- Hershfield et al. (2011, *Journal of Marketing Research*) : des personnes qui voyaient une image vieillie d'elles-mêmes mettaient davantage d'argent de côté pour leur retraite **[Publié]**.
- **Hypothèse de l'équipe [H]** : le même mécanisme peut aider à suivre l'exercice, qui est la principale contre-mesure contre la perte d'os et d'endurance.
- Le message touche aussi le **danger « isolement »** du HRP.

**Garde-fous.**
- Pas d'IA libre : uniquement des gabarits remplis par des chiffres traçables.
- Jamais de message culpabilisant.
- Désactivable en un clic.

---

## 9. Ce qu'on emprunte à Bryan Johnson (protocole Blueprint)

### Ce qui est réellement public (vérifié le 14/11/2026)
- Johnson publie **son protocole complet** : alimentation, exercice, sommeil, compléments (protocol.bryanjohnson.com). Il publie aussi des **résultats de biomarqueurs** sur immortals.com, l'ancien blueprint.bryanjohnson.com.
- **Attention : ce ne sont pas des données brutes.** La page des biomarqueurs donne des **percentiles sans date ni valeur**, par exemple « densité osseuse : 99ᵉ percentile », « FC de repos : niveau athlète d'élite », « vitesse de vieillissement épigénétique : 0,48 ».
- Il n'y a **aucun fichier téléchargeable** (CSV ou autre) et aucun dépôt GitHub officiel trouvé.
- **Conséquence** : ses chiffres ne peuvent pas servir de référence dans l'app. Ce sont des percentiles d'une seule personne, sans protocole de mesure publié, et sans rapport avec le vol spatial. On **emprunte ses mécaniques**, pas ses données.

### Les 3 idées reprises

**1. Un seul chiffre de tête : la « vitesse de déconditionnement »**
- Johnson résume tout par un chiffre unique, sa « vitesse de vieillissement » (0,48 = il vieillit 0,48 an par an).
- SOL ZÉRO fait pareil pour chaque organe : **vitesse = perte réelle / perte d'un astronaute sans exercice**. Le calcul sort directement du modèle (§7) :

| Organe | Rythme actuel (adhérence 0,5) | Avec le plan (adhérence 1) |
|---|---|---|
| Hanche | **0,6×** (1 − 0,8 × 0,5) | **0,2×** |
| Cœur (VO₂) | déficit qui monte vers 13 % (plancher F + perte u) | déficit qui redescend vers 10 % (plancher F) |

- En tête d'écran : « **Ta hanche vieillit à 0,6× la vitesse d'un astronaute sans exercice. Ce soir, ARED : 0,2×.** » C'est plus parlant qu'un T-score.
- **Coût** : environ 1 h pour C (`gain.ts`), dans le créneau H8–H12.

**2. La FC au coucher comme signal du soir**
- Johnson dit regarder sa FC de repos avant de dormir (il cite environ 44 à 48 bpm) pour prédire sa nuit. Il recommande de manger tôt et de couper les écrans pour la faire baisser. C'est **son observation personnelle, pas un résultat publié**.
- SOL ZÉRO lit cette FC sur l'Apple Watch au check-in du soir, puis cherche **dans les données de l'astronaute** si elle prédit son PVT du lendemain. La corrélation est affichée avec le nombre de jours.
- Tant que le lien n'est pas établi (par exemple moins de 30 nuits), l'indicateur reste **gris « hypothèse »**. C'est la règle « gris = inconnu ».
- Dans la démo, avec l'export Santé du présentateur : « sur mes 30 dernières nuits, ma FC au coucher prédit / ne prédit pas mes réflexes du lendemain ». Le résultat se montre tel quel, même s'il est nul.

**3. « Le protocole décide, pas le moi du soir »**
- Johnson décrit un « Evening Bryan », la version de lui-même qui, le soir, veut céder (manger tard, se coucher tard). Sa réponse : laisser le **protocole** décider à sa place.
- C'est exactement le moment où l'astronaute saute sa séance d'ARED. SOL ZÉRO oppose donc les **deux moi** :
  - le **moi du soir** (« pas ce soir ») ;
  - le **moi de Sol 0** (le message du §8, chiffré).
- Le plan du jour est **fixé le matin**. Le soir, l'app ne redemande pas « tu veux faire ta séance ? ». Elle rappelle **ce qui a été décidé** et ce que ça vaut en jours de marge.

### Ce qu'on ne prend pas
- **Ses chiffres comme normes** : seules les normes NASA servent de seuils.
- **Ses compléments et traitements** (HBOT, sauna, médicaments) : rien de cela ne s'applique en vol, et ce n'est pas validé.
- **Son nom sur scène, sauf une phrase** : c'est une figure controversée, et un jury NASA attend de la science. Formulation possible : « Des passionnés de longévité mesurent tout sur eux-mêmes. Nous avons pris leur meilleure idée, comparer chacun à lui-même, et nous l'avons branchée sur les normes de la NASA. »

---

## 10. Le scanner d'organes : un « jumeau du corps » qui se recale à chaque scan

### Ce que Midjourney a vraiment annoncé (vérifié le 14/11/2026)
- **18 juin 2026** : Midjourney lance une division **Midjourney Medical** et présente un scanner corps entier. L'annonce est faite par son PDG, David Holz.
- **Technologie** : **tomographie par ultrasons** (USCT). On descend dans un bassin d'eau tiède, entouré d'un anneau de capteurs à ultrasons (puces Butterfly Network), avec environ 2 pétaflops de calcul.
  - **Pas de rayons X, pas d'IRM.**
  - Selon Holz, **pas d'IA** dans la reconstruction pour l'instant.
- **Données** : environ **17 Go de données brutes par seconde**, environ 40 Go par coupe reconstruite.
- **Ce qui en sort** : des **cartes de composition corporelle** (muscle, graisse, os, volume des organes) et la segmentation des organes. Holz parle de suivi « quotidien, hebdomadaire ou mensuel », « comme on monte sur une balance ».
- **Statut réel** :
  - prototype ;
  - environ **20 min par scan** (l'objectif annoncé est 60 s) ;
  - environ **12 personnes scannées** ;
  - **aucune autorisation FDA** ; positionnement « bien-être » ;
  - premier centre (« Midjourney Spa », San Francisco) prévu **fin 2027**.
- **Aucun accès aux données brutes, aucune API et aucun jeu de données publics** n'ont été annoncés.

**Conclusion honnête : on ne peut pas utiliser ses données pendant le hackathon.** On peut en revanche concevoir SOL ZÉRO pour qu'il soit **prêt à recevoir ce genre de scan**, et le dire au jury.

### L'idée : chaque organe a trois chiffres
Les silhouettes du §3 deviennent une **carte d'organes**. Chaque organe affiche :

| Chiffre | Exemple : muscle de la cuisse de Haddad | D'où il vient |
|---|---|---|
| **État mesuré** (date du dernier scan) | Volume au scan pré-vol (J0) | Scan |
| **État attendu à J+X** | Volume projeté à Sol 0 et à J860, avec sa bande | Modèle (§7) |
| **Vitesse de dégradation** | 0,6× au rythme actuel, 0,2× avec le plan | Idée Blueprint (§9) |

**Ce que le scan change vraiment : il resserre la bande.**
- Aujourd'hui, la bande d'incertitude vient des bornes des coefficients publiés : c'est une incertitude « de population ».
- Chaque scan donne un **vrai point de mesure sur l'astronaute**. Le modèle se recale dessus, et la bande se resserre autour de *son* corps.
- **Montré à l'écran** : la bande avant et après le scan. C'est la meilleure illustration de « il dit quand il doute, et il doute de moins en moins ».

### Adapté au voyage (et c'est là que c'est malin)
- **En transit, ce scanner est impossible** : il faut un bassin d'eau, et en apesanteur l'eau ne reste pas dans un bassin. Il faut aussi beaucoup de masse et de calcul.
- **La NASA utilise déjà l'échographie** : c'est le seul moyen d'imagerie médicale à bord de l'ISS. Le principe physique est le même.
- **Le plan réaliste** :

| Moment | Appareil | Rôle dans SOL ZÉRO |
|---|---|---|
| Avant le départ (J0) | Scan complet au sol (type Midjourney, IRM ou DEXA) | **Référence de départ** de chaque organe |
| En transit | **Échographe portable** de bord, quelques organes ciblés (cuisse, mollet, cœur) | Recalage partiel, bande resserrée |
| Arrivée (Sol 0) et base martienne | Scanner fixe dans l'habitat, si la masse le permet | Nouveau point de mesure complet |
| Retour (J860) | Scan complet au sol | Vérifie la projection, mesure l'écart prévu / réel |

### Les métriques de vieillissement : ce qu'on peut dire et ce qu'on ne dit pas
- **On affiche** une **vitesse** : la perte réelle comparée à la perte d'un astronaute sans contre-mesure. Elle sort du modèle et des normes NASA.
- **On n'affiche pas** d'« âge d'organe » en années. La recherche existe (âge d'organe estimé à partir de protéines du sang ou d'imagerie), mais aucun outil validé ne la relie à un scan comme celui de Midjourney.
  - Dans le pitch, c'est une **piste**, pas une fonction.
  - Références à vérifier entre H0 et H2 : Oh et al. 2023 (*Nature*), Tian et al. 2023 (*Nature Medicine*).

### Comparer avec Bryan Johnson : trois façons de juger un organe
Un sélecteur **« Comparer à… »** sur chaque organe :

| Référence | Exemple | Ce que ça dit | Limite |
|---|---|---|---|
| **La population** (façon Bryan Johnson) | « Densité osseuse : 99ᵉ percentile » | Où je me situe par rapport aux autres | Ne dit rien de *ma* trajectoire ni des limites de mission |
| **Moi-même** (façon Midjourney, suivi dans le temps) | « Cuisse : −4 % depuis J0 » | Comment je change | Ne dit pas si c'est grave |
| **La norme NASA** (SOL ZÉRO) | « Hanche à J94 : 98,0 % du pré-vol, limite 95 % [V1 4027] » | Si je peux faire ma mission | — |

- **Le message du pitch** : « Bryan Johnson se compare aux autres. Le scanner de Midjourney vous compare à vous-même. SOL ZÉRO vous compare à ce dont votre mission a besoin. »
- Les percentiles de Johnson servent **uniquement d'exemple** de la première colonne. Ils ne deviennent jamais un seuil (§9).

### Dans les 48 h
- **MVP** : format d'entrée `organScan.json` (organe, volume, composition, date, appareil, incertitude) et recalage de la bande à chaque scan. Haddad a 2 scans **[Persona]** : J0 et une échographie de la cuisse à J60.
- **Écran** : sur la carte d'organes, la bande **avant et après scan**, et le sélecteur « Comparer à… ».
- **Bonus** : une vue 3D des organes à partir de modèles anatomiques libres (par exemple BodyParts3D ; licence à vérifier entre H0 et H2), colorés selon leur état attendu.
- **Coût** : environ 3 h pour C (recalage) et 2 h pour A (sélecteur et affichage avant/après). La vue 3D, environ 6 h, ne se fait que si tout le reste est fini.
- **Dans le pitch** (une phrase, à la fin) : « Le jour où un scanner comme celui annoncé par Midjourney existera, SOL ZÉRO saura déjà quoi en faire : chaque scan resserre la prévision. »

---

## 11. Architecture et stack (ajouts en gras)

- **Base** : Vite + React-TS, recharts, dexie (IndexedDB), zustand, vitest. 100 % local.
- **Modèles purs** dans `src/models/` : `aerobic`, `bone`, `tscore`, `radiation`, `fatigue`, `baseline`, `triage`, `gain`, `band`, **`router`**. `router` transforme un niveau et un lien Terre en { maintenant, ensuite, échéance } (repris de SOL CHECK).
- **`src/ingest/healthExport.ts`** : parseur en flux de `export.xml` (filtre par `type`).
- **`server/ingest.ts`** : middleware Vite `POST /ingest` pour le Raccourci iOS.
- **`scripts/fetch-horizons.ts`** : appel réel, sortie JSON dans `public/data/`. Rien n'est appelé pendant la démo.
- **`standards.json`** : identifiant NASA, citation, lien, `verified: true`.
- **`templates/futureSelf.json`** : les gabarits du moi futur.

**Tests d'or mis à jour** (extrait) :
```ts
expect(colorWithBand(17.09, [13.52, 20.38], {amber: 15, red: 20})).toEqual({color: 'amber', worst: 'red'})
expect(colorWithBand(15.15, [11.80, 18.38], {amber: 15, red: 20})).toEqual({color: 'amber', worst: 'amber'})
expect(vo2Absolute({pre: 44, deficit: 17.09})).toBeCloseTo(36.48, 2)              // limite EVA 36,5
expect(boneLossColor(8.70, [6.84, 10.36], {amber: 4, red: 5})).toEqual({color: 'red', worst: 'red'})
expect(boneLossColor(4.22, [3.32, 5.02], {amber: 4, red: 5})).toEqual({color: 'amber', worst: 'red'})
expect(triage(haddadJ94).groundRoutine).toContain('hipJ860')                      // plan insuffisant → médecin
for (const pos of ['ISS','Lune','MarsProche','MarsScenario','Conjonction'])
  expect(router(orangeHaddad, pos).maintenant).toEqual(router(orangeHaddad, 'ISS').maintenant)
expect(lightTimeMin(horizons, '2026-11-14')).toBeCloseTo(11.01, 1)
```

---

## 12. MVP et planning 48 h (4 personnes)

**MVP gelé à H0** : check-in ; carte d'organes avec recalage par scan (`organScan.json`) ; silhouettes et curseur ; modèles corrigés ; carte MAINTENANT/ENSUITE et curseur lien Terre ; **import `export.xml`** ; paquet sol ; message du moi futur.

**Hors MVP, dans l'ordre** : mesure Apple Watch en direct via Raccourci → vue 3D des organes → FC au coucher et corrélation personnelle → ECG joint au message → écran scindé → animations.

| Heures | A (interface) | B (check-in + Apple Watch) | C (modèles + règles) | D (science, données NASA, pitch) |
|---|---|---|---|---|
| H0–H1 | Gel du MVP et des seuils Rev C | idem | idem | idem |
| H1–H3 | Squelette, 4 écrans | Formulaires ; **export Santé du présentateur fait sur son iPhone** | `coefficients.json`, générateur Haddad | **`fetch-horizons`**, `standards.json` (Rev C, déjà vérifiée) ; trouver le jeu Inspiration4 dans OSDR |
| H3–H8 | Silhouettes SVG, hachures, gris | **Parseur `export.xml`** + référence 30 j | `aerobic`, `bone` (seuils 80 % / 95 %), `band`, `radiation` + tests | Fiches protocole ; textes « Pourquoi ? » avec liens vers la norme |
| H8–H12 | Curseur de temps, **carte MAINTENANT/ENSUITE** | PVT-B, Dexie | `triage` (+ Sol-routine), **`router`** + tests d'invariance | **Gabarits du moi futur** ; « vitesse de déconditionnement » dans `gain.ts` (C, 1 h) ; storyboard |
| H12–H14 | **Intégration 1 : parcours complet Haddad + données du présentateur** | | | |
| H14–H20 | Sommeil en roulement | | | |
| H20–H24 | **Curseur lien Terre** + compte à rebours | **Raccourci iOS + `POST /ingest`** (2 h maximum, sinon on coupe) | Paquet sol, message au médecin | Test avec 2 personnes extérieures |
| **H24** | **Jalon MVP : le script de 3 min tourne ; vidéo de secours n° 1** | | | |
| H24–H30 | Écran scindé (bonus) | ECG joint (bonus) | Cas limites | Diapos (5 maximum) |
| H30–H36 | Accessibilité | Mode secours Apple Watch | Tests | Script v2 |
| H36 | **Gel des fonctionnalités** | | | |
| H36–H42 | Sommeil, corrections uniquement | | | |
| H42–H48 | 10 déroulés en mode avion, **3 avec la montre** ; vidéo n° 2 ; soumission | | | |

**Règle de coupe** : si la mesure en direct de l'Apple Watch ne marche pas à H24, on garde seulement l'import `export.xml`. C'est **toujours de la vraie donnée Apple Watch**, juste pas en direct.

---

## 13. Démo de 3 minutes

Chaque écran porte une étiquette : **RÉEL** (données NASA ou montre), **SIMULÉ** (Haddad) ou **[H]**.

| Temps | Ce qu'on montre |
|---|---|
| 0:00–0:15 | Accroche. Délai radio du jour, en direct (JPL Horizons) |
| 0:15–0:50 | **RÉEL** : Apple Watch du présentateur (pouls, référence 30 j, VO₂max comparé à 36,5 avec ±13 %) |
| 0:50–1:20 | **SIMULÉ** : Haddad J94, check-in, consigne ORANGE → prévenir le CMO ; curseur lien Terre : MAINTENANT fixe, ENSUITE change |
| 1:20–2:15 | Curseur de temps : cœur à Sol 0 (36,5 → 37,3 avec le plan) ; hanche au retour (rouge → ambre) → « Sol-routine : en parler au médecin » |
| 2:15–2:45 | Message au médecin (aperçu, humeur décochée, heure de réponse) + message du moi futur reçu avec 7 min de retard |
| 2:45–3:00 | Conclusion |

---

## 14. Script du pitch (3 min)

*Une personne parle, une autre manipule l'app.*

**[0:00 – 0:15] Accroche**
> « Pourrez-vous marcher en sortant du vaisseau ? Sur Mars, aucun médecin ne vous attendra. Aujourd'hui, Mars est à onze minutes-lumière : une question au médecin, c'est vingt-deux minutes avant la moindre réponse. »

**[0:15 – 0:50] La vraie montre**
> « Voici SOL ZÉRO. Ce pouls, c'est le mien, en direct, depuis ma montre. L'app le compare à *ma* référence des 30 derniers jours, pas à une moyenne. Ma montre estime ma capacité d'endurance à 41. La NASA exige 36,5 pour sortir sur Mars, c'est écrit dans sa norme. Et l'app me rappelle qu'une montre se trompe d'environ 13 % : elle me dit quand elle doute. »

**[0:50 – 1:20] L'astronaute**
> « Maintenant, la commandante Haddad, jour 94, à mi-chemin. Trois nuits courtes, réflexes ralentis. Consigne : pas de sortie aujourd'hui, prévenir l'officier médical de bord. Une consigne, pas un graphique. »

*(Curseur lien Terre, de l'ISS jusqu'à la conjonction)*
> « J'éloigne la Terre. Ce qu'elle fait maintenant ne change jamais. Ce qui change, c'est qui décide ensuite : le sol, puis l'officier médical de bord, puis l'équipage seul. Quand le médecin est à vingt minutes, on n'attend pas le médecin. »

**[1:20 – 2:15] Les échéances**
*(Curseur jusqu'à Sol 0)*
> « Le vrai danger n'est pas aujourd'hui. Au rythme actuel, elle arrive sur Mars à 36,5 : pile la limite de la NASA pour sortir. »

*(On active le plan)*
> « Avec ses séances : 37,3. Chaque séance de ce soir rachète de la marge, et on vous dit combien. »

*(Curseur jusqu'au retour)*
> « Sa hanche au retour : rouge. Même avec le plan, on frôle la limite. Là, l'app ne fait pas semblant : c'est au médecin de décider, peut-être avec un médicament. Elle prépare la question pour le prochain message vers la Terre. »

**[2:15 – 2:45] Le lien humain**
> « Le message au médecin est prêt : relu, l'humeur décochée, c'est sa vie privée. La réponse arrivera au plus tôt dans quinze minutes, et l'app lui dit quoi faire en attendant. Et ce soir, elle reçoit un autre message, avec sept minutes de retard : le sien, celui d'elle-même le jour de l'arrivée. "Avec tes séances, je pourrai sortir. Ce soir, ARED." »

**[2:45 – 3:00] Conclusion**
> « Chaque seuil rouge est une norme de la NASA, chaque mesure du présentateur vient d'une vraie montre, chaque doute est affiché. SOL ZÉRO : quoi faire maintenant, qui prévenir, et dans quel état vous poserez le pied sur Mars. »

---

## 15. Sources

| Fait | Source | Statut |
|---|---|---|
| VO₂ ≥ 80 %, 36,5 ml/kg/min, hanche ≥ 95 %, 600 mSv, 2 CMO, CMO non forcément médecin, définitions T-score | [NASA-STD-3001 Vol. 1 Rev C](https://standards.nasa.gov/sites/default/files/standards/NASA/C//nasa-std-3001-vol-1-rev-c-signature.pdf) ; [Technical Brief Exercise, OCHMO](https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-031-exercise-overview.pdf) | Vérifié (texte lu) |
| Délai radio du jour | [JPL Horizons API](https://ssd.jpl.nasa.gov/api/horizons.api) | Vérifié (11,01 min le 14/11/2026) |
| +1 °C de température centrale en vol | [Stahn et al. 2017, *Sci. Rep.*](https://air.unimi.it/bitstream/2434/533558/2/ScientificReports_IncreasedCoreBodyTemperature_2017.pdf) | Publié |
| Précision du VO₂max Apple Watch | [Lambe et al. 2025, *PLOS ONE*](https://pubmed.ncbi.nlm.nih.gov/40373042/) | Publié |
| Apple Watch sur Inspiration4, données dans OSDR | [Space Explored 2021](https://spaceexplored.com/2021/09/03/spacex-inspiration-4-apple-watch-iphone-ipad/) ; [NASA SOMA](https://www.nasa.gov/?p=729460) | Partiel |
| 1,84 et 0,64 mSv/j | Zeitlin 2013 (*Science*) ; Hassler 2014 (*Science*) | Publié, à relire entre H0 et H2 |
| Perte osseuse 1 à 1,5 %/mois ; VO₂ en vol | LeBlanc 2000 ; Moore 2014 | Publié, à relire entre H0 et H2 |
| Soi futur et épargne | Hershfield et al. 2011, *J. Marketing Research* | Publié ; transposition à l'exercice = hypothèse |
| Protocole et biomarqueurs de Bryan Johnson (percentiles, pas de données brutes) | [protocol.bryanjohnson.com](https://protocol.bryanjohnson.com/) ; [immortals.com/pages/biomarkers](https://www.immortals.com/pages/biomarkers) | Vérifié (pages lues) |
| Scanner Midjourney Medical (annonce du 18/06/2026, prototype USCT, pas de FDA, pas de données publiques) | [TechTimes](https://www.techtimes.com/articles/318628/20260618/midjourney-full-body-ultrasound-scanner-targets-mri-speed-prototype-runs-20-minutes.htm) ; [Latent Space](https://latent.space/p/ainews-midjourney-medical-scan-your/) ; [PYMNTS](https://www.pymnts.com/news/artificial-intelligence/2026/midjourney-enters-medical-imaging-with-60-second-full-body-scan/) | Vérifié (presse ; pas de document technique Midjourney lu) |
| Échographie = seule imagerie médicale à bord de l'ISS | NASA (à citer précisément entre H0 et H2) | À vérifier |
| FC au coucher 44–48 bpm, « Evening Bryan » | Déclarations de B. Johnson (interviews, essais) | Anecdotique, non publié scientifiquement |
