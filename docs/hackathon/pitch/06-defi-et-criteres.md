# 06. Le défi NASA et la grille du jury

## Ce que dit le défi, et où on y répond

| Phrase du défi (`nasa.md`) | Ce que Sol Zéro fait | Moment du pitch |
| :-- | :-- | :-- |
| *« On long missions, astronauts carry much of the responsibility for spotting these changes in themselves. »* | C'est notre problème de départ : délai radio réel (11,0 min le 14/11/2026) et officiers médicaux pas forcément médecins [V1 3006, V1 5003] | S1, S2 |
| *« build a health monitoring software that gathers health indicators and enables astronauts to evaluate and act on the status of their health »* | Évaluer : check-in + montre + scan simulé. Agir : la consigne MAINTENANT et le plan du jour | D1 |
| *« Some useful health indicators are blood pressure, heart rate, blood sugar, body temperature, daily sleep hours, and mood. »* | Les six sont dans l'app : pouls (RÉEL, montre), humeur et sommeil ressenti (check-in en direct), tension, glycémie, température, sommeil mesuré (SIMULÉ, étiquetés) | D1, Q13 |
| *« When might a result warrant attention from the crew or from flight surgeons on the ground? »* | ENSUITE dit qui décide : toi, l'officier médical de bord, ou le médecin au sol, avec l'heure de réponse selon le délai du jour | D1 ; S6 en 7 min |
| *« What actions can be taken to prevent a critical health condition? »* | Plan du jour : exercices sourcés NASA (ARED, vélo), repas, tests, actions médicales ; « Sol-routine » quand le plan ne suffit pas | D1, D5, S8 |
| *« How do spaceflight hazards affect these health indicators? »* | Chaque « Pourquoi » relie donnée → modèle → norme ; la timeline montre l'effet du vol jusqu'à J860 | D2, D5 |
| *« the software could display a human figure where each part of the body is clickable and displays information about its function and health status »* | Page Corps : 3D en calques (squelette, muscles, organes, cardio, nerveux, exposition), survol et fenêtre par organe, alertes ancrées sur le corps | D3 |
| *« Color coding that helps the astronaut interpret the status of a health indicator at a glance »* | Vert / ambre / rouge / **gris = inconnu, jamais vert par défaut** | D3 |
| *« Dynamic charts that show how astronaut's health indicators change over time »* | Timeline J0 → J94 → Sol 0 → J860, rythme actuel contre plan ; courbes du sang et de la SpO₂ | D4, D5 |
| *« Your tool could prompt astronauts to take measurements or complete specific actions from time to time as a part of the mission routine. »* | Check-in du matin obligatoire ; prélèvement expiré → tâche prioritaire ; plan du jour cochable depuis l'Apple Watch | D1 |
| *« Do not assume that astronauts know everything about how to assess their health. Your tool could provide simple instructions and explanations »* | Une consigne en une phrase ; page « Pourquoi » en langage simple avec la norme citée | D1, D2 |
| *« NASA's Human Research Program has mapped the five hazards »* | Distance (délai radio, routeur), gravité (os, muscle, cœur), isolement (signal d'humeur), radiations (dose du jour), milieu clos (fluides, nerf optique) | D1 (S6 en 7 min), D3, S9 (7 min) |
| *« different environments, such as a spacecraft, a space station, a rover, or a base »* | Le routeur couvre ISS, Lune, Mars proche, Mars du jour, conjonction ; Mars est le scénario, pas le périmètre | S6 (7 min) ; en 4 min, seulement en Q&R |

## Critère par critère (`critère.md`)

### 1. Pertinence et compréhension du besoin
- **Preuve** : un problème chiffré et sourcé (11 min de délai, CMO pas forcément médecin) ; une cible unique : **l'astronaute lui-même**, le matin ; le défi cité mot pour mot.
- **Moment** : S1, S2, S4. Q1 et Q4 prêtes.

### 2. Innovation et différenciation
- **Élément différenciant en une phrase** : « la consigne du matin est calculée à bord et ne dépend jamais de la distance ; seul "qui décide ensuite" en dépend ».
- Autres originalités : le bouton « Pourquoi » qui remonte à la norme NASA citée ; l'étiquetage RÉEL / SIMULÉ / [H] sur chaque écran ; une vraie montre en direct.
- **Moment** : D1 (ENSUITE), D2 ; S6 en 7 min.

### 3. Faisabilité technique
- **Preuve** : l'app tourne en direct, hors ligne. React + Vite + three.js, modèles en fonctions pures, 147 tests verts, contrat de types fixé au départ. Export Santé de 534 Mo lu en 1,6 s. Rien n'appelle le réseau pendant la démo (synthèses IA et modèles entraînés avant).
- Contraintes anticipées : pas de HealthKit dans un navigateur → raccourcis iOS + `POST /ingest` ; Wi-Fi qui isole → partage de connexion ; WebGL absent → panneau « 3D indisponible », le reste marche.
- **Moment** : la démo elle-même. Q14.

### 4. Expérience utilisateur et interface
- **Preuve** : check-in en 4 taps ; une consigne en une phrase avant tout graphique ; « Pourquoi » à un clic ; gris pour l'inconnu ; corps 3D cliquable comme le suggère le défi.
- **Moment** : D1, D3. À ajouter si fait dimanche : le test des 10 secondes avec une personne extérieure (le mentor le demande).

### 5. Impact et utilité
- **Métrique d'impact** : perte de la hanche à J860, **8,70 % → 4,22 %** si le plan est suivi chaque jour [modèle, H] ; VO₂max à l'arrivée **36,5 → 37,3** ml/kg/min, au-dessus du minimum de sortie NASA [V1 4002].
- **Bénéfice sur Terre** : bases polaires (Concordia), patients alités, sarcopénie.
- **Moment** : D5, S7, S12.

### 6. Scalabilité et pérennité
- **Preuve** : normes dans `standards.json` (ajout d'une norme = une entrée) ; ajouter un organe = un modèle + une règle + un `.glb` ; le routeur gère déjà 5 environnements (ISS → conjonction) ; coût de fonctionnement quasi nul (tout local).
- **Terrain suivant** : missions analogues (CHAPEA, HERA), puis usages terrestres.
- **Moment** : S12. Q14, Q15.

### 7. Qualité et fiabilité
- **Preuve** : jamais vert par défaut ; check-in manquant → « données insuffisantes » ; prélèvement de plus de 14 jours → jamais vert ; alerte sur tendance 7 j avec exception « 2 mesures » pour le rouge ; invariance de MAINTENANT testée ; synthèses IA étiquetées « à valider par le médecin de bord » ; données personnelles hors du dépôt Git.
- **Moment** : D3 (« jamais vert par défaut »), S5, S11. Q7, Q8, Q10.

### 8. Stratégie de développement
- **Preuve** : MVP figé au démarrage (ROADMAP §4), règles de coupe datées (Raccourci montre coupé à dim. 9:00 s'il ne marche pas, etc.), quatre périmètres sans chevauchement (Walid 3D, Ahmed War Room + montre, Mouad modèles, Steve science + 3D + pitch), Gitflow, gel des fonctionnalités dim. 14:00, filages ensuite.
- **Moment** : pas dans le pitch (pas le temps). En Q&R ou sur la page de soumission. Une phrase possible en fin de 7 min si le jury l'a demandé à d'autres équipes : « On a figé le MVP à la première heure et coupé ce qui n'était pas prêt. »

## Ce qui reste faible (à savoir avant le jury)

- **Le curseur « lien Terre » n'existe pas dans l'app** : on le montre en slide (S6), avec la règle testée en code. Ne pas laisser croire qu'il est cliquable.
- **Les mesures du défi sont surtout simulées** : seuls le pouls et le check-in sont réels en démo. On le dit avant qu'on nous le demande (S11).
- **Pas de test utilisateur documenté** à ce jour dans `status/` : si quelqu'un en fait un dimanche, le noter et le citer.
- **Dose de mission** : la fiche (982 mSv) et l'app (802 mSv à J860) divergent, l'app compte le retour au débit de surface. Ne citer que « au-dessus de 600 mSv ».
- **Genre de Haddad** : la fiche dit « commandante », le code dit `sex: 'M'`. On a choisi « le commandant Haddad, il » dans tout le pitch, comme l'app.
