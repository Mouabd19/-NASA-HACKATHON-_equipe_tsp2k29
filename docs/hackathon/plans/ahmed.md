> **Plan d'Ahmed (rôle B).** Le statut au fil de l'eau sera dans `status/ahmed.md` dès que le bootstrap existe.
>
> **Demandes aux autres (toutes par ajout, non cassantes) :**
> - **@Walid** :
>   - enregistrer le plugin `solZeroApi()` (`server/api.ts`) dans `vite.config.ts` ;
>   - activer `server.host: true` et `preview.host: true` ;
>   - ajouter au `.gitignore` : `public/data/watch/`, `server/.data/`, `export.xml`, `export.zip` ;
>   - donner à Ahmed la propriété de `public/data/watch/` et `scripts/parse-health.ts`.
> - **@Mouad** :
>   - `triage` et `planDay` lisent `todayCheckIn() ?? getCheckIn(day)` (`src/ingest/checkin.ts`) ;
>   - `getWatchSeries` fusionne `getRealSeries(type)` (`src/ingest/realData.ts`).
> - **Présentateur** : `export.zip` dans le drive avant sam. 15:00, avec Oxygène sanguin activé.

# Plan — Ahmed (rôle B) : War Room + Apple Watch

## Contexte
Hackathon SOL ZÉRO (NASA Space Apps, 14–15 nov. 2026). L'état du repo et le périmètre d'Ahmed sont fixés dans `ROADMAP.md` (§2, §3, §6, §7).
- **Périmètre exclusif d'Ahmed :** `src/pages/warroom/`, `src/pages/reasoning/`, `src/ingest/`, `server/`, plus `status/ahmed.md`.
- **État actuel :** `main` ne contient que la doc (README, ROADMAP, sources NASA). Ni `develop`, ni scaffold, ni `src/types.ts` : le bootstrap de Walid est attendu à sam. 14:30. Node 20.15 est installé.
- **Règles :** coder contre le contrat (§6 types, §7 signatures) sans jamais les changer, sauf par ajout demandé dans `status/`. Aucun appel réseau pendant la démo. Jamais de vert par défaut. Étiquettes RÉEL / SIMULÉ / [H] partout. Couleurs et typos uniquement via `src/ui/tokens.ts`.

## Phase 0 — Avant le bootstrap (maintenant → ~14:30) : TS pur, sans dépendance
Travail dans un dossier brouillon hors du repo (ou sur une branche locale jetable). On recopie ensuite sur `feature/ahmed-ingest`.
1. **`healthExport.ts` : parseur en flux** (`parseHealthExport(file, onProgress)`)
   - Lecture par `file.stream()` + `TextDecoderStream`, avec un tampon qui garde la fin incomplète de chaque morceau. Pas de DOMParser : `export.xml` fait souvent plus de 1 Go.
   - Extraction par regex des balises `<Record .../>` dont le `type` est dans la table de correspondance. Les attributs (`type`, `value`, `unit`, `startDate`, `endDate`) sont lus avec une regex d'attributs.
   - Correspondance HK → `Measurement['type']` : `HKQuantityTypeIdentifier{RestingHeartRate, HeartRateVariabilitySDNN, VO2Max, OxygenSaturation, AppleSleepingWristTemperature, HeartRate}` et `HKCategoryTypeIdentifierSleepAnalysis`.
   - Normalisation :
     - **SpO₂** : fraction 0,97 → 97, unité `%` ;
     - dates `"2025-01-15 07:30:00 +0100"` → ISO ;
     - **sommeil** : somme des segments `Asleep*` (Core / Deep / REM / Unspecified ; `InBed` et `Awake` exclus) par nuit, puis une `Measurement` par nuit en heures, datée du réveil ;
     - **HeartRate** : on ne garde que les 30 derniers jours (sinon des millions de points).
   - `source: 'apple-watch-export'`. `onProgress` = octets lus / `file.size`. On rend la main au navigateur (`await` à chaque morceau) pour que l'UI ne gèle pas.
   - Fonction interne exportée en plus (ajout) : `parseHealthXmlChunks(iterable)`, pour les tests et le script Node.
2. **`baseline30d.ts`** : fenêtre de 30 jours avant la dernière mesure du type demandé ; moyenne, écart-type et `n`. Sans données : `n = 0` et `mean = NaN`, pour que l'UI affiche « données insuffisantes ».
3. **Tests vitest** (prêts à coller sous `tests/ingest/`) : petit XML d'exemple, découpage en morceaux de 7 octets pour éprouver les frontières, conversion SpO₂, agrégation du sommeil, baseline sur un jeu vide.
4. **Raccourcis iOS, prototype sur iPhone** : « Get Contents of URL » vers un petit serveur Node de test sur le Mac (IP du réseau local). Ça valide dès maintenant le risque réseau (§ Risques).

## Phase 1 — sam. 16:00 : ingest livré (`feature/ahmed-ingest` → PR `develop`)
- Coller `healthExport.ts` et `baseline30d.ts` à la place des stubs, avec leurs tests.
- **Tester sur le vrai export du présentateur** (drive, avant 15:00) : temps de parsing, nombre de mesures par type, SpO₂ présente.
- **Script `scripts/parse-health.ts`** (Node 20 : `fs.openAsBlob` → même parseur) → `public/data/watch/presenter.json` : mesures filtrées + baselines. Pour que la démo ne dépende pas d'un import de fichier en direct.
  - Fichier **local, ignoré par git** (données de santé personnelles) ; il est généré sur la machine de démo.
  - `src/ingest/realData.ts` (ajout) : `getRealSeries(type): Measurement[]` et `getRealBaseline(type)`. Lit ce JSON, ou à défaut le dernier import fait dans l'app (IndexedDB).
- `status/ahmed.md` :
  - @Walid : `public/data/watch/` dans le périmètre d'Ahmed ; ligne `.gitignore` ;
  - @Mouad : `getWatchSeries` fusionne `getRealSeries` (sa tâche « fusion » de dim. 08:00).

## Phase 2 — sam. 20:00 : page War Room sur mocks (`feature/ahmed-warroom`)
`src/pages/warroom/WarRoom.tsx` + sous-composants dans le même dossier :
- **En-tête** :
  - jour J94 ;
  - délai radio `lightTimeMin(date)` (Steve) ;
  - carte **MAINTENANT** = `router(triage(day), pos, delay).maintenant`, avec l'étiquette « calculé à bord » ;
  - **ENSUITE** = `decideur` + texte + « reçu à HH:MM, délai X min » ; la synthèse IA (`getSummary`) apparaît ici, jamais dans MAINTENANT.
- **Check-in du matin** (`CheckInCard`) :
  - 4 lignes (humeur 1–5, fatigue 1–5, douleur 0–3 + zone, sommeil ressenti 1–5), 2 taps par ligne ;
  - à la validation, `saveCheckIn` puis recalcul du triage et du router, pour que MAINTENANT change à l'écran (moment clé de la démo, 0:15–0:35) ;
  - affiché en premier tant que le check-in du jour n'est pas fait, puis replié avec un résumé.
- **To-do** = `planDay(day)`, groupée exercices / repas / tests / médical et triée par `priority`. Les items médicaux de priorité 1 passent en tête, avec la bande hachurée rouge. Case à cocher, `time`, lien « Pourquoi ? » vers `/reasoning/:reasoningId`.
- **`src/ingest/checkin.ts`** : `localStorage` clé `checkin:J<day>`, avec try/catch ; `todayCheckIn()` lit le jour courant.
  - @Mouad, dans le status : `triage` et `planDay` utilisent `todayCheckIn() ?? getCheckIn(day)`.
- **Cas vides :**
  - pas de to-do → « Données insuffisantes » en gris ;
  - triage `DONNEES_INSUFFISANTES` → MAINTENANT en gris, jamais en vert.
- Composants et couleurs de `src/ui/` et `tokens.ts` (Walid) ; étiquettes de provenance sur chaque bloc.

## Phase 3 — dim. 00:00 : page Raisonnement (`feature/ahmed-reasoning`)
`src/pages/reasoning/Reasoning.tsx` : `useParams().id` → `explain(id)`.
- Chaîne verticale **DONNÉE → MODÈLE → NORME → DÉCISION**, un maillon par `ReasoningStep` : icône par `kind`, texte, badge `[NASA V1 4027]`, `[Publié]`, `[H]` ou `[Persona]`.
- Source cliquable. Pour une norme NASA, `getStandard(id)` affiche la **citation en ligne**, le lien externe vient en second (démo hors ligne) et la mention « non vérifié » apparaît si `verified: false`.
- Bloc « Limite » pour les étapes `[H]` (écart d'âge = équivalent en années, perte partiellement réversible).
- `id` inconnu → page « Raisonnement introuvable » + retour à la War Room.

## Phase 4 — dim. 03:00 : API locale + Raccourci montre (`feature/ahmed-api`)
- **`server/api.ts`** : plugin Vite `solZeroApi()` qui branche le **même middleware** dans `configureServer` **et** `configurePreviewServer`. Le build de démo tourne en `npm run preview`.
  - `GET /api/todo` → `TodoItem[]` ;
  - `POST /api/todo` (ajout) → remplace la liste, utilisé par `pushTodo` ;
  - `POST /api/todo/:id/done` → `{ ok, id }` ;
  - `POST /ingest` → corps plat `{type, value, unit, date}`, validé, `source: 'apple-watch-live'` ;
  - `GET /ingest/latest?type=` → dernière mesure, ou 404.
  - État en mémoire, persisté dans `server/.data/state.json` (ignoré par git) pour survivre à un redémarrage.
  - Handlers en fonctions pures, testées sans serveur.
  - @Walid : enregistrer `solZeroApi()` dans `vite.config.ts` + `server.host: true` / `preview.host: true`.
- **`src/ingest/todoSync.ts`** : `pushTodo` = POST `/api/todo` ; `pullDone` = GET `/api/todo` → ids cochés.
  - La War Room pousse la to-do au chargement, puis interroge le serveur toutes les 3 s. Un item coché sur la montre se coche alors à l'écran.
  - En cas d'échec, on reste silencieux et on garde l'état local.
- **`src/ingest/live.ts`** : `latestLive(type)` = GET `/ingest/latest`, avec un délai max de 2 s ; renvoie `null` en cas d'échec.
- **Raccourci « SOL ZÉRO — To-do »** (exécutable sur la montre) : GET `/api/todo` → « Choisir dans la liste » (items non cochés) → POST `/done` → notification.
- Raccourcis exportés en `.shortcut` + captures + IP à régler, dans `server/shortcuts/README.md`.
- **Timebox : dim. 09:00.** Si ce n'est pas fiable, la to-do passe sur l'iPhone.

## Phase 5 — dim. 08:00 : mesure en direct + mode secours + branchement
- **Raccourci « SOL ZÉRO — Mesure »** (sur iPhone) : « Rechercher des échantillons Santé » (dernière FC et dernière SpO₂) → POST `/ingest`.
  - En démo : mesure SpO₂ lancée sur la montre (app Oxygène sanguin), puis le raccourci.
- **Widget « Mesure en direct »** (War Room) : `latestLive` comparé à `getRealBaseline` (écart en σ).
  - Repli 1 : « dernière mesure enregistrée » (export).
  - Repli 2 : **saisie manuelle** (`source: 'manual'`).
  - Étiquette RÉEL — NON NASA.
- Remplacement des mocks par les vrais `planDay`, `triage`, `router` et `explain` de Mouad dès qu'ils sont sur `develop` (les imports ne changent pas, le contrat est le même).

## Phase 6 — dim. 13:00 : finitions
Cas vides partout, aucun vert par défaut, étiquettes, filages en mode avion (sans serveur, puis avec), `status/ahmed.md` à jour. Après 14:00 : `hotfix/*` uniquement.

## Fichiers (tous dans le périmètre d'Ahmed)
- `src/ingest/` : `healthExport.ts`, `baseline30d.ts`, `live.ts`, `todoSync.ts`, `checkin.ts`, `realData.ts` (ajout)
- `src/pages/warroom/` : `WarRoom.tsx`, `CheckInCard.tsx`, `NowNextCard.tsx`, `TodoList.tsx`, `LiveWidget.tsx`
- `src/pages/reasoning/Reasoning.tsx`
- `server/` : `api.ts`, `handlers.ts`, `shortcuts/`
- `scripts/parse-health.ts` : à faire valider (le dossier `scripts/` est partagé)
- `tests/ingest/`, `tests/api/`
- Utilisés sans modification : `src/types.ts`, `src/ui/tokens.ts` (Walid) ; `src/models/*`, `src/sim/load.ts` (Mouad) ; `src/content/*` (Steve).

## Risques
- **Réseau montre → Mac :** le Wi-Fi du Grand Palais peut isoler les appareils entre eux, et le mode avion coupe le partage de connexion. On le teste dès la phase 0. Plan B : la to-do sur l'iPhone, la mesure via l'export (règle de coupe §4).
- **Raccourcis sur la montre :** « Rechercher des échantillons Santé » ne tourne que sur l'iPhone. Le raccourci de mesure se lance donc depuis l'iPhone ; seul celui de la to-do tourne sur la montre.
- **Données personnelles** du présentateur : ni `export.xml` ni le JSON dérivé ne vont dans le repo ; consentement explicite.

## Vérification
- `npm test` : parseur (frontières de morceaux, SpO₂, sommeil), baseline, checkin, handlers de l'API.
- Le vrai `export.xml` est parsé dans l'app : progression visible, l'UI ne gèle pas, compte des mesures par type.
- `npm run build && npm run preview` en mode avion : War Room → check-in → MAINTENANT change → « Pourquoi ? » → Raisonnement avec la norme citée.
- `curl -X POST localhost:4173/ingest -d '{"type":"OxygenSaturation","value":98,"unit":"%","date":"..."}'` → le widget se met à jour. Le raccourci coche un item → la War Room le coche en moins de 3 s.
