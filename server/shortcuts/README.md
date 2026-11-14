# Raccourcis iOS — SOL ZÉRO

Les deux raccourcis parlent au serveur de démo lancé sur le Mac (`npm run build && npm run preview`, port **4173**).
Remplacer `IP` par l'adresse du Mac sur le réseau commun (Réglages Système → Wi-Fi → Détails), par ex. `10.213.1.43`.

**Prérequis réseau :** iPhone, montre et Mac sur le **même Wi-Fi**, sans isolation entre appareils.
Test rapide depuis Safari sur l'iPhone : `http://IP:4173/api/health` doit afficher `{"ok":true,...}`.
Si ça ne répond pas (Wi-Fi du Grand Palais qui isole les appareils), passer par le **partage de connexion de l'iPhone** et y connecter le Mac.

---

## 1. « SOL ZÉRO — To-do » (tourne sur la montre)

Dans l'app Raccourcis, nouveau raccourci, actions dans l'ordre :

1. **Obtenir le contenu de l'URL**
   URL : `http://IP:4173/api/todo/menu` · Méthode : GET
2. **Choisir dans la liste** (entrée : *Contenu de l'URL*)
   Invite : « Fait ? »
3. **Obtenir le contenu de l'URL**
   URL : `http://IP:4173/api/todo/done` · Méthode : **POST** · Corps de la requête : **JSON**
   Champ `item` (texte) = *Élément choisi*
4. **Afficher la notification** : « ✓ coché » (ou *Contenu de l'URL* → `title`)

Puis, dans les détails du raccourci : **Afficher sur Apple Watch** = activé.

> Le serveur accepte dans `item` l'id **ou** le libellé du menu : peu importe ce que renvoie « Choisir dans la liste ».
> La War Room interroge le serveur toutes les 3 s : l'item se coche à l'écran en moins de 3 s.

## 2. « SOL ZÉRO — Mesure » (tourne sur l'iPhone)

« Rechercher des échantillons de santé » n'existe pas sur la montre : ce raccourci se lance depuis l'iPhone.

1. **Rechercher des échantillons de santé**
   Type : *Fréquence cardiaque* · Trier par : *Date de début* · Ordre : *Plus récent en premier* · Limite : **1**
2. **Obtenir les détails des échantillons de santé** → *Valeur*
3. **Obtenir le contenu de l'URL**
   URL : `http://IP:4173/ingest` · Méthode : **POST** · Corps : **JSON**
   `type` (texte) = `HeartRate` · `value` (texte) = *Valeur* · `unit` (texte) = `bpm`
4. **Afficher la notification** : « FC envoyée »

(SpO₂ : même chose avec *Saturation en oxygène* et `type` = `OxygenSaturation`. La montre du présentateur
ne la mesure pas → la SpO₂ reste **SIMULÉE** à l'écran.)

Le serveur tolère `"72"`, `"72,5"`, `"72 BPM"`, un identifiant HealthKit complet et une date absente (= maintenant).

## 3. « SOL ZÉRO — Pouls en continu » (iPhone, pendant la démo)

Même raccourci que « Mesure », dans une boucle, avec la **date réelle de l'échantillon**.
Sans date, le serveur met l'heure d'envoi : une vieille mesure renvoyée en boucle passerait pour du direct.

1. **Répéter** : **120** fois (= environ 20 min à 10 s par tour)
   1. **Rechercher des échantillons de santé** : *Fréquence cardiaque* · Trier par *Date de début* · *Plus récent en premier* · Limite **1**
   2. **Obtenir les détails des échantillons de santé** → *Valeur* (variable `Valeur`)
   3. **Obtenir les détails des échantillons de santé** → *Date de début* (sur le même échantillon)
   4. **Formater la date** : *Date de début* → Format **ISO 8601**, **Inclure l'heure** activé (variable `Date`)
   5. **Obtenir le contenu de l'URL** : `http://IP:4173/ingest` · **POST** · Corps **JSON**
      `type` = `HeartRate` · `value` = *Valeur* · `unit` = `bpm` · `date` = *Date*
   6. **Attendre** : **10** secondes
2. **Afficher la notification** : « Fin du flux de pouls »

**Pendant la démo :**
- Sur la montre, lancer un entraînement **« Autre »** avant de démarrer le raccourci : la montre mesure alors le pouls
  en continu (au repos, elle ne le fait que toutes les quelques minutes).
- Lancer le raccourci depuis l'iPhone et **garder l'app Raccourcis ouverte** : la boucle s'arrête si l'iPhone se verrouille
  ou si on change d'app. Mettre le verrouillage auto sur « Jamais » le temps de la démo.
- À l'écran, la carte « Dernière mesure » affiche « En direct · montre » tant que l'échantillon a moins de 10 min.
  Si la montre n'a rien synchronisé depuis, le chiffre passe en gris avec « il y a … » : c'est voulu, jamais de faux direct.
- Délai réel montre → iPhone → écran : **à mesurer en répétition** (la synchro montre → iPhone se fait par paquets,
  de quelques secondes à environ une minute pendant un entraînement).

**Arrêter :** bouton ■ dans Raccourcis, ou fin de l'entraînement sur la montre (le raccourci renverra alors la dernière
valeur avec sa vraie date, qui vieillira normalement à l'écran).

---

## Vérifier sans téléphone

```bash
curl http://127.0.0.1:4173/api/todo/menu
curl -X POST http://127.0.0.1:4173/api/todo/done -H 'Content-Type: application/json' -d '{"item":"ared-squat"}'
curl -X POST http://127.0.0.1:4173/ingest -H 'Content-Type: application/json' -d '{"type":"HeartRate","value":72,"unit":"bpm"}'
curl 'http://127.0.0.1:4173/ingest/latest?type=HeartRate'
# Simuler le flux « Pouls en continu » (une mesure datée toutes les 10 s) :
for v in 72 75 78 81 79 76; do curl -s -X POST http://127.0.0.1:4173/ingest -H 'Content-Type: application/json' -d "{\"type\":\"HeartRate\",\"value\":$v,\"unit\":\"bpm\",\"date\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}"; echo; sleep 10; done
```

## Règle de coupe (ROADMAP §4)

Raccourci montre pas fiable à **dim. 09:00** → to-do montrée sur l'iPhone (Safari sur `http://IP:4173/warroom`),
mesure via l'export uniquement.
