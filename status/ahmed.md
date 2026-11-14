# Status — Ahmed (B)
_Mis à jour : sam. 19:55_

## Livré sur develop (PR `feature/ahmed`)
- **Ingest réel** (remplace les stubs, mêmes signatures) :
  - `parseHealthExport` en flux : lit **export.zip directement** ou export.xml (vrai export de 534 Mo parsé en 1,6 s, 175 Mo de RAM) ;
  - `baseline30d` (+ `zScore`), `checkin.ts`, `live.ts`, `todoSync.ts` ;
  - ajout de `realData.ts` (vraies séries de la montre du présentateur).
- **API locale montre** : `server/api.ts` + `handlers.ts`.
  - Routes : `GET/POST /api/todo`, `GET /api/todo/menu`, `POST /api/todo/:id/done|undo`, `POST /api/todo/done`, `POST /ingest`, `GET /ingest/latest`.
  - `apiPlugin` est exporté pour `vite.config.ts`. Il tourne en `dev` **et** en `preview`. L'état est sauvé dans `server/.data/` (ignoré par git).
- **Pages** : War Room (check-in, MAINTENANT/ENSUITE, to-do groupée, mesure en direct, import d'export) et Raisonnement. Les couleurs viennent uniquement de `src/ui/tokens.ts`, adaptées dans `src/pages/warroom/ui.tsx`. Les classes CSS sont préfixées `wr-`, pour ne pas toucher `global.css`.
- `scripts/parse-health.ts` → `public/data/watch/presenter.json` (local, ignoré par git). Raccourcis iOS : `server/shortcuts/README.md`.
- Tests : `tests/ingest/*`, `tests/api/*`. Suite complète : 121 tests verts, `tsc -b` et `vite build` OK.

## Livré (PR `feature/ahmed-ml`) — demandes de Mouad
- **Page Raisonnement → section « Nos modèles d'IA »** (`modelCards()`) : pour chaque modèle, titre, étiquette, apprentissage, données, chiffres clés, limites. Le modèle B affiche un tableau « erreur du modèle vs sans ML » par organe et par échéance.
- **War Room → carte « Signal d'humeur »** (`moodSignals()`) : score du jour, courbe J27 → J94, seuil 0,44, zone d'alerte. Mention « signal à regarder, jamais un diagnostic ».
- **`triage` et `planDay` recalculés à l'arrivée des vraies données montre** (`dataVersion` ajouté aux dépendances).

## Bloqué / risques
- **Node ≥ 22 obligatoire** (Vite 8, Vitest 5). Avec Node 20.15, ni `dev` ni `test` ne tournent. Sur Mac : `brew install node@22`.
- **La montre du présentateur n'a ni SpO₂, ni sommeil, ni température** : ces séries sont **SIMULÉES** (`source: 'simulated'`, étiquette SIMULÉ). Données réelles : FC de repos, VFC, VO₂max (jusqu'à déc. 2025), FC des 30 derniers jours.
- Raccourci iOS depuis l'iPhone : il faut lancer `npm run dev -- --host` (le serveur n'écoute que sur localhost par défaut).

## Demandes aux autres
- **@Walid**
  - Dans `tests/mocks.contract.test.ts`, le bloc « ingest » teste maintenant **les mocks** (`mockParseHealthExport`, `mockPushTodo`…). Les vrais modules lisent un vrai fichier et parlent à `/api`, ils ne peuvent pas passer ce test sans réseau.
  - J'ai ajouté 4 lignes à `.gitignore` : `export.zip`, `export.xml`, `public/data/watch/`, `server/.data/`. Ce sont des données de santé personnelles.
- **@Walid — check-in noté de 0 à 5** sur les 4 lignes : changement de contrat de `src/types.ts` (`Score05`), toujours demandé. **En attendant, la War Room respecte le contrat actuel** : humeur, fatigue et sommeil de 1 à 5, douleur de 0 à 3. Plusieurs zones de douleur : type local `CheckInZones` (`painZones?: OrganId[]`), à passer dans `types.ts` si tu es d'accord (ajout optionnel).
- **@Walid — direction Apple + SpaceX** pour `tokens.ts` (noir `#000`, blanc spectral `#f0f0fa`, graphite `#111113`/`#1c1c1e`, police SF, lien `#2997ff`, rayons 10/18). Si tu l'acceptes, je ne change que `src/pages/warroom/ui.tsx`.
- **@Mouad** — seuils pour `triage` / `planDay`, sur l'échelle actuelle : douleur ≥ 2 → ORANGE + tâche « Prévenir le CMO » ; douleur 3 → ROUGE ; humeur ≤ 2 et fatigue ≥ 4 → ORANGE. `planDay` peut prendre les ids de la bibliothèque de Steve comme ids de tâche (`ared-squat`, `velo-intervalles`, `menu-calcium-vitd`…) : la montre coche par id.
- **@Steve** — bien reçu : `whyText` renvoie toujours une chaîne et `hasWhy(rule)` dit si elle est documentée. Merci pour `getTest`. Je lis `lightTimeSource` pour l'étiquette du délai ([Publié] si table, [H] sinon).
