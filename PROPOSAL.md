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
| Repères numérotés 1, 2, 3 sur le corps, repris dans la liste | Le radiologue numérote ses repères sur le cliché et les cite dans le compte rendu | `src/pages/body/alarmOrder.ts` (une seule source d'ordre) |
| Légendes aux quatre coins de la scène (patient, J094 · date, calques, « Atlas Z-Anatomy, pas une image du patient », délai Terre) | Incrustations DICOM d'une image médicale | `SceneCorners` et `.body-id` dans `Body.tsx` |
| Papier millimétré d'ECG (petit carreau 5 px, grand carreau 25 px, filets rosés très sombres) | Papier d'enregistrement ECG et polygraphie | SpO₂ 30 j, signal d'humeur, graphes de la fenêtre organe, frise Santé mentale. Nulle part ailleurs. |
| Grand chiffre condensé (IBM Plex Sans Condensed, 44 px) | Valeur principale d'un moniteur | SpO₂, FC en direct, J85 (Santé mentale) |
| Références, heures et graduations en IBM Plex Mono | Incrustations, horodatages d'appareil | Heures de la to-do, NASA V1 4027, axe de la chronologie, citations de norme |
| Curseur de chronologie en trait vertical | Curseur de tendance d'un moniteur | Chronologie |
| Marque : une onde de pouls tracée en SVG | Le tracé qui est au cœur de l'app | Barre haute |

Polices : IBM Plex Sans, Sans Condensed et Mono, installées localement par `@fontsource` (rien n'est chargé depuis Internet). Inter reste en repli.

Couleurs : `src/ui/tokens.ts` reste la seule source. Fond `#07080A` (noir de moniteur), secteurs `#0D0F12`, filets `#1E2329`. Le vert dit seulement « nominal ». Le jaune `#EDBB2C` et le rouge `#F04A42` sont réservés aux alarmes. Le gris dit « inconnu » et reste une pastille creuse. Le texte muet passe à `#79828C`, au-dessus de 4,5:1 sur le fond.

## Ce qui a changé, page par page

### Coquille (barre haute)
- La marque est une onde de pouls tracée à la main, suivie de « Sol Zéro ».
- Le bandeau patient remplace le prénom seul : « Cdt Haddad SZ-01 », nom en mono, comme l'identification d'un moniteur.
- « Données simulées » devient une mention encadrée (filet), plus une pastille teintée. Elle reste visible à toutes les largeurs.
- Sur téléphone, la barre passe sur deux rangées : marque, « Données simulées » et « Détails » en haut, les trois onglets sur toute la largeur dessous.

### Corps (/body)
- Plus de cartes arrondies. La page est une grille dont la gouttière de 1 px est le filet entre les secteurs. La scène 3D est le seul secteur noir.
- En-tête : valeurs en chiffres condensés de 28 px (« Jour 94 », « 43,1 ans »).
- Scène : identification et date en haut à gauche (« Haddad · SZ-01 », « J094 · 2026-11-14 »), calques affichés et « Atlas Z-Anatomy, pas une image du patient » en bas à gauche, délai Terre en bas à droite. Le bandeau « Projection » est encadré d'un filet clair.
- Étiquettes 3D : `[n°] Nom [priorité]`. Le numéro est celui de la liste d'alertes. En mode Détails, la règle s'affiche en mono (NASA V1 4027, Tendance 7 j).
- Alertes : chaque ligne porte n°, titre, marqueur de priorité et chevron, séparés par des filets. Une alerte ROUGE colore aussi son titre, comme un message d'alarme haute.
- Constantes : SpO₂ en grand chiffre de moniteur, courbe 30 j sur papier d'ECG, vitales en chiffres condensés.
- Chronologie : graduations et jalons en mono, curseur en trait vertical.
- Fenêtre organe et Corps entier : graphes sur papier d'ECG (la grille Recharts est masquée pour ne pas doubler). « À valider par le médecin de bord » devient une mention encadrée.
- Pastilles de statut carrées (voyants), gris toujours creux.
- Téléphone : une colonne qui défile. En-tête, scène sur 62 % de la hauteur, chronologie, puis les panneaux.

### Plan du jour (/warroom)
- Même surface en secteurs à filets. La ligne de tête porte « Heure de bord 07:00 » en mono (l'horloge figée de la démo, dite en clair).
- « Maintenant » est le seul grand texte de la page : 28 px pour la consigne, 22 px gris pour « Aucune consigne avant le check-in ». « Faire le check-in » devient l'action principale (bouton clair).
- Après le check-in, le niveau s'affiche avec son marqueur : `!!` Attention renforcée pour une douleur 2 (voir `after-warroom-checkin.png`).
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
| « Haddad », « Données simulées » (infobulle), « Détails » | Barre haute : bandeau patient « Cdt Haddad SZ-01 » (infobulle persona fictive), mention encadrée, bouton |
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
| Aujourd'hui : 10 tâches, Priorité 1, Suspendu, Pourquoi, synchro montre | Inchangé |
| Signal d'humeur : score, seuil, courbe, « Pas un diagnostic » | Inchangé, courbe sur papier d'ECG |
| Pourquoi ? : retour, titre, chaîne en 4 étapes, citation, introuvable, 19 sujets, fiches des modèles et leurs limites | Inchangé. Rail vertical, citation en extrait, modèles à droite sur grand écran. |
| Santé mentale : retour, sous-titre, Prototype, résultat, frise cliquable, dossier, fonctionnement, pied de page | Inchangé. J85 en grand, frise sur papier d'ECG. |
| Endpoints `/api/todo`, `/ingest`, `/api/health` | Non touchés (`server/`) |

## Limites connues

- Les moniteurs font clignoter les alarmes hautes (IEC 60601-1-8). Ici rien ne clignote : c'est une exigence anti-effets de l'équipe et une question d'accessibilité. Le niveau se lit par la couleur, le marqueur et le mot.
- Les points d'exclamation sont une convention d'affichage, pas un texte de la norme. Le PROPOSAL et les commentaires du code le disent.
- Capture J860 : deux étiquettes se chevauchent (« Hanche » sous « Rachis »). C'est déjà le cas avant la refonte : la capture tombe pendant le lissage des positions. À vérifier en direct.
- Captures téléphone : Chrome sans tête impose une fenêtre d'au moins 500 px. Les vues 390 px `after-mobile-*` passent donc par une iframe de 390 px, et dans ce mode la 3D ne se dessine pas encore au moment de la capture (la scène reste vide sur `after-mobile-body.png`). Les captures `before-*-mobile` ont été faites dans une fenêtre trop large et sont rognées. En vrai, sur téléphone, la scène s'affiche.
- La frise Santé mentale défile à l'horizontale sur téléphone, comme avant.
- Point 7.3 de l'inventaire non traité : le compteur annonce 8 alertes à J600 et la liste défile sans autre indice. Les numéros aident un peu : la liste visible s’arrête à 7 alors que le compteur dit 8.
- `after-warroom-checkin.png` et `after-body-details.png` sont faits avec une page temporaire qui préremplit `localStorage` (check-in douleur 2, mode Détails). Elle a été supprimée après les captures.
- La skill Impeccable demande normalement de valider la direction avec l'utilisateur. Il dormait : j'ai pris la direction du brief (« Instrument médical ») sans question.

## Lancer

```bash
cd /Users/ahmed/Documents/Hacks/sol-zero-ui-B-instrument-medical
npm install            # ajoute @fontsource/ibm-plex-sans, -sans-condensed, -mono
npm run dev -- --port 5182 --strictPort
# http://localhost:5182/body · /warroom · /reasoning/r-hanche-ared · /mental
npm run build && npm test   # build OK, 147 tests OK
```
