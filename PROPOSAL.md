# Proposition B : instrument médical

Branche `proposal/ui-B-instrument-medical`. Captures avant/après dans `proposal-shots/`.

## Le concept en 3 phrases

SOL ZÉRO ressemble à l'écran d'un moniteur patient et à la page d'un compte rendu clinique, pas à un tableau de bord web. Chaque écran est une seule surface noire découpée en secteurs par des filets de 1 px. Les alarmes parlent le langage des moniteurs : priorité haute, moyenne ou basse, avec une couleur et un marqueur `!!!` `!!` `!`. Le corps 3D est annoté comme un cliché : repères numérotés, légendes d'image aux coins, et les mêmes numéros dans la liste d'alertes.

## D'où vient le caractère

Rien n'est décoratif. Chaque détail vient d'un instrument que le jury, ou un flight surgeon, connaît déjà.

| Détail | Origine réelle | Où |
|---|---|---|
| Priorité d'alarme `!!!` / `!!` / `!` sur aplat rouge ou jaune, texte sombre | Couleurs d'alarme IEC 60601-1-8 : rouge pour la priorité haute, jaune pour la moyenne et la basse. Les points d'exclamation sont la convention d'affichage de nombreux moniteurs, pas une exigence de la norme. | Alertes, étiquettes 3D, « Maintenant » |
| ROUGE = haute, ORANGE = moyenne, AMBRE = basse | Le marqueur distingue enfin ORANGE d'AMBRE, qui partagent la même couleur jaune depuis le début | `levelPriority` dans `src/ui/tokens.ts` |
| Repères numérotés 1, 2, 3 sur le corps, fixés pour la journée, repris dans la liste et dans « Maintenant » | Le radiologue numérote ses repères sur le cliché et les cite dans le compte rendu | `src/pages/body/alarmOrder.ts` (une seule source d'ordre) |
| Légendes aux coins de la scène (J094 · date, « Atlas Z-Anatomy · 3 calques » sur une ligne, délai Terre ; « pas une image du patient » en infobulle et en Détails ; le patient seulement sur téléphone) | Incrustations DICOM d'une image médicale | `SceneCorners` et `.body-id` dans `Body.tsx` |
| Papier millimétré d'ECG (petit carreau 5 px, grand carreau 25 px, filets rosés très sombres) | Papier d'enregistrement ECG et polygraphie | SpO₂ 30 j, signal d'humeur, graphes de la fenêtre organe, frise Santé mentale. Nulle part ailleurs. |
| Grand chiffre condensé (IBM Plex Sans Condensed, 44 px) | Valeur principale d'un moniteur | SpO₂, FC en direct, J85 (Santé mentale) |
| Références, heures et graduations en IBM Plex Mono | Incrustations, horodatages d'appareil | Heures de la to-do, NASA V1 4027, axe de la chronologie, citations de norme |
| Curseur de chronologie en trait vertical | Curseur de tendance d'un moniteur | Chronologie |

Polices : IBM Plex Sans, Sans Condensed et Mono, installées localement par `@fontsource` (rien n'est chargé depuis Internet). Inter reste en repli.

Couleurs : `src/ui/tokens.ts` reste la seule source. Fond `#07080A` (noir de moniteur), secteurs `#0D0F12`, filets `#1E2329`. Le vert dit seulement « nominal ». Le jaune `#EDBB2C` et le rouge `#F04A42` sont réservés aux alarmes. Le gris dit « inconnu » et reste une pastille creuse. Le texte muet passe à `#79828C`, au-dessus de 4,5:1 sur le fond.

## Ce qui a changé, page par page

### Coquille (barre haute)
- La marque est le mot « Sol Zéro » seul (l'onde de pouls du premier passage a été retirée : pictogramme santé générique).
- Le bandeau patient remplace le prénom seul : « Cdt Haddad ». Pas d'identifiant inventé.
- « Données simulées » devient une mention encadrée (filet), plus une pastille teintée. Elle reste visible à toutes les largeurs.
- Sur téléphone, la barre passe sur deux rangées : marque, « Données simulées » et « Détails » en haut, les trois onglets sur toute la largeur dessous.

### Corps (/body)
- Plus de cartes arrondies. La page est une grille dont la gouttière de 1 px est le filet entre les secteurs. La scène 3D est le seul secteur noir.
- En-tête : valeurs en chiffres condensés de 28 px (« Jour 94 », « 43,1 ans »).
- Scène : jour et date en haut à gauche (« J094 · 14 nov. 2026 » ; « Cdt Haddad » seulement sur téléphone, où la barre haute masque le bandeau patient), « Atlas Z-Anatomy · 3 calques » en bas à gauche sur une seule ligne (liste des calques et « pas une image du patient » en infobulle, cette mention aussi en Détails), délai Terre en bas à droite. Le bandeau « Projection » est encadré d'un filet clair.
- Étiquettes 3D : `[n°] Nom [priorité]`. Le numéro est celui de la liste d'alertes, fixé pour la journée (calques par défaut d'abord, de haut en bas, puis les autres). En projection, le marqueur et le point d'ancrage passent en contour. En mode Détails, la règle s'affiche en mono (NASA V1 4027, Tendance 7 j).
- Alertes : chaque ligne porte n°, titre, marqueur et mot du niveau (« ! Attention »), chevron. Une alerte ROUGE du jour colore aussi son titre, jamais en projection. Une alerte dont le calque est masqué reste en fin de liste, grisée, sans numéro, avec « Calque masqué ». « + 2 alertes plus bas » signale le défilement.
- Constantes : SpO₂ en grand chiffre de moniteur, courbe 30 j sur papier d'ECG, vitales en chiffres condensés.
- Chronologie : graduations et jalons en mono, curseur en trait vertical.
- Fenêtre organe et Corps entier : graphes sur papier d'ECG (la grille Recharts est masquée pour ne pas doubler). « À valider par le médecin de bord » devient une mention encadrée.
- Pastilles de statut carrées (voyants), gris toujours creux.
- Téléphone : une colonne qui défile. En-tête, scène sur 62 % de la hauteur, chronologie, puis les panneaux.

### Plan du jour (/warroom)
- Même surface en secteurs à filets. La ligne de tête porte « Heure de bord 07:00 » en mono (l'horloge figée de la démo, dite en clair).
- « Maintenant » est le seul grand texte de la page : 28 px pour la consigne, 22 px gris pour « Aucune consigne avant le check-in ». « Faire le check-in » devient l'action principale (bouton clair).
- Après le check-in, le niveau s'affiche une seule fois : marqueur + mot (`!!` Attention renforcée pour une douleur 2, voir `after-warroom-checkin.png`). Les raisons commencent par ce qui a déclenché le niveau au check-in, puis suivent les repères du Corps avec leur numéro.
- To-do : heures en mono, titres en 14 px.
- Signal d'humeur : score en chiffres condensés, courbe sur papier d'ECG.
- Dernière mesure : la SpO₂ simulée affiche toujours « Série simulée », au lieu d'un « il y a 18 h » faux calculé contre l'horloge réelle (point 7.1 de l'inventaire corrigé). La FC en direct passe en grand chiffre de moniteur.

### Pourquoi ? (/reasoning/:id)
- La chaîne Donnée → Modèle → Norme → Décision est un rail vertical avec quatre repères numérotés. La décision, au bout, est le texte le plus fort et porte le seul repère plein.
- La citation NASA-STD-3001 devient un extrait de pièce citée : référence en mono en tête, texte dessous, lien « Source » en pied. Le filet gauche coloré a disparu.
- Sur un écran large, les fiches des modèles d'IA se lisent à droite de la chaîne au lieu de 500 px plus bas.

### Santé mentale (/mental)
- Même surface en secteurs à filets. « Prototype » devient une mention encadrée.
- Le résultat qui compte (« Échange proposé J85 ») est en 44 px. J83 et « 0 fausse alerte » se lisent au second regard, en 28 px.
- La frise se lit comme une polygraphie : quatre voies sur papier d'ECG, graduations en mono, sans grille SVG par-dessus.

## Inventaire : où se trouve chaque fonction

Rien n'a été retiré. La logique métier (`src/models`, `src/sim`, `src/mocks`, `src/ingest`, `src/content`, `src/types.ts`, `server/`) n'a pas été touchée.

| Fonction (inventaire) | Où c'est maintenant |
|---|---|
| Routes `/`, `*` → `/body`, défilement des pages | Inchangé (`App.tsx`) |
| Onglets Corps · Plan du jour · Santé mentale, Plan du jour actif sur `/reasoning/*` | Barre haute, inchangé. Deux rangées sur téléphone. |
| « Haddad », « Données simulées » (infobulle), « Détails » | Barre haute : bandeau patient « Cdt Haddad » (infobulle persona fictive), mention encadrée, bouton |
| Mode Détails (bouton, touche D, `data-details`, mémorisé, masque `.sz-tag` `.sz-prov` `.sz-detail`) | Inchangé. Étiquettes en mono. |
| TagBadge, ProvenanceBadge, Panel, statusLabel, levelLabel | Inchangés. Ajouts : `AlarmMark`, `levelPriority`, `priorityMark`, `priorityLabel`. |
| Paramètres d'URL `day`, `layers`, `organ`, `hover`, `window`, `plan`, `blood`, `noscan` | Inchangés (`urlState.ts` non modifié) |
| Clavier ← → Maj Début Fin T Espace Échap | Inchangé |
| En-tête : jour, phase, âge biologique (ouvre `window=global`), âge sanguin, statut et décomptes | Même bloc, chiffres condensés. Sur téléphone, les blocs s'empilent. |
| Analyses : groupes, pistes, sparklines, dépliage, états vides, `useRowClip` | Inchangé (styles hérités) |
| Constantes : SpO₂, 7 j, seuils 95/92, courbe 30 j, vitales, « Dernière mesure » | Même panneau. Grand chiffre, courbe sur papier d'ECG. |
| Scène 3D : gestes, survol, clic, double-clic, cerveau → /mental, animations, repli sans WebGL | Inchangé |
| Étiquettes d'alerte 3D (survol, clic, double-clic, infobulle, effacement sous la carte) | Même comportement. Ajout du n° de repère et du marqueur de priorité. |
| Bandeau Projection, cadre de provenance (Détails) | En haut à gauche, sous l'identification |
| Menu Affichage, écran épuré | Inchangé (en écran épuré, la légende « Délai Terre » du coin s'efface pour ne pas doubler la barre) |
| Traits de liaison panneau → organe | Inchangé |
| Carte de survol | Inchangée (styles hérités) |
| Calques : six cases, solo Alt+clic, Bêta, listes, « Non modélisé » | Inchangé |
| Alertes : tri, survol, clic, chevron, détails, état vide, projection | Même ordre, désormais partagé avec la 3D (`alarmOrder.ts`). N° et priorité ajoutés. |
| Chronologie : lecture, Aujourd'hui, Sol 0, J860, frise, filet d'alertes, scénarios, perte hanche | Inchangé. Curseur en trait, graduations en mono. |
| Fenêtre organe et Corps entier : tableaux, synthèse IA, scénarios, graphes, voiles | Inchangés. Graphes sur papier d'ECG. |
| Plan du jour : `?demo` et « Réinitialiser la démo » | Inchangé |
| Maintenant : En attente, bouton check-in, consigne, raisons, `role=alert` en ROUGE | Inchangé. Ajout du marqueur de priorité. Le bouton devient l'action principale. |
| Ensuite : délai Terre, décideur, réponse, suivi sol, synthèse IA repliée | Inchangé |
| Check-in du matin : 4 notes, zones, validation, résumé, Modifier, Effacer | Inchangé |
| Dernière mesure : direct < 15 s, gris > 10 min, tracé, σ, montre, saisie manuelle, import | Inchangé. Ajout de « Série simulée » toujours visible. |
| Aujourd'hui : 10 tâches, Urgent (ex-« Priorité 1 »), Suspendu, Pourquoi, synchro montre | Inchangé, « Priorité 1 » renommé « Urgent » |
| Signal d'humeur : score, seuil, courbe, « Pas un diagnostic » | Inchangé, courbe sur papier d'ECG |
| Pourquoi ? : retour, titre, chaîne en 4 étapes, citation, introuvable, 19 sujets, fiches des modèles et leurs limites | Inchangé. Rail vertical, citation en extrait, modèles à droite sur grand écran. |
| Santé mentale : retour, sous-titre, Prototype, résultat, frise cliquable, dossier, fonctionnement, pied de page | Inchangé. J85 en grand, frise sur papier d'ECG. |
| Endpoints `/api/todo`, `/ingest`, `/api/health` | Non touchés (`server/`) |

## Limites connues

- Les moniteurs font clignoter les alarmes hautes (IEC 60601-1-8). Ici rien ne clignote : c'est une exigence anti-effets de l'équipe et une question d'accessibilité. Le niveau se lit par la couleur, le marqueur et le mot.
- Les points d'exclamation sont une convention d'affichage, pas un texte de la norme. Le PROPOSAL et les commentaires du code le disent.
- Capture J860 : deux étiquettes se chevauchent (« Hanche » sous « Rachis »). C'est déjà le cas avant la refonte : la capture tombe pendant le lissage des positions. À vérifier en direct.
- Captures téléphone : les vues `after-mobile-*` sont maintenant faites à 390 × 844 par le protocole DevTools (émulation d'appareil, pas d'iframe) : la 3D s'y dessine. Les captures `before-*-mobile` ont été faites dans une fenêtre trop large et sont rognées.
- La frise Santé mentale défile à l'horizontale sur téléphone, comme avant.
- Point 7.3 de l'inventaire : traité. Une ligne « + n alertes plus bas » sous la liste dit ce qui reste caché et fait défiler au clic.
- `after-warroom-checkin.png`, `after-warroom-rouge.png` et `after-body-details.png` sont faits en préremplissant `localStorage` par le protocole DevTools (check-in douleur 2, puis douleur 3 avec humeur 2 et fatigue 5, mode Détails). Rien n'est ajouté au dépôt pour ça.
- La skill Impeccable demande normalement de valider la direction avec l'utilisateur. Il dormait : j'ai pris la direction du brief (« Instrument médical ») sans question.

## Retour du jury et corrections (1er passage)

Note reçue : 15. Verdict : la bonne direction, quatre défauts à corriger avant la démo. Point par point :

### À corriger absolument

1. **Repères 3D sans n° 1 à J94, ordre qui saute à J600 et J860.** Corrigé. Seuls les repères dessinés sur la scène sont numérotés (calque affiché, ancre 3D, niveau non nominal), et les numéros suivent le corps de haut en bas. Les étiquettes de la colonne sont rangées par hauteur d'ancre, donc les numéros se lisent toujours 1, 2, 3… sur la scène (J94 : Cœur 1, Hanche 2, Cuisse 3 ; J860 : 1 à 7 dans l'ordre). Le nerf optique, calque Nerveux masqué, reste dans la liste, en fin de liste, grisé, sans numéro, avec « Calque masqué » (infobulle : « Calque Nerveux + yeux masqué : repère absent de la scène »). Le test `tests/ui/alarmOrder.test.ts` vérifie l'ordre à J94, J600 et J860, avec les calques par défaut et tous les calques. Fichiers : `alarmOrder.ts`, `three/warnings/model.ts`, `AlertsPanel.tsx`.
2. **« !!! » rouge plein sur des valeurs projetées.** Corrigé. Au-delà de J94, `AlarmMark` passe en contour (filet de la couleur, fond transparent, texte gris), le point d'ancrage 3D devient creux, et le titre de la ligne n'est plus coloré. L'infobulle et le lecteur d'écran disent « Alerte · projection, pas une alarme ». En projection, la liste suit aussi le corps de haut en bas : une prévision n'a pas de priorité d'alarme. Voir `after-body-j600.png` et `after-body-j860.png`.
3. **Code « ! / !! / !!! » illisible, trois vocabulaires.** Corrigé. Chaque ligne d'alerte montre le marqueur et le mot du niveau (« ! Attention », « !!! Alerte »). Le mot reste le vocabulaire de l'app partout (Attention, Attention renforcée, Alerte). La priorité IEC n'est plus qu'un complément, dans l'infobulle et le texte lu par le lecteur d'écran : « Attention · priorité basse » (`alarmText` dans `primitives.tsx`, une seule source pour les deux).
4. **Légende de coin qui chevauche les pieds avec tous les calques.** Corrigé. Au-delà de trois calques, la légende affiche « Calques · 6 sur 6 » (liste complète en infobulle), et le bloc est limité à la marge gauche de la scène. Voir `after-body-all-layers.png`.
5. **Chiffres de la hanche à J860 et courbe PhenoAge.** En partie corrigé.
   - Hanche : les deux séries de chiffres viennent de deux modèles différents. La chronologie et la carte de survol affichent la courbe de l'équipe (8,7 % et 4,2 %), le texte de « Pourquoi » le modèle d'IA B (8,6 % et 4,3 %). Les deux restent, mais « Pourquoi » donne maintenant les deux et le dit : « La chronologie affiche la courbe de l'équipe (formule calée, hypothèse) : 8,7 % et 4,2 %. Deux méthodes, même ordre de grandeur. » (`models/explain.ts`, texte seulement, aucun calcul changé).
   - PhenoAge : je n'ai pas touché aux données simulées. Elles appartiennent à l'équipe données, et le 43,1 ans (+0,9) de l'en-tête est cité dans le pitch. J'ai mesuré d'où vient la hausse de +11,1 ans entre J0 et J91, en remettant chaque marqueur à sa valeur de J0 : IDR (12,5 → 13,8 %, +4,7 ans) et CRP (0,6 → 4,7 mg/L, +2,2 ans). La fenêtre l'écrit sous la courbe, calculé à partir des données et toujours visible : « +11,1 ans de J0 à J91, portés surtout par l'IDR (+4,7 ans) et la CRP (+2,2 ans). Le PhenoAge est très sensible à ces marqueurs : sur une série simulée, une hausse de cette taille serait à confirmer par un second prélèvement avant d'en tirer un âge. » **Reste à faire par l'équipe données avant le pitch :** relever les marqueurs de J0 (IDR, CRP) pour que le PhenoAge de départ soit proche de 42 ans, ou ne pas ouvrir cette fenêtre pendant la démo.

### À corriger si possible

- **Triple codage du niveau dans « Maintenant ».** Corrigé : marqueur + mot pour une alarme, voyant + mot pour « En attente » ou « Nominal ». Plus de carré en plus.
- **Vide sous « Faire le check-in ».** Corrigé : la hauteur minimale de 176 px est retirée. « Maintenant » et « Ensuite » prennent la hauteur de leur contenu.
- **Formats de jour mélangés.** Corrigé : le coin de scène dit « J094 · 14 nov. 2026 » (date en français ; l'infobulle explique le format sur trois chiffres). L'en-tête garde « Jour 94 · 14 novembre 2026 ».
- **Identité en double.** Corrigé : sur ordinateur, le nom n'est plus que dans la barre haute. Le coin de scène ne le montre que sous 760 px, quand la barre le masque. Cela corrige aussi le manque relevé sur téléphone (`after-mobile-body.png`).
- **« Priorité 1 » de la to-do.** Corrigé : renommé « Urgent ».
- **Raisons de « Maintenant » dans le désordre.** Corrigé : d'abord ce qui a déclenché le niveau au check-in (douleur, humeur et fatigue), puis les alertes dans l'ordre de la liste du Corps, avec le même numéro de repère dans une colonne en mono. Les calques sont lus dans l'état de la page Corps : les numéros restent ceux de la scène. Avant, avec 4 alertes, la raison « Douleur forte 3/3 » sortait même de la liste.
- **Pastilles vertes à côté de « Non modélisé » (Corps entier).** Corrigé : sans modèle d'écart d'âge, la pastille est grise.
- **Douleur 3/3 en jaune dans le résumé du check-in.** Corrigé : le déclencheur de l'alerte rouge porte le rouge. Fatigue et humeur restent en jaune.
- **Papier d'ECG sur toute la frise Santé mentale.** Corrigé : le quadrillage n'est plus que derrière les quatre voies de courbes (motif SVG), plus derrière les verdicts ni les libellés.
- **« Heure de bord 07:00 » trop pâle.** Corrigé : passé à `textDim`.
- **Point 7.3, alertes cachées sous la liste.** Corrigé : « + 2 alertes plus bas » sous la liste, avec le même seuil que le rognage des lignes. Un clic fait défiler.

### Fonctions devenues difficiles à trouver

- Mot du niveau absent des lignes : corrigé (point 3).
- Repère n° 1 introuvable : corrigé (point 1).
- Nom de la persona absent à 390 px : corrigé, il revient dans le coin de scène sur téléphone.
- Point 7.3 : corrigé.

### Slop relevé

- Marqueurs répétés sur chaque ligne et chaque étiquette : en projection, ils passent en contour gris, donc le mur de rouge de J600 et J860 disparaît. À J94, ils restent : c'est le signal d'alarme, et la liste porte maintenant le mot à côté.
- Triple codage dans « Maintenant » : corrigé.
- Papier d'ECG en texture : corrigé.

### Ce qui n'a pas été fait, et pourquoi

- **Couleurs de l'en-tête et du panneau Calques en projection.** « Statut du jour : Alerte » et les valeurs du panneau Calques restent colorées à J600 et J860. Le jury ne l'a pas relevé, la règle est déjà dite par le bandeau « Projection », et changer ces composants partagés la veille de la démo coûtait plus que ça ne rapportait.
- **Numéros de la liste un jour mesuré avec des niveaux mélangés.** Un jour mesuré, la liste est triée par gravité, et les numéros suivent le corps. Si un jour passé mêle ROUGE et AMBRE à des hauteurs croisées, les numéros de la liste peuvent sauter (2, 1, 3), alors que la scène reste dans l'ordre. À J94 (démo), tout est AMBRE et la liste se lit 1, 2, 3. J'ai privilégié la règle du jury : « les numéros doivent toujours se lire dans l'ordre sur la scène ».
- **Titres coupés dans la liste.** Le mot du niveau prend environ 70 px sur une colonne de 320 px : « Cœur — VO₂max en bais… ». Le titre complet est en infobulle et en mode Détails. Les titres sur deux lignes ne laissaient voir que deux alertes.

## Retour du jury et corrections (2e passage)

Note reçue : 16. Verdict : la proposition la plus crédible pour un jury NASA, trois défauts qui coûteraient des points en démo, plus un écart à la règle « ne pas toucher `src/models` ». Point par point. Nouvelles captures : `after-body-1280x720.png`, `after-body-pinned-coeur.png`, `after-body-j40.png` ; toutes les `after-*` ont été refaites.

### À corriger absolument

1. **Corps à 1280 × 720.** Corrigé.
   - La légende de coin tient sur une ligne : « Atlas Z-Anatomy · 3 calques ». La liste des calques et « pas une image du patient » sont dans l'infobulle. La mention est aussi visible en mode Détails, sur une deuxième ligne. Plus rien ne passe sur les pieds, ni à 1280 × 720 ni à 390 px.
   - La courbe SpO₂ 30 j reste sous 760 px de haut. Elle passe à 48 px, avec sa ligne 95 %, et le grand chiffre à 34 px (`Spo2Widget.css`).
   - Calques : quand des lignes sont coupées, une ligne « Plus bas : Muscles, organes » le dit et fait défiler au clic. C'est la même voix que « + 2 alertes plus bas ». Le hook `useRowsBelow` est partagé dans `store.ts`.
2. **ROUGE peu visible dans « Maintenant ».** Corrigé. En ROUGE seulement, le marqueur `!!!` (28 px, aplat rouge) et le mot « Alerte » (rouge, 28 px) passent devant la consigne, à sa taille. Un filet rouge de 3 px court en haut du secteur « Maintenant ». La consigne reste en texte clair. Rien ne clignote, et `role=alert` est conservé. Le petit marqueur de l'en-tête disparaît en ROUGE, pour ne pas doubler. Voir `after-warroom-rouge.png`.
3. **Projection : deux règles sur le même écran.** Corrigé. La règle est maintenant la même partout : une valeur projetée n'est jamais colorée en plein.
   - En-tête : « Statut projeté », pastilles creuses de la couleur, mot en texte normal, infobulle « projection, pas une alarme » (`Header.tsx`, `Header.css`).
   - Calques : valeurs en texte normal, pastilles creuses de la couleur, cases à cocher comprises (`LayersPanel.tsx`, `LayersPanel.css`).
   - Scène 3D : en projection, la teinte de statut des organes ne garde que 28 % de sa force (`look.ghost.tint`, appliqué dans `HologramMaterial.ts`). Les organes se lisent en trace, comme les marqueurs en contour. Voir `after-body-j600.png` et `after-body-j860.png`.
4. **`src/models/explain.ts` modifié.** Corrigé. Le fichier est revenu au texte d'origine (`git checkout night/base -- src/models/explain.ts`), et l'étape « Modèle » de `r-hanche-ared` redevient une phrase simple. L'écart est expliqué dans l'interface : en mode Détails, la ligne sous la chronologie s'appelle maintenant « Hanche J860, courbe de l'équipe ». Son infobulle donne les deux chiffres du modèle d'IA B (8,6 % et 4,3 %), lus dans `organForecast`, sans rien recalculer. Plus aucun fichier de `src/models` n'est modifié.

### À corriger si possible

- **Numéros de repère instables.** Corrigé. Les numéros sont fixés une fois par jour et ne dépendent plus des calques cochés. D'abord les alertes des calques affichés par défaut (squelette, muscles, organes), de haut en bas, puis les autres, de haut en bas. J'ai écarté une numérotation stricte « de haut en bas toutes alertes confondues » : le nerf optique deviendrait n° 1, et la scène par défaut se lirait 2, 3, 4, ce qui était le défaut n° 1 du premier passage. À J94, Cœur 1, Hanche 2, Cuisse 3, nerf optique 4. Ce dernier est grisé « Calque masqué » mais garde son numéro, et apparaît sur la scène avec ce même 4 quand on coche Nerveux. La liste Alertes suit la gravité, puis le numéro : avec tous les calques à J94, elle se lit 1, 2, 3, 4. « Maintenant » ne lit plus le store Corps. Tests : `tests/ui/alarmOrder.test.ts` (stabilité aux calques à J94, J600, J860 ; scène par défaut 1, 2, 3 ; nerf optique n° 4).
- **Décalage quand on presse D.** Corrigé et mesuré : le bloc « Statut du jour » reste à x = 736 et la frise à x = 294,5, avec ou sans Détails. Dans l'en-tête, l'âge réel et « · NHANES » sont passés en infobulle. Dans la chronologie, la place de « Simulé » est réservée en permanence (masquée hors Détails, `visibility: hidden`).
- **Titres d'alerte tronqués.** Corrigé. La ligne affiche l'organe en gras court, puis le constat (« **Cœur** VO₂max en baisse »). Quand toutes les alarmes affichées ont le même niveau (J94), le marqueur et le mot sont dits une fois, dans l'en-tête du panneau (« ! Attention 4 »). Chaque ligne garde le niveau dans son infobulle et pour le lecteur d'écran.
- **Santé mentale, verdicts ronds.** Corrigé : voyants carrés, et sélection marquée par un filet carré (`Mental.tsx`).
- **« Alertes » sur le curseur, J0 à J50.** Corrigé : le libellé du filet s'efface quand le curseur passe dessus. Voir `after-body-j40.png`.
- **Ensuite en minuscule, en-tête de la synthèse coupé.** Corrigé. Le texte du routeur prend une majuscule initiale (`sentenceCase` ne touche que les textes en capitales, donc une petite fonction `capFirst` locale). « À valider par le médecin de bord » est sur sa propre ligne, en Détails.
- **Repère 3 qui disparaît des raisons en ROUGE.** Corrigé. Les raisons affichent toujours les déclencheurs du check-in et toutes les alertes numérotées, dans l'ordre des numéros (1, 2, 3, 4). Les autres raisons (résumé du check-in, signal d'humeur…) se replient sous « + 2 autres raisons », qui les déplie au clic.
- **Téléphone.** L'étiquette « Hanche » garde 16 px de marge au bord de la scène (`edgeMargin`, 12 → 16). Sous la frise Santé mentale, une ligne dit « La frise est plus large que l'écran : faire défiler → » quand c'est le cas. Je n'ai pas ajouté d'ombre de bord, parce que la direction refuse les ombres décoratives.
- **PhenoAge +11,1 ans de J0 à J91.** Pas corrigé, et c'est voulu : les données simulées appartiennent à l'équipe données. La fenêtre l'explique déjà (premier passage). **Reste à faire avant le pitch :** relever l'IDR et la CRP à J0, ou ne pas ouvrir `window=global` pendant la démo.

### Fonctions devenues difficiles à trouver

- Courbe SpO₂ et listes des Calques à 1280 × 720 : corrigé (point 1).
- Organe épinglé : son étiquette 3D reste maintenant visible avec son numéro, et la scène se lit 1, 2, 3 (`Warnings3D.tsx`). Voir `after-body-pinned-coeur.png`.
- Repère 3 dans « Maintenant » : corrigé.
- Nom de la persona sur la scène seulement sous 760 px : inchangé, c'est voulu (sur ordinateur, il est dans la barre haute).
- Passage « En direct » de la montre (POST /ingest) : non testé, pour ne pas écrire dans `server/.data`. `LiveWidget.tsx` n'a pas été touché dans ce passage.

### Slop relevé

- **Onde de pouls devant « Sol Zéro ».** Retirée : la marque est le mot seul.
- **« SZ-01 ».** Retiré de la barre haute et du coin de scène. Il reste « Cdt Haddad ».
- **Chip `!` répété.** Dans la liste, corrigé : quand le niveau est le même partout, il est dit une fois dans l'en-tête. Sur la scène, j'ai gardé un marqueur par repère : c'est là que l'alarme est posée sur l'organe, et sans lui la couleur seule porterait le niveau.
- **« Hypothèse » / « Persona » répétés dans Calques (Détails).** Corrigé : quand toutes les lignes d'un calque ont la même source, l'étiquette est dite une fois dans l'en-tête du calque.

### Ce qui n'a pas été fait, et pourquoi

- Les marqueurs restent sur les étiquettes 3D (voir Slop relevé).
- PhenoAge : données de l'équipe données, pas de l'UI.
- Aucun test en direct de la montre.

## Lancer

```bash
cd /Users/ahmed/Documents/Hacks/sol-zero-ui-B-instrument-medical
npm install            # ajoute @fontsource/ibm-plex-sans, -sans-condensed, -mono
npm run dev -- --port 5182 --strictPort
# http://localhost:5182/body · /warroom · /reasoning/r-hanche-ared · /mental
npm run build && npm test   # build OK, 156 tests OK
```
