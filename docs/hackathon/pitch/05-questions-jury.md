# 05. Les questions les plus probables

> Version 3 (après le jury du 15/11) : questions 16 à 26 ajoutées, celles que le jury a jugées probables et qui manquaient. Questions 3 et 13 corrigées : les réponses au check-in sont celles de Haddad, donc simulées.

Chaque réponse tient en 30 secondes (≤ 70 mots). Elle commence par la réponse, pas par « bonne question ». Si on ne sait pas : « On ne l'a pas mesuré. Voici ce qu'on ferait. » Un juré respecte l'honnêteté, jamais le bluff.

**Qui répond** : science et modèles → **Mouad** ; montre, données, vie privée → **Ahmed** ; 3D, architecture, technique → **Walid** ; produit, défi, impact → **Steve**. Les autres se taisent, même s'ils ont une idée : une seule voix par question.

---

### 1. « Ce n'est pas de l'auto-évaluation, c'est de la prédiction. » (Steve)

> Non : on commence par aujourd'hui. Le check-in du matin et la montre, c'est l'auto-évaluation, et elle produit la consigne MAINTENANT. La projection ne sert qu'à une question : est-ce que ce que je fais ce matin suffit ? Sans elle, une hanche à 98 % a l'air parfaite. Avec elle, on voit que le rythme actuel mène à 8,7 % de perte en fin de mission.

Source : défi NASA, *« enables astronauts to evaluate and act on the status of their health »*.

### 2. « Vos modèles sont inventés. D'où viennent vos coefficients ? » (Mouad)

> Les seuils ne sont pas à nous : ce sont ceux de la norme NASA-STD-3001, révision C. Les courbes sont calées sur des données publiées : perte osseuse de 1 à 1,5 % par mois sans exercice, moins de 5 % à la hanche après 6 mois avec l'ARED. Le reste est marqué [H], hypothèse de l'équipe, avec une bande d'incertitude. On ne dit jamais « précis ».

Sources : [V1 4027], LeBlanc 2000, justification de V1 4027 (ARED), Moore 2014 (VO₂max).

### 3. « Qu'est-ce qui est réel dans votre démo ? » (Mouad)

> Réel : les normes NASA, la distance Terre-Mars calculée avec JPL Horizons, 11,0 minutes le 14 novembre, et les données de la montre d'Ahmed : pouls en direct, fréquence au repos, variabilité. Simulé : Haddad, ses scans, ses prises de sang, sa SpO₂, et ses réponses au check-in (la saisie est en direct, les valeurs sont les siennes). Les règles appliquées à ces données simulées sont réelles. Chaque écran porte RÉEL, SIMULÉ ou [H].

### 4. « Qu'apportez-vous de plus que l'existant ? » (Steve)

> Les montres et le Bio-Monitor canadien mesurent l'état du jour. Le modèle de risque de la NASA travaille côté sol, sur une population. Il manque un outil côté astronaute qui transforme ses mesures en consigne, à bord, et qui dit qui doit décider selon le délai radio du jour. Et chaque consigne remonte à la norme qui la justifie.

### 5. « Le délai radio, c'est le cœur du projet ou un décor ? » (Ahmed)

> C'est le cœur. Il décide de l'architecture : MAINTENANT est calculé à bord et ne dépend jamais de la distance, c'est vérifié par des tests sur 5 niveaux, 5 positions et 7 délais. ENSUITE en dépend : médecin au sol tant que le lien existe, officier médical de bord pendant la conjonction. Et la distance ne baisse jamais un niveau d'alerte.

Code : `src/models/router.ts`, `tests/models/triage.test.ts`.

### 6. « Pourquoi de l'IA ? Des règles suffiraient. Et ChatGPT ferait ça en cinq minutes. » (Mouad)

> D'accord sur un point : MAINTENANT, ce sont des règles, et c'est voulu. Une consigne médicale doit être explicable. L'IA sert ailleurs : projeter chaque organe avec une bande d'incertitude (sur la cuisse à J860, 0,9 point d'erreur contre 2,7 sans modèle), et repérer un glissement d'humeur. Tout tourne hors ligne, sans appel réseau. Un chatbot ne garantit ni l'un ni l'autre.

Source : fiches des modèles, page Raisonnement → « Nos modèles d'IA » (`modelCards()`), cohorte simulée.

### 7. « Qui est responsable si la consigne est fausse ? » (Steve)

> L'outil ne prescrit rien. Il applique des seuils NASA et des fiches de conduite, et il renvoie vers l'officier médical de bord ou le médecin au sol. Quand il faut un médicament, comme les bisphosphonates pour l'os, il prépare une question pour le médecin, sans alarme. Les synthèses IA sont étiquetées « à valider par le médecin de bord ». La décision reste humaine.

### 8. « Faux négatif ou faux positif, lequel est pire ? Et si une mesure manque ? » (Mouad)

> En vol, le faux négatif. D'où trois règles. Gris quand on ne sait pas, jamais vert par défaut : sans check-in, c'est « données insuffisantes ». Un seuil rouge franchi sur deux mesures de suite passe en rouge sans attendre la moyenne sur 7 jours. Et la distance à la Terre ne baisse jamais une alerte. Pour le bruit, on alerte sur la tendance, pas sur un point isolé.

Code : `src/models/triage.ts` (prélèvement > 14 j → jamais vert), règle `ROUGE-2-MESURES`.

### 9. « Et la santé mentale ? L'isolement est l'un des cinq dangers. » (Mouad)

> On compare l'astronaute à lui-même : humeur du check-in, sommeil, variabilité cardiaque, cortisol. Sur une cohorte simulée, le modèle détecte 92 % des épisodes, en 13 jours médians, avec 6 % de fausses alertes. Chez Haddad, glissement injecté à J75, signal à J83. C'est un signal, jamais un diagnostic : l'astronaute le voit d'abord et décide d'en parler au psy.

Chiffres : modèle C, cohorte simulée de 1 500 astronautes (AUC 0,99) [H]. Page `/mental` : prototype multi-agents, signal à J85, aucune fausse alerte sur le scénario témoin.

### 10. « Données de santé : qui voit quoi ? » (Ahmed)

> Tout est calculé et stocké à bord, sans cloud. Vers la Terre ne partent que des mesures par organe, quelques kilooctets. Le signal d'humeur est montré d'abord à l'astronaute, et le point psy est proposé, jamais imposé. Pour la démo, mes propres données de santé ne sont pas dans le dépôt Git : elles restent sur ma machine.

### 11. « Une Apple Watch, c'est fiable ? » (Ahmed)

> Pas pour un diagnostic, et on ne s'en sert pas comme ça. Son VO₂max se trompe d'environ 13 % et le sous-estime d'environ 6 points, donc on affiche la marge. On l'utilise en tendance, comparée à ma propre référence sur 30 jours. Elle a déjà volé : les quatre civils d'Inspiration4 en portaient une. Ici, elle prouve que le logiciel accepte de vraies mesures.

Sources : Lambe et al. 2025, *PLOS ONE* (n = 30) ; Inspiration4, données dans l'OSDR de la NASA.

### 12. « Votre scanner existe ? Il mesure l'os ? » (Walid)

> Le scan est simulé, et c'est une hypothèse de mission. Il fait de l'échographie, l'imagerie médicale déjà utilisée à bord de l'ISS. Il ne mesure pas l'os : l'os vient du bilan au sol, du modèle et des marqueurs urinaires. Pour que l'eau tienne en apesanteur, on le place dans une centrifugeuse à bras court : environ 0,1 g suffit. Ça existe au sol, pas encore en vol.

Calcul [H] : a = ω²r, rayon 3 m → 0,1 g à ≈ 5,5 tr/min. Centrifugeuse ESA/DLR (étude AGBRESA) au sol.

### 13. « Le défi cite tension, pouls, glycémie, température, sommeil, humeur. Vous en utilisez combien ? » (Steve)

> Les six. Le pouls vient de la vraie montre. L'humeur et le sommeil ressenti viennent du check-in : saisi en direct pendant la démo, mais avec les réponses de Haddad, donc simulé. La tension, la glycémie (prélèvement capillaire hebdomadaire), la température et le sommeil mesuré sont simulés pour Haddad, et étiquetés comme tels. Pour la température, on compare à la référence de vol : en apesanteur, la température centrale monte d'environ 1 °C.

Source : Stahn et al. 2017, *Scientific Reports*.

### 14. « C'est faisable ? Ça tient la charge ? On peut ajouter un organe ? » (Walid)

> Ça tourne aujourd'hui, hors ligne, dans un navigateur : React, three.js, des modèles en fonctions pures, 147 tests automatiques. Un export Santé de 534 Mo se lit en 1,6 seconde. Chaque module code contre un contrat de types : ajouter un organe, c'est un modèle, une ligne de règles et un modèle 3D. Les normes sont dans un fichier, citées avec leur identifiant NASA.

Fichiers : `src/types.ts`, `src/models/`, `public/data/nasa/standards.json`.

### 15. « Et après le hackathon ? Qui l'utiliserait ? » (Steve)

> D'abord les missions analogues, où des équipages vivent isolés des mois : CHAPEA, la maison martienne de la NASA au Texas, a duré un an. Ensuite, sur Terre, partout où le médecin est loin : bases polaires comme Concordia, patients alités, personnes âgées qui perdent du muscle. Le mécanisme est le même : se comparer à sa propre référence et à une norme, et savoir quoi faire.

Métrique d'impact à citer : perte de la hanche à J860, 8,70 % au rythme actuel contre 4,22 % avec le plan [modèle, H].

---

## Questions ajoutées après le jury du 15/11

### 16. « Votre consigne repose sur un check-in subjectif. Les astronautes sous-déclarent leurs symptômes. S'il répond 4/1/0/4 alors qu'il va mal ? » (Mouad)

> C'est prévu dans un sens : le niveau du jour est le plus grave entre les organes et le check-in. Un check-in rassurant ne peut donc jamais effacer une alerte mesurée, ni donner du vert seul. Le modèle d'humeur, qui lit aussi la variabilité cardiaque, le sommeil et le cortisol, propose un point psy même si le check-in dit « ça va ». Ce qui manque : signaler l'écart entre ressenti et mesures. C'est la prochaine règle.

Code : `src/models/triage.ts` (niveau = le plus grave entre organes et check-in). Le test PVT est déjà dans le plan.

### 17. « Le Pourquoi du squat parle de la hanche, mais il a été suspendu pour la fatigue. Lequel est le vrai motif ? » (Ahmed)

> La fatigue. Humeur 2 et fatigue 4 déclenchent la règle R13 : pas de charge lourde avant le feu vert du CMO. La hanche répond à une autre question : peut-on se permettre de sauter cette séance ? Oui, elle est à 98 % pour une norme à 95. Je peux vous montrer la règle : c'est le « Pourquoi » de « Prévenir le CMO ».

Démo : `/reasoning/r-cmo` (règles R13, norme V1 3006).

### 18. « Vous avez JPL Horizons. Pourquoi ne pas calculer le vrai délai du vaisseau à J94 au lieu d'un majorant ? » (Walid)

> Parce que le vaisseau de Haddad est fictif : il n'a pas d'éphémérides. On aurait pu inventer une trajectoire, mais ça aurait été un chiffre de plus sans source. On a préféré la vraie distance Terre–Mars, qui est un majorant honnête, et étiquetée [H]. Sur un vrai vol, on brancherait la trajectoire de la mission : seule l'heure de réponse change, jamais la consigne.

### 19. « 92 % de détection, AUC 0,99, sur une cohorte que vous avez générée vous-mêmes : n'est-ce pas circulaire ? » (Mouad)

> Oui, en partie, et on le dit. Ça mesure seulement que le modèle retrouve un motif qu'on connaît, avec du bruit réaliste. Ça ne prouve pas qu'il marche sur de vrais équipages. La vraie validation passerait par des données d'analogues : CHAPEA, HERA, Concordia. C'est pour ça que l'écran dit « signal à regarder », jamais « diagnostic ».

Écart à connaître : le modèle C donne le signal à J83 (deck, Plan du jour) ; le prototype multi-agents de `/mental` le donne à J85. Ce sont deux méthodes différentes sur le même glissement injecté à J75.

### 20. « Vos règles, R13 et les seuils du check-in, ont-elles été relues par un médecin ou un flight surgeon ? » (Steve)

> Non. Ce sont des règles d'équipe, étiquetées [H] dans l'app. Les seuils rouges des organes, eux, sont ceux de la NASA. La première chose à faire après le hackathon, c'est de les faire relire par un médecin du sport ou un médecin d'analogue, par exemple via l'équipe médicale de Concordia ou un flight surgeon de l'ESA.

### 21. « Point avec le médecin au sol à 14:00 : comment fait-on un rendez-vous synchrone avec 22 minutes d'aller-retour ? » (Ahmed)

> Ce n'est pas un appel, c'est un message différé. 14 heures, c'est l'heure où il part, avec les questions du jour. La réponse arrive quand elle arrive, et c'est ENSUITE qui dit quand. Le libellé de l'écran prête à confusion : il faudrait écrire « Message au médecin au sol ».

### 22. « Votre check-in utilise quelles échelles ? Sont-elles validées ? » (Mouad)

> Aujourd'hui, quatre échelles simples de 1 à 5, faites par nous : elles ne sont pas validées. Pour un vrai vol, on les remplacerait par des échelles validées : la Karolinska Sleepiness Scale pour la somnolence, le POMS pour l'humeur, une échelle de fatigue reconnue. Le PVT, le test de vigilance déjà utilisé par la NASA, est déjà dans le plan.

### 23. « La référence personnelle J0–J20 : et si le glissement commence avant J20, ou si la référence est mauvaise ? » (Mouad)

> Alors le modèle le rate : il compare l'astronaute à un état déjà dégradé. C'est une limite réelle. Deux parades : prendre une référence avant le vol, mesurée au sol pendant l'entraînement, et garder les seuils absolus du check-in, qui ne dépendent pas de la référence. Humeur 2 et fatigue 4 déclenchent la règle même si c'est « normal » pour lui.

### 24. « Sur quel matériel ça tourne à bord ? Certification, criticité ? Et si l'app plante pendant la conjonction ? » (Walid)

> Aujourd'hui, un navigateur sur un portable, hors ligne. Ce n'est pas du logiciel de vol certifié, et on ne le présente pas comme tel. Le choix qui aide : les règles sont des fonctions pures, testées, sans réseau, donc faciles à porter et à auditer. Si l'app plante, l'astronaute garde les fiches de conduite et le CMO : l'outil aide à décider, il n'est pas le seul chemin.

### 25. « Haddad est à J94 : pourquoi projeter à J860 avec un modèle calé sur des missions ISS de 6 mois ? » (Mouad)

> Parce que la question du jour est « est-ce que ça suffit pour la mission ? ». Mais au-delà de 180 jours, c'est une extrapolation : aucune donnée humaine n'existe pour 860 jours. C'est pour ça que la bande d'incertitude s'élargit avec le temps, et que l'écran dit « PROJECTION · NON MESURÉ ». On s'en sert pour comparer deux rythmes, pas pour prédire un chiffre exact.

### 26. « Suivre le plan divise la perte par deux : c'est une sortie de votre modèle, pas une observation. D'où vient l'effet de l'adhérence ? » (Mouad)

> Oui, c'est une sortie du modèle, étiquetée [H], pas une observation. Le rythme de perte vient de données publiées : 1 à 1,5 % par mois sans exercice, moins de 5 % à la hanche après six mois avec l'ARED. Notre hypothèse : suivre le plan chaque jour ramène la perte future à environ un tiers. Au total, 4,2 % contre 8,7 % : d'où le « par deux ». Un suivi en mission analogue le testerait.

Sources : LeBlanc 2000 ; justification de V1 4027 (ARED). Facteur du plan : hypothèse de l'équipe (`src/models/bone.ts`, `PLAN_FACTOR`).

---

## Questions éclair (10 secondes)

| Question | Réponse |
| :-- | :-- |
| Pourquoi l'os et le cœur ? | Ce sont deux pertes lentes qui ont une limite NASA chiffrée : hanche ≥ 95 % [V1 4027], VO₂max ≥ 80 % du pré-vol [V1 4003] et ≥ 36,5 ml/kg/min pour une sortie [V1 4002]. |
| Et les radiations ? | Suivies chaque jour : 1,84 mSv/j en croisière (Curiosity RAD). Toute mission martienne dépasse la limite de carrière de 600 mSv [V1 4030]. On alerte sur l'excès par rapport au prévu. |
| Pourquoi une web-app ? | Le défi demande un logiciel visuel. Une web-app tourne hors ligne sur n'importe quel écran de bord, sans installation. |
| Haddad est à J94, pas sur Mars : pourquoi 11 minutes ? | On prend la distance Terre–Mars du jour : un majorant. Le vaisseau est plus près, le vrai délai est plus court. C'est étiqueté hypothèse [H], et ça ne change que l'heure de réponse, jamais la consigne. Pourquoi pas le vrai délai : voir question 18. |
| Pourquoi 52 minutes ? | 11,0 aller, 11,0 retour, plus 30 minutes pour que le médecin lise le dossier : hypothèse de l'équipe [H]. |
| Pourquoi suspendre le squat si la hanche est à 98 % ? | Ce n'est pas la hanche : c'est la fatigue et l'humeur du check-in (règle R13). Au niveau « Attention renforcée », toute charge lourde attend le feu vert du CMO. Une séance sautée ne coûte presque rien ; c'est la régularité qui compte. |
| « Prévenir le CMO » à 06:45, avant le check-in de 07:00 ? | L'heure est celle du plan type, pas l'ordre réel : la ligne n'apparaît qu'après le check-in, en tête du plan. On la recale dans l'app. |
| La slide 9 est trop propre pour être vrai ? | Oui : c'est un glissement injecté par nous, sur des données simulées. Ça teste le modèle, ça ne le valide pas (question 19). |
| Conjonction solaire ? | Pas de lien Terre pendant plusieurs semaines : ENSUITE passe à l'officier médical de bord, MAINTENANT ne change pas. |
| Votre âge biologique ? | PhenoAge (Levine 2018, publié) : 43,1 ans à J91. L'âge sanguin par IA (NHANES) est faible, R² 0,28 : on le montre avec sa limite. |
| D'où vient la 3D ? | Z-Anatomy et BodyParts3D, licences libres citées dans l'app ; découpés par organe par l'équipe. |
| Combien de temps pour faire tout ça ? | Environ 29 heures, à quatre, en travaillant en parallèle sur des contrats de types fixés au départ. |
| Avez-vous testé avec des utilisateurs ? | À dire honnêtement selon ce qui a été fait dimanche. Si non : « Pas encore avec des astronautes. Prochaine étape : un test en mission analogue. » |
