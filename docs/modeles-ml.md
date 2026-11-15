# SOL ZÉRO — Nos 3 modèles de Machine Learning

*Fiche de référence pour le pitch. Rédigée par Mouad (rôle C). Le code est dans la PR n°1 (`feature/mouad-sim`).*

## L'essentiel en 30 secondes

> « SOL ZÉRO embarque **trois modèles d'IA entraînés**.
> - Le premier lit la prise de sang et estime **l'âge biologique du sang**.
> - Le deuxième **projette la perte de l'os, du muscle et du cœur** jusqu'à l'arrivée sur Mars, avec une fourchette d'incertitude.
> - Le troisième **repère un glissement du moral** en comparant l'astronaute à lui-même.
>
> Un modèle est entraîné sur de **vraies données humaines** (NHANES, 9 300 personnes). Les deux autres sont entraînés sur une **cohorte d'astronautes virtuels calibrée sur les chiffres NASA publiés**, faute de données d'astronautes publiques.
> Tout tourne **à bord, sans Internet**. Les modèles prédisent et signalent ; les décisions d'alerte restent fondées sur les **normes NASA**. »

| | Modèle | Il répond à… | Type d'apprentissage | Données |
|---|---|---|---|---|
| **A** | Âge sanguin | « Quel âge a ton sang ? » | Supervisé, régression | **Réelles** : NHANES (CDC), 9 326 adultes |
| **B** | Projection des organes | « Où en seront tes organes à l'arrivée sur Mars et en fin de mission ? » | Supervisé, régression quantile | **Simulées** : 2 000 astronautes virtuels calibrés NASA |
| **C** | Signal d'humeur | « Ton moral glisse-t-il durablement ? » | Supervisé, classification | **Simulées** : 1 500 astronautes virtuels × 150 jours |

**Comment ça marche en pratique.** L'apprentissage est fait **une fois, avant la démo**, en Python avec scikit-learn. Les coefficients appris sont enregistrés dans `public/data/ml/*.json`. Dans l'application, on applique la formule aux mesures de l'astronaute : c'est instantané, ça marche **hors ligne** et c'est **explicable**.

---

## Modèle A — Âge sanguin

### Ce qu'il fait
À chaque prise de sang (J0, J7 … J91), le modèle procède en quatre étapes :
1. Il lit **13 marqueurs** :
   - albumine, créatinine, glucose, phosphatases alcalines, calcium ;
   - leucocytes, % de lymphocytes, VGM, IDR, hémoglobine, hématocrite ;
   - CRP (inflammation), vitamine D.
2. Il compare chaque marqueur à la population NHANES.
3. Il multiplie chaque écart par un **poids appris**, puis il additionne. Le résultat est l'**âge sanguin**.
4. Il retire le biais connu de ce type de modèle, qui vieillit les jeunes et rajeunit les vieux.

### Ce qu'il donne pour Haddad
- **L'âge sanguin passe de 41,1 ans à J0 à 44,6 ans à J91.** En trois mois de vol, le sang « vieillit » d'environ 3,5 ans, surtout à cause de l'inflammation, du glucose et des phosphatases alcalines.
- **La contribution de chaque marqueur, en années** (exemple : « CRP +1,2 an »). C'est ce qui alimente le bouton **« Pourquoi ? »**.

### Comment il a été entraîné
- **Données réelles** : NHANES 2015–2018 (enquête nationale de santé du CDC américain), 9 326 adultes de 20 à 79 ans.
- **Apprentissage supervisé, régression.** Entrée : les 13 marqueurs. Cible (l'étiquette) : l'âge réel de la personne.
- **Algorithme : ElasticNet**, une régression linéaire avec régularisation L1 + L2 pour éviter le surapprentissage. La force de la régularisation est réglée par **validation croisée à 5 plis**.
- **Séparation 80 / 20** : 7 460 personnes pour l'entraînement, 1 866 pour le test, jamais vues pendant l'entraînement.

### Résultats sur le test
| Mesure | Valeur |
|---|---|
| R² (part de la variation d'âge expliquée) | **0,28** |
| Erreur moyenne sur l'âge | ±11,8 ans |
| Comparaison : gradient boosting (non linéaire) | R² 0,39, mais pas explicable marqueur par marqueur |
| Comparaison : Klemera-Doubal (méthode de référence) | Retombe sur l'âge réel : pas assez d'information dans ces marqueurs |

**Pourquoi un modèle linéaire :** on a préféré l'**explicabilité** à quelques points de performance. Un médecin doit pouvoir lire *pourquoi* l'âge monte.

---

## Modèle B — Projection des organes

### Ce qu'il fait
À J94, le modèle résume ce qu'on a mesuré chez l'astronaute en 6 chiffres :

| Organe | Ce que le modèle regarde |
|---|---|
| **Hanche (os)** | Hausse du **calcium et du CTX urinaires** depuis J0. Le scanner ne voit pas l'os, mais quand l'os fond, son calcium part dans les urines. Le modèle apprend à **déduire l'os à partir des urines**. |
| **Cuisse (muscle)** | Perte de volume actuelle, et vitesse de perte sur 4 semaines |
| **Cœur (VO₂max)** | Perte de capacité d'effort actuelle, et vitesse de perte sur 4 semaines |

Il projette ensuite la perte à **l'arrivée sur Mars (Sol 0, J210)** et en **fin de mission (J860)**, dans deux scénarios : « on continue comme maintenant » et « on suit le plan ». Chaque projection donne **3 valeurs** :
- **cas favorable** (10 %) ;
- **cas probable** (50 %) ;
- **cas défavorable** (90 %).

### Ce qu'il donne pour Haddad
| Projection (sans changement) | Cas probable | Fourchette |
|---|---|---|
| Hanche, perte de densité à J860 | **8,6 %** | 6,4 % – 11,7 % |
| Cœur, perte de VO₂max à l'arrivée sur Mars | **≈ 17 %** | |
| Cuisse, perte de volume à l'arrivée sur Mars | **≈ 11 %** | |

**Avec le plan, toutes les projections baissent.** C'est l'argument « voilà ce que le plan change ».

### Comment il a été entraîné
- **Données simulées** : 2 000 astronautes virtuels. Chacun a sa propre vitesse de perte, tirée au hasard autour des ordres de grandeur NASA publiés :
  - os : LeBlanc 2000, Sibonga ;
  - muscle : Gopalakrishnan 2010 ;
  - VO₂max : Moore 2014.

  On simule leurs mesures de J0 à J94 avec le même bruit de mesure que les vrais capteurs, et on connaît leur **vraie** perte future.
- **Apprentissage supervisé, régression quantile.** Entrée : les mesures de J0 à J94. Cible : la vraie perte future. Avec la perte « pinball », le modèle apprend directement le cas favorable, le cas probable et le cas défavorable.
- **Séparation 75 / 25** : 1 500 astronautes pour l'entraînement, 500 pour le test.

### Résultats sur le test (erreur moyenne, en points de %)
| Projection | Avec le ML | Sans ML (courbe fixe) |
|---|---|---|
| Cuisse à J860 | **0,9** | 2,7 |
| Cœur à J860 | **0,8** | 2,8 |
| Hanche à J860 | **1,7** | 2,6 |
| Cœur à l'arrivée sur Mars | **0,24** | 0,94 |

- **Le modèle bat la méthode sans ML sur les 12 projections.**
- **La fourchette est fiable** : sur le test, la bande 10–90 % contient la vraie valeur dans 78 à 84 % des cas, pour 80 % attendus.

---

## Modèle C — Signal d'humeur

### Ce qu'il fait
Chaque jour, de J27 à J94, le modèle procède en quatre étapes :
1. **Référence personnelle.** Il calcule comment l'astronaute allait **au début de la mission** (J0 → J20) sur 6 signaux :
   - humeur, fatigue, sommeil ressenti (check-in du matin) ;
   - heures de sommeil, variabilité cardiaque (montre) ;
   - cortisol (prise de sang).
2. **Écart récent.** Il mesure l'écart entre les **7 derniers jours** et cette référence. On compare l'astronaute **à lui-même**, jamais à une norme.
3. **Score.** Il combine les 6 écarts avec des **poids appris**, ce qui donne un **score de 0 à 1**.
4. **Alerte.** Elle se déclenche seulement si le score dépasse **0,44 deux jours de suite**. Un mauvais jour isolé ne déclenche rien.

### Ce qu'il donne pour Haddad
- **Avant J75 :** aucune alerte.
- **À J75 :** début du glissement d'humeur injecté dans le scénario.
- **À J83 :** alerte, 8 jours après le début.

Dans l'app, cela s'affiche comme un **« signal à surveiller, on propose un point avec le psy »**. **Ce n'est jamais un diagnostic.**

### Comment il a été entraîné
- **Données simulées** : 1 500 astronautes virtuels suivis pendant 150 jours.
  - 40 % vivent un épisode dépressif : début et intensité aléatoires, donc **connus**.
  - Tous peuvent avoir des « mauvaises passes » de 3 à 7 jours. Ce sont des **pièges** pour apprendre à ne pas sur-réagir.
- **Apprentissage supervisé, classification binaire, régression logistique.** Cible : « épisode installé ce jour-là, oui ou non ».
- **Séparation par astronaute** (1 125 pour l'entraînement, 375 pour le test). Les astronautes du test n'ont **jamais** été vus pendant l'entraînement, ce qui évite la fuite de données.
- **Seuil choisi** pour limiter les fausses alertes à environ 5 % des astronautes.

### Résultats sur le test
| Mesure | Valeur |
|---|---|
| Épisodes détectés | **92 %** |
| Délai médian de détection | **13 jours** |
| Astronautes avec une fausse alerte | **6,4 %** |
| AUC (capacité à distinguer épisode et pas d'épisode) | 0,99 |
| Comparaison non supervisée (IsolationForest, sans étiquettes) | AUC 0,98 |

---

## Où les voir dans l'app

| Où | Déjà branché ? | Comment |
|---|---|---|
| **Page Raisonnement** (bouton « Pourquoi ? » de chaque tâche) | **Oui** (PR n°9) | Les explications citent les modèles : B pour l'os, le cœur et la cuisse (« 8,6 % à J860, fourchette 6,4–11,7 ») ; A pour le prélèvement (« âge sanguin 44,6 ans ») ; C pour le point psy (« score 0,99 ») |
| **War Room** : niveau du jour + to-do | **Oui** (PR n°9) | Le modèle C ajoute « point psy proposé » au triage et à la to-do, sans changer le niveau |
| **Page Body**, en-tête | À faire (Walid) | `bloodAgeSeries().at(-1)` → « Âge sanguin 44,6 ans », à côté de PhenoAge |
| **Fenêtre organe** hanche / cuisse / cœur | À faire (Walid) | `organForecast(organe, 210 ou 860, plan)` → bande 10–90 % autour de la projection |
| **Page Raisonnement**, section « Nos modèles d'IA » | À faire (Ahmed) | `modelCards()` → données, méthode, métriques et limites de chaque modèle |
| **War Room**, courbe d'humeur (option) | À faire (Ahmed) | `moodSignals()` → score jour par jour, seuil 0,44 |

Parcours de démo conseillé :
1. **War Room** : J94 AMBRE, avec l'item « point psy proposé ».
2. **« Pourquoi ? »** sur le point psy : le modèle C, son score et ses performances sur le test.
3. **« Pourquoi ? »** sur l'ARED : le modèle B et la projection de la hanche à J860 avec sa fourchette.

## Questions probables du jury

**« Vous avez entraîné sur des données inventées ? »**
- Le modèle A est entraîné sur de **vraies données humaines** (NHANES).
- Pour les modèles B et C, les données d'astronautes ne sont pas publiques : 4 personnes pour Inspiration4, 1 pour la Twins Study, et les études ISS sont en accès contrôlé. On a donc construit une **cohorte virtuelle calibrée sur les chiffres NASA publiés**.
- Ce qu'on démontre, c'est la **méthode**. Avec de vraies données d'astronautes (base LSDA), il suffit de relancer les scripts d'entraînement. C'est pourquoi B et C portent l'étiquette **[H]** (hypothèse).

**« Pourquoi des modèles simples et pas du deep learning ? »**
- **Peu de données.** Un réseau de neurones surapprendrait.
- **Explicabilité.** Chaque prédiction se décompose marqueur par marqueur pour le bouton « Pourquoi ? ».
- **Embarqué.** Quelques coefficients tournent n'importe où, sans GPU ni Internet.
- On a testé un modèle plus complexe (gradient boosting sur A) : il gagne en précision mais perd l'explication.

**« L'IA décide-t-elle à la place du médecin ? »**
- Non. Les modèles **prédisent** et **signalent**. Les décisions MAINTENANT viennent des **normes NASA**, et le modèle d'humeur **propose** un point psy, il n'impose rien.

**« Comment savez-vous que ça marche ? »**
- Chaque modèle est évalué sur des données **jamais vues** pendant l'entraînement.
- Chaque modèle est comparé à une **méthode sans ML**.
- Pour B, on vérifie que la fourchette annoncée à 80 % contient bien environ 80 % des cas.

**« Et l'apprentissage auto-supervisé ? »**
- C'est la suite logique avec des mois de vraies données de montre **non étiquetées**. Par exemple, apprendre à prédire le sommeil de demain à partir des 7 jours précédents, puis utiliser ce modèle pré-entraîné.

---

## Où trouver quoi

| Quoi | Fichier |
|---|---|
| Scripts d'entraînement (Python) | `scripts/ml/train_blood_age.py`, `train_organs.py`, `train_mood.py`, `cohort.py` |
| Modèles entraînés (coefficients + fiche + métriques) | `public/data/ml/blood-age.json`, `organ-forecast.json`, `mood-risk.json` |
| Calcul dans l'app (TypeScript, hors ligne) | `src/models/ml/index.ts` : `bloodAgeSeries()`, `organForecast()`, `moodSignals()`, `modelCards()` |
| Tests | `tests/models/ml.test.ts` |

Pour ré-entraîner : `python scripts/ml/train_<modèle>.py`. Il faut Python avec numpy, pandas et scikit-learn ; NHANES est téléchargé une fois puis mis en cache.
