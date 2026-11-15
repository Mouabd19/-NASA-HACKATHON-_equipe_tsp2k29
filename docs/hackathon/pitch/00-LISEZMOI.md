# Pitch Sol Zéro : par où commencer

## La recommandation en 5 lignes

1. **Message** : « Quand le médecin est à onze minutes-lumière, Sol Zéro dit à l'astronaute quoi faire ce matin, et lui prouve pourquoi. » Tout le reste sert cette phrase.
2. **Accroche** : « Cette semaine, Mars est à onze minutes-lumière de la Terre. Si un astronaute sur Mars demande à son médecin… » (chiffre réel JPL Horizons). « Pourra-t-il marcher en sortant du vaisseau ? » n'est plus dite (v3).
3. **Script** : préparez le **7 min** (script b) ; le **4 min** (script a) est le même avec 6 slides en moins, et l'écran reste sur la démo de D1 à D5. Durées calculées à 125 mots/min (v3) : **6:30** et **3:50**. Filage chronométré obligatoire ce matin. Un seul slogan, dit trois fois mot pour mot : « Quoi faire ce matin, sans attendre la Terre. »
4. **Démo** : check-in en direct (humeur 2, fatigue 4, douleur 0, sommeil 2) → consigne, squat lourd suspendu pour la fatigue (règle R13), « 52 min » (un majorant) → « Pourquoi » : sauter la séance est sans risque, norme NASA à l'appui → corps J94 → J860, rythme actuel contre plan (8,7 % contre 4,2 %). Ahmed porte la montre, Mouad pilote, Walid raconte le corps, Steve ouvre et ferme.
5. **Ouverture par le pouls (script c)** seulement si la montre a marché 3 fois sur 3 sur place.

## Les fichiers

| Fichier | Contenu | Qui le lit en priorité |
| :-- | :-- | :-- |
| [01-message.md](01-message.md) | L'idée en une phrase, les 3 niveaux d'idées, ce qu'on ne dit pas | Tout le monde, en premier |
| [02-accroches.md](02-accroches.md) | 12 ouvertures et 5 clôtures classées, avec le pourquoi | Steve |
| [03-scripts.md](03-scripts.md) | Scripts 4 min, 7 min et variante « le pouls d'abord », mot à mot, minutés, avec les clics | Tout le monde |
| [04-demo.md](04-demo.md) | Démo clic par clic, URL, états attendus, plan B, checklist 30 min avant | Mouad, Ahmed |
| [05-questions-jury.md](05-questions-jury.md) | 26 questions probables, réponses de 30 s, qui répond | Tout le monde |
| [06-defi-et-criteres.md](06-defi-et-criteres.md) | Chaque phrase du défi NASA et chaque critère du jury, avec la preuve et le moment du pitch | Steve, Mouad |
| [07-slides-plan.md](07-slides-plan.md) | 13 slides + 3 annexes : message, texte, visuel, animation, données des graphiques | Le designer |
| [08-retour-jury.md](08-retour-jury.md) | Ce que les deux jurys ont relevé (7/10 puis 7,5/10), corrigé ou non, et pourquoi | Tout le monde, avant le filage |
| [../slides/](../slides/README.md) | Le deck HTML (hors ligne) : touches, modes 4/5/7 min, notes orateur, chrono | Steve |

## Chiffres vérifiés dans le code (dimanche 15/11, branche `night/pitch-slides`)

| Chiffre | Valeur | D'où |
| :-- | :-- | :-- |
| Délai radio Terre → Mars | 11,0 min le 14/11 (J94) ; 10,9 min le 15/11 | `lightTimeMin()`, table JPL Horizons |
| Réponse du médecin au sol à J94 | 52 min = 2 × 11,0 + 30 [H]. Majorant : on prend la distance Terre–Mars, le vaisseau est plus près | `router()` |
| Squat lourd au check-in 2 / 4 / 0 / 2 | « Suspendu » (niveau ORANGE : charge lourde suspendue) | `TodoList.tsx`, `isSuspended()` |
| Statut de Haddad à J94 sans check-in saisi | AMBRE, 4 alertes : hanche, cuisse, cœur, nerf optique | `triage(94)` |
| Check-in démo 2 / 4 / 0 / 2 | ORANGE, affiché « Attention renforcée » + « prévenir le CMO » | règle R13, `checkInLevel()` |
| Hanche à J94 | 98,01 % (perte 1,99 %) | `metric(94, 'hanche')` |
| Hanche à J860 | perte 8,70 % (rythme actuel), 4,22 % (plan) | `boneLossPct()` |
| VO₂max à Sol 0 (J210) | 36,5 (rythme actuel), 37,3 (plan) ml/kg/min | `vo2max()` |
| Signal d'humeur | glissement injecté J75, signal J83 (modèle C) ; agents J85 | `moodSignals()`, `/mental` |
| Tests | 147 verts | `vitest run` |

## Décisions prises cette nuit (à valider au réveil)

- **Haddad est un homme** (« le commandant Haddad, il ») : c'est ce que dit le code (`sex: 'M'`) et la page Santé mentale. La fiche v3 disait « commandante ». Si vous préférez « elle », il faut changer les scripts **et** l'app.
- **Ahmed porte la montre et Mouad pilote la démo** : Ahmed connaît les raccourcis et c'est son export Santé ; Mouad connaît les modèles et répond aux questions de science.
- **Le check-in de démo est 2 / 4 / 0 / 2** (humeur basse et fatigue, sans douleur) : il déclenche ORANGE sans inventer une douleur sans lien avec la hanche, et il prépare la slide santé mentale.
- **Pas de VO₂max d'Ahmed dans le pitch** : la valeur « 41 » de la fiche n'est pas vérifiée, et sa montre n'a pas de VO₂max récent.
- **Pas de chiffre de dose de mission** : la fiche (982 mSv) et l'app (802 mSv à J860) ne sont pas d'accord. À corriger côté modèle `radiation` si quelqu'un a 10 minutes (le retour J710 → J860 est compté au débit de surface).
- **Le curseur « lien Terre » est une slide** (slide 6, 7 min seulement), pas une fonction de l'app.
- **v3 après le jury du 15/11 (7,5/10)** et **v2 après le jury blanc (7/10)** : voir `08-retour-jury.md`. Les repères de temps sont des calculs : faites un filage chronométré et remplissez le tableau en fin de `03-scripts.md`.
