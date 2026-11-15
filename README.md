# SOL ZÉRO Watch

App Apple Watch (avec son app iPhone compagnon) qui envoie le pouls **réel** à la War Room SOL ZÉRO, en quasi temps réel, via l'API locale du Mac (`POST /ingest`).

| Étape | État |
|---|---|
| 1. Squelette, réglage de l'adresse du Mac, bouton « Tester » | testé sur iPhone 16 Pro + Apple Watch SE (watchOS 11.5) |
| 2. Pouls en direct (séance d'entraînement → `/ingest` toutes les 2 s au plus, repli via l'iPhone) | testé : pouls réel reçu par le Mac ~5 s après la mesure ; repli via l'iPhone non testé |
| 3. Instantané santé | à faire |
| 4. To-do sur la montre | à faire |
| 5. Check-in du matin | à discuter (contrat `POST /api/checkin`) |

Cibles : iOS 17+, watchOS 10+. Swift 5, SwiftUI, sans aucune dépendance.

## Organisation

```
project.yml          source du projet (XcodeGen) → génère SOLZeroWatch.xcodeproj
Shared/              compilé dans les deux apps : appels HTTP, contrat /ingest, couleurs
Watch/               app montre : pouls (LiveHeartRate), envoi (Transport), écrans
iOS/                 app iPhone : saisie de l'adresse, relais montre → Mac
```

Le `.xcodeproj` est généré. Après avoir ajouté ou renommé un fichier, ou modifié `project.yml` : `xcodegen generate` (installé avec `brew install xcodegen`).

## 1. Préparer le Mac

1. Xcode **26.3** au maximum sur macOS Sequoia (26.4 et plus récents exigent macOS Tahoe 26.2). Télécharge le `.xip` sur developer.apple.com/download/all, puis :
   ```sh
   sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
   sudo xcodebuild -license accept
   xcodebuild -runFirstLaunch
   ```
2. Xcode › Settings › Components : installe **iOS** et **watchOS**.
3. Xcode › Settings › Accounts › « + » : ajoute ton Apple ID. L'équipe « Ton Nom (Personal Team) » apparaît.
4. Lance le serveur **ouvert sur le réseau** (sans `--host`, Vite n'écoute que le Mac lui-même) :
   ```sh
   npm run dev -- --host        # http://IP:5173
   npm run preview -- --host    # http://IP:4173
   ipconfig getifaddr en0       # l'IP à saisir
   ```

## 2. Préparer l'iPhone et la montre

1. Branche l'iPhone en USB, déverrouille-le, puis touche « Se fier à cet ordinateur ».
2. Sur l'iPhone, active le mode développeur : Réglages › Confidentialité et sécurité › Mode développeur. L'iPhone redémarre, puis confirme. Si l'option n'apparaît pas, ouvre d'abord Xcode › Window › Devices and Simulators avec l'iPhone branché.
3. Montre au poignet, déverrouillée, près de l'iPhone. Bluetooth et Wi-Fi activés sur le Mac.
4. Dans Devices and Simulators, la montre apparaît sous l'iPhone. La première préparation peut prendre **10 à 30 minutes**.
5. Sur la montre, active le mode développeur : Réglages › Confidentialité et sécurité › Mode développeur.

## 3. Signer et installer

1. Ouvre `SOLZeroWatch.xcodeproj`.
2. Clique sur le projet, puis dans **chacune des deux cibles** (`SOLZeroWatch` et `SOLZeroWatch Watch App`) : Signing & Capabilities › Team › « (Personal Team) ». Laisse « Automatically manage signing » coché. La capacité HealthKit est déjà déclarée.
3. Si Xcode affiche « Failed to register bundle identifier », le préfixe est déjà pris par un autre compte. Change `BUNDLE_PREFIX` dans `project.yml` (par exemple `com.tonprenom.solzero`), lance `xcodegen generate`, puis rouvre le projet et refais l'étape 2.
4. En haut d'Xcode, choisis le schéma **SOLZeroWatch** et ton iPhone, puis lance avec ⌘R.
5. Au premier lancement, iOS refuse d'ouvrir l'app. Va dans Réglages › Général › VPN et gestion de l'appareil › « Apple Development : ton Apple ID » › Faire confiance, puis relance avec ⌘R.
6. Choisis le schéma **SOLZeroWatch Watch App** et ta montre comme destination, puis lance avec ⌘R.
7. Sur la montre, au premier « Démarrer », accepte l'accès à Santé. La demande peut aussi apparaître sur l'iPhone.

Limites du compte gratuit : l'app expire au bout de **7 jours** (relance ⌘R pour la renouveler), 3 apps maximum par appareil, 10 identifiants d'app par semaine.

## 4. Régler l'adresse du Mac

Taper une IP sur la montre est pénible, alors passe par l'iPhone :

1. Dans l'app iPhone SOL ZÉRO, saisis `http://IP:5173`, puis touche **Tester depuis l'iPhone**. Le point vert indique que le Mac répond.
2. Touche **Envoyer à la montre**.
3. Sur la montre, fais défiler jusqu'à la page **Réglages**. L'adresse est là. Touche **Tester**. Un point vert indique que la montre joint le Mac directement, un point ambre qu'elle passe par l'iPhone.

Tu peux aussi saisir l'adresse directement sur la montre. `10.184.16.196:5173` suffit : `http://` est ajouté tout seul.

## 5. Utiliser

Page **Pouls** → **Démarrer**. La montre lance une séance d'entraînement (type « Autre », en intérieur) : c'est ce qui force la mesure continue du pouls. Chaque nouvelle valeur part vers `POST /ingest` avec **la date de l'échantillon**, au plus une requête toutes les 2 s. Si plusieurs valeurs arrivent entre deux envois, seule la plus récente part.

L'écran affiche :
- **« En direct »** (vert) seulement si une valeur est arrivée il y a moins de 15 s. Sinon le statut est gris.
- Le pouls en blanc quand il est frais, en gris sinon.
- « Envoyé à 19:29:10 depuis la montre » ou « via l'iPhone », avec le nombre d'envois.
- Le dernier message d'erreur, en rouge s'il est plus récent que le dernier envoi réussi, en gris sinon.

**Arrêter** termine la séance sans l'enregistrer dans Santé.

**Mode simulé** (page Réglages, désactivé par défaut) : produit un pouls inventé pour tester l'écran, par exemple dans le simulateur. Tout s'affiche en ambre avec « SIMULÉ · rien n'est envoyé ». **Aucune valeur simulée n'est envoyée au Mac.**

**Repli** : si la montre n'atteint pas le Mac (pas de réseau, délai dépassé, connexion refusée) et que l'app iPhone est joignable, la requête passe par l'iPhone via WatchConnectivity. L'iPhone affiche alors le nombre de requêtes relayées.

## 6. Tester avec curl

```sh
IP=$(ipconfig getifaddr en0)
curl http://$IP:5173/api/health
# → {"ok":true,"todo":N,"live":N}

# Attention : ajoute une vraie mesure au serveur (en mémoire, effacée au redémarrage)
curl -X POST http://$IP:5173/ingest -H 'Content-Type: application/json' \
  -d "{\"type\":\"HeartRate\",\"value\":72,\"unit\":\"bpm\",\"date\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}"

# Bornes : doit renvoyer {"ok":false,"error":"FC hors bornes (20–250 bpm)"}
curl -X POST http://$IP:5173/ingest -H 'Content-Type: application/json' \
  -d '{"type":"HeartRate","value":400,"unit":"bpm","date":"2026-11-14T19:29:10+01:00"}'

# Dernière mesure reçue
curl http://$IP:5173/ingest/latest
```

Voici exactement ce que la montre envoie :
```json
{"type":"HeartRate","value":72,"unit":"bpm","date":"2026-11-14T19:29:10+01:00"}
```

## Réinstaller sans cliquer (ligne de commande)

L'équipe de signature (`DEVELOPMENT_TEAM`) est déjà dans `project.yml`. Pour renouveler l'app après 7 jours, ou après une modif :

```sh
cd ~/Documents/Hacks/sol-zero-watch
xcrun devicectl list devices          # identifiants de l'iPhone et de la montre
xcodebuild -project SOLZeroWatch.xcodeproj -scheme SOLZeroWatch -destination 'generic/platform=iOS' \
  -derivedDataPath build -allowProvisioningUpdates build
xcrun devicectl device install app --device <ID iPhone> build/Build/Products/Debug-iphoneos/SOLZeroWatch.app
xcodebuild -project SOLZeroWatch.xcodeproj -scheme "SOLZeroWatch Watch App" -destination 'generic/platform=watchOS' \
  -derivedDataPath build -allowProvisioningUpdates build
xcrun devicectl device install app --device <ID montre> "build/Build/Products/Debug-watchos/SOLZeroWatch Watch App.app"
```

Une montre neuve doit d'abord être vue une fois par Xcode (fenêtre Devices, ⇧⌘2, montre déverrouillée), puis compilée avec `-destination 'id=<UDID montre>' -allowProvisioningDeviceRegistration` pour être ajoutée au profil. Sans ça : « This app could not be installed at this time ».

## Pannes connues

**« Personal development teams … do not support the HealthKit Access (Verifiable Health Records) capability »**
L'entitlement `com.apple.developer.healthkit.access` ne doit pas être présent. Les `.entitlements` ne contiennent que `com.apple.developer.healthkit`.

**« This app could not be installed at this time » sur la montre**
La montre n'est pas dans le profil de signature (compte gratuit = appareils enregistrés seulement). Voir « Réinstaller sans cliquer » ci-dessus.

**La montre n'apparaît pas dans Xcode / pas d'option « Mode développeur » sur la montre**
L'option n'apparaît qu'après une première connexion à Xcode. Fenêtre Devices ouverte, iPhone et montre déverrouillés ; accepter « Faire confiance » sur la montre, attendre (Xcode « cherche la montre sur le réseau local » plusieurs minutes), puis activer Réglages › Confidentialité et sécurité › Mode développeur.


**« Mac injoignable : connexion refusée, serveur lancé avec --host ? »**
Le serveur n'écoute que sur le Mac. Relance-le avec `npm run dev -- --host`. Vérifie aussi le pare-feu macOS : Réglages Système › Réseau › Pare-feu doit autoriser `node`.

**« Mac injoignable : délai dépassé » / ça marche sur le Mac mais pas sur l'iPhone**
Le Wi-Fi isole les appareils, ce qui est fréquent sur les réseaux d'événement ou d'école. Pour vérifier, ouvre `http://IP:5173/api/health` dans Safari sur l'iPhone. Si ça ne charge pas, utilise le **partage de connexion de l'iPhone** : branche le Mac dessus, reprends l'IP avec `ipconfig getifaddr en0` (souvent `172.20.10.x`), puis renvoie l'adresse à la montre. *Non vérifié* : on ne sait pas encore si la montre joint directement un Mac branché sur le partage de l'iPhone. Si ce n'est pas le cas, le repli via l'iPhone doit prendre le relais (point ambre).

**Réseau local refusé**
Si iOS a demandé « SOL ZÉRO souhaite trouver des appareils sur le réseau local » et que tu as refusé, réactive-le dans Réglages › Confidentialité et sécurité › Réseau local › SOL ZÉRO.

**« HTTP bloqué par ATS »**
Ça ne devrait pas arriver : les deux Info.plist autorisent le HTTP (`NSAllowsLocalNetworking` et `NSAllowsArbitraryLoads`, ce dernier ajouté parce que l'exception « réseau local » ne couvre pas clairement les adresses IP). Si ça arrive quand même, vérifie que les Info.plist sont bien ceux du dossier (Build Settings › Info.plist File).

**La montre ne s'installe pas / reste sur « Preparing »**
Montre déverrouillée et au poignet, en charge à côté de l'iPhone. Mac, iPhone et montre sur le même Wi-Fi, Bluetooth du Mac activé. Si ça bloque encore, essaie dans cet ordre :
1. Redémarre la montre, puis l'iPhone, puis Xcode.
2. Dans Devices and Simulators, clic droit sur la montre › Unpair, puis reconnecte-la.
3. Vérifie que la plateforme watchOS est installée (Settings › Components).

Si l'erreur indique que la version de watchOS ou d'iOS n'est pas prise en charge, c'est la limite d'Xcode 26.3 (iPhone en iOS 26.5) : il faut passer le Mac sous Tahoe et installer Xcode 26.5.

**« Autorise SOL ZÉRO dans Santé »**
Sur l'iPhone : Santé › Profil › Apps › SOL ZÉRO › tout activer. Sur la montre : Réglages › Santé › Apps.

**Pas de pouls dans le simulateur**
C'est normal. Active le mode simulé pour tester l'écran.

**L'app ne s'ouvre plus au bout de 7 jours**
C'est la signature du compte gratuit qui a expiré. Relance ⌘R depuis Xcode.
