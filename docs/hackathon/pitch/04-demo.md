# 04. Chorégraphie de la démo

> Version 3 (après le jury du 15/11, 7,5/10). Ce qui change : en D1, Ahmed attend que la consigne s'affiche avant de la lire ; en D2, Mouad pointe d'abord la cause de la suspension (ligne « Prévenir le CMO de bord », règle R13), puis ouvre le « Pourquoi » du squat pour montrer que sauter la séance est sans risque. Mots à ne pas lire à voix haute : « to-do », « Médecin de bord », la ligne « Sol-routine 14:00 » (voir `03-scripts.md`, conventions).
>
> Version 2 (après le jury blanc) : la suspension du squat lourd est assumée et montrée ; en 4 min, l'écran reste sur la démo de D1 à D5 (pas de slide 6) ; le deck est `slides/index.html`.

## Qui fait quoi

| Personne | Pendant la démo |
| :-- | :-- |
| **Mouad** | Pilote le portable de démo : souris, clavier, onglets. Ne parle pas pendant D1 à D5. |
| **Ahmed** | Porte l'Apple Watch, raconte D1 et D2. L'iPhone (raccourci en cours) est posé à côté du portable, écran allumé. |
| **Walid** | Raconte D3 à D5 en montrant l'écran de la main, jamais de dos au jury. |
| **Steve** | Télécommande des slides. Dit « écran » à Mouad quand on repasse en démo si ça traîne. |

**Portable de démo : celui d'Ahmed** (Node 22, `presenter.json` généré à partir de son export Santé, raccourcis iOS déjà réglés sur son adresse IP). Mouad le pilote.

## Avant de monter sur scène : lancer et préparer

```bash
cd <dépôt> && git checkout v1.0-demo   # ou release/1.0, selon ce qui est tagué
npm run build && npm run preview -- --host   # port 4173, API /ingest et /api/todo incluses
```

Onglets à ouvrir dans **Chrome, dans cet ordre** (Cmd+1, Cmd+2… pour basculer sans chercher) :

| Onglet | URL | État attendu au départ |
| :-- | :-- | :-- |
| 1 | `http://localhost:4173/warroom?demo` | Check-in vide, MAINTENANT gris « Aucune consigne avant le check-in », carte pouls « En direct · montre » |
| 2 | `http://localhost:4173/body?day=today&plan=0&layers=squelette,muscles,organes` | J094, statut AMBRE, 4 alertes, projection « Rythme actuel » |
| 3 | `http://localhost:4173/body?day=end&plan=0&layers=squelette,muscles,organes` | Secours : J860 déjà affiché si un clic de timeline rate |
| 4 | `http://localhost:4173/reasoning/r-hanche-ared` | Secours : le « Pourquoi » de la hanche, si le clic dans le plan rate |
| 5 | `http://localhost:4173/mental` | Seulement pour les questions sur la santé mentale |

Chrome en plein écran (Cmd+Ctrl+F), zoom 100 %. Pour la slide/démo sur un seul projecteur : slides en plein écran sur le **Bureau 1**, Chrome sur le **Bureau 2**, bascule avec **Ctrl+→ / Ctrl+←**. Avec deux entrées vidéo, Steve garde les slides sur son portable et la régie bascule.

Le fond de la page est noir : vérifiez sur le vrai projecteur que les statuts ambre et le gris restent lisibles (sinon, monter la luminosité du projecteur, pas toucher au code).

## Déroulé clic par clic

Les codes renvoient à `03-scripts.md`.

### D1 · War Room (Ahmed parle, Mouad clique)

1. Écran sur l'onglet 1. Ahmed lève le poignet. Mouad pointe à la souris la carte du pouls (« En direct · montre », valeur qui bouge toutes les ~10 s).
2. Sur « Humeur : deux », Mouad clique **2** sur Humeur, **4** sur Fatigue, **0** sur Douleur, **2** sur Sommeil, puis **Valider le check-in**. Garder le rythme de la voix d'Ahmed : un clic par mot. **Ahmed attend que MAINTENANT ait changé** avant de dire « La consigne » : Mouad lui fait un signe de tête quand c'est affiché.
3. État attendu :
   - MAINTENANT passe au niveau ORANGE, affiché **« Attention renforcée »** avec une pastille ambre (l'écran ne dit pas « orange » : les orateurs non plus) : « Appliquer la to-do du jour sans report et prévenir le CMO de bord dans la journée. »
   - Raisons listées dessous, dont « Humeur 2/5 avec fatigue 4/5 : prévenir le CMO de bord ».
   - ENSUITE : « Décide : Médecin au sol », « ≈ 52 min (aller-retour radio 2 × 11,0 min + traitement) », « Réponse vers 07:52 ».
   - La to-do se réordonne, « Prévenir le CMO » en tête. La ligne **« ARED — squat lourd »** est barrée, marquée **« Suspendu »** (pastille ambre) : au niveau ORANGE, toute séance en charge lourde est suspendue (`TodoList.tsx`, `isSuspended`). Sur « séance lourde », Mouad la pointe à la souris.
   - Si elle n'est **pas** marquée « Suspendu » (autre version de l'app), voir les phrases de rattrapage de `03-scripts.md`.
4. Pourquoi ce check-in : humeur 2 + fatigue 4 déclenchent la règle R13 (ORANGE), sans inventer de douleur qui n'aurait rien à voir avec la hanche. Ça prépare aussi la slide santé mentale.

### D2 · « Pourquoi » (Ahmed parle, Mouad clique)

1. Sur « Fatigue quatre, humeur deux » : pointer à la souris la ligne **« Prévenir le CMO de bord »**, en tête du plan. Son détail dit « Humeur 2/5 avec fatigue 4/5 : point avec le CMO avant toute séance ». C'est la vraie cause de la suspension (règle R13 du check-in, [H]). Elle est à l'écran pendant qu'Ahmed la dit.
2. Sur « Et le sauter est sans risque » : dans le plan, ligne **« ARED — squat lourd »**, clic sur **Pourquoi** → `/reasoning/r-hanche-ared`. Cette page ne justifie pas la suspension : elle montre que la hanche a de la marge (98 % contre 95 %), donc qu'une séance sautée ne coûte rien. C'est ce qu'Ahmed dit, rien de plus.
3. Descendre d'un trait jusqu'au bloc **NORME** (citation anglaise V1 4027 dans l'encadré), sans s'arrêter sur le bloc MODÈLE. Ahmed dit la DONNÉE (hanche 98,01 %) pendant la descente. S'arrêter sur la citation pendant « citée mot pour mot ».
4. **Ne pas ouvrir** le « Pourquoi » du check-in (`r-checkin`) : il écrit « RÉEL, saisi » pour un check-in tapé en démo, alors que les valeurs sont celles de Haddad. Sur scène, on dit « simulé ».
5. Si un juré demande « lequel est le vrai motif, la hanche ou la fatigue ? » : ouvrir le « Pourquoi » de **« Prévenir le CMO de bord »** (`/reasoning/r-cmo`) : MODÈLE = triage du jour, règles R13 ; NORME = V1 3006 (officier médical de bord). Réponse : « La fatigue. La hanche dit seulement qu'on peut se permettre de sauter. »
6. Suite :
   - **7 min** : l'écran repasse sur les slides (S5 puis S6). Pendant ce temps, Mouad fait **Cmd+2** (onglet Body) sans que l'écran soit projeté.
   - **4 min** : pas de slides. Mouad fait **Cmd+2** à l'écran, Walid enchaîne en regardant le jury pendant que la 3D apparaît.

### D3 · Corps aujourd'hui (Walid parle, Mouad clique)

1. Écran sur l'onglet 2. **7 min seulement** : clic **« Rejouer le scan »** (balayage d'environ 2 s).
2. Survol lent de la **hanche** : la carte de survol s'ouvre côté opposé à la plaque. Laisser 2 s.
3. Montrer les 4 plaques ambre (Cœur, Hanche, Cuisse, et le nerf optique dans le panneau Alertes) et un organe gris « NON MODÉLISÉ » (poumons, foie, cerveau) pendant « ce qu'on ne mesure pas reste gris ».

### D4 · Sol 0 *(7 min seulement)*

1. Timeline : clic **« Sol 0 »**. Pointer la ligne **Cœur** du panneau Calques : **36,5 ml/kg/min**.
2. Clic **« Avec le plan »** : **37,3**. Puis **« Rythme actuel »** pour revenir.

### D5 · Fin de mission

1. Timeline : clic **« J860 »**. Le corps passe au rouge, bandeau « PROJECTION · NON MESURÉ », hanche **91,3 %** (perte 8,7 %).
2. Sur « s'il suit le plan » : clic **« Avec le plan »**. La hanche repasse ambre (perte 4,22 %).
3. L'écran repasse sur les slides (S7). Mouad remet **« Aujourd'hui »** et **« Rythme actuel »** pendant que personne ne regarde, au cas où une question demanderait de revenir à la démo.

### Après le pitch (questions)

Mouad garde l'écran prêt à rouvrir : onglet 4 (raisonnement), onglet 5 (santé mentale), page Raisonnement → section « Nos modèles d'IA » pour les questions sur les modèles.

## Plan B

| Si… | On fait | Phrase à dire (sans s'excuser) |
| :-- | :-- | :-- |
| **La montre n'envoie rien** (carte grise « il y a … » ou « Aucune mesure ») | Ahmed le dit, Mouad ouvre **« Saisie manuelle »** dans la carte montre et saisit la FC qu'Ahmed lit sur sa montre | « Le chiffre est gris : quand Sol Zéro ne sait pas, il le dit. Je le recopie depuis ma montre, comme un astronaute le ferait si le capteur lâche. » |
| **Le Wi-Fi isole les appareils** (constaté avant) | Partage de connexion de l'iPhone, Mac connecté dessus, IP mise à jour dans les raccourcis (`server/shortcuts/README.md`) | rien |
| **Plus de réseau du tout** | L'app tourne en local, tout marche sauf le direct de la montre : appliquer la ligne 1 | idem ligne 1 |
| **Un clic de timeline ou de « Pourquoi » ne répond pas** | Onglet de secours 3 ou 4 (Cmd+3, Cmd+4) | rien |
| **Le check-in était déjà rempli** (oubli de reset) | « Modifier » sur la carte check-in, ressaisir 2 / 4 / 0 / 2 | rien |
| **La 3D rame ou affiche « 3D INDISPONIBLE »** | Rester sur le panneau Calques et le panneau Alertes, qui marchent sans 3D ; ou passer à la slide de secours (captures J94 / J860) | « La 3D est un plus. Les chiffres et les alertes, eux, sont là. » |
| **Le serveur `preview` est tombé** | Terminal déjà ouvert : flèche haut, Entrée (relance en ~10 s) ; Steve meuble avec la slide suivante (S6 en 7 min, S7 en 4 min) | rien |
| **Le portable de démo meurt** | Vidéo de secours n° 1 sur le portable de Steve (et sur clé USB) ; Ahmed commente la vidéo avec le même texte | « Voici la même démo, enregistrée ce matin. » |
| **Le projecteur coupe la droite de l'écran** | Zoom Chrome à 90 % (Cmd+−) | rien |

Règle d'or : on ne débogue jamais devant le jury. Au bout de 5 secondes de blocage, on passe au plan B.

## Checklist, 30 minutes avant

### Machine

- [ ] Portable de démo branché sur secteur, mode Ne pas déranger activé, notifications coupées, veille désactivée.
- [ ] `npm run preview -- --host` tourne ; `http://localhost:4173/api/health` répond `{"ok":true…}`.
- [ ] Les 5 onglets sont ouverts dans l'ordre, Chrome en plein écran, zoom 100 %.
- [ ] Onglet 1 : bouton **« Réinitialiser la démo »** (en bas de `/warroom?demo`) cliqué, page rechargée : check-in vide, to-do décochée.
- [ ] Onglet 2 : « Aujourd'hui » + « Rythme actuel », 3 calques actifs.
- [ ] Une répétition complète D1 → D5 faite sur la machine, puis reset.

### Montre

- [ ] Montre chargée (> 50 %), iPhone chargé (> 50 %), verrouillage auto de l'iPhone sur « Jamais ».
- [ ] Sur l'iPhone, dans Safari : `http://IP:4173/api/health` répond (même réseau que le Mac).
- [ ] 2 minutes avant de monter : entraînement **« Autre »** lancé sur la montre, raccourci **« SOL ZÉRO — Pouls en continu »** lancé sur l'iPhone, app Raccourcis laissée au premier plan.
- [ ] La carte pouls de l'onglet 1 affiche **« En direct · montre »** avec une valeur de moins d'une minute.

### Scène

- [ ] Projecteur testé : résolution, couleurs ambre et grises visibles, rien de coupé à droite.
- [ ] Deck `slides/index.html` en plein écran (touche **F**) sur le bon bureau, télécommande testée (avancer et reculer). Touche **S** jusqu'au mode annoncé (4, 5 ou 7 min) : le message confirme les slides sautées. Slide 1 en attente : la lumière part au premier appui de Steve.
- [ ] Vidéo de secours n° 1 ouverte sur le portable de Steve, en pause sur la première image ; copie sur clé USB.
- [ ] Chrono visible pour Steve (téléphone posé face à lui).
- [ ] Chacun connaît la durée annoncée : 4 ou 7 min. On a décidé qui dit « version courte » si on l'apprend au dernier moment (Steve).
