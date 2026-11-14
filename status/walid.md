# Status — Walid (A)
_Mis à jour : sam. 14 nov. 14:25_

## Livré sur develop
- **Bootstrap** (ROADMAP §5) : scaffold Vite + React + TS, `src/types.ts` (§6), design tokens `src/ui/tokens.ts`.
- **Tous les stubs de §7**, signatures exactes, chacun une simple délégation vers `src/mocks/` :
  `src/sim/load.ts`, `src/models/{bioAge,band,aerobic,bone,radiation,phenoAge,trend,alerts,triage,router,planDay,explain}.ts`,
  `src/ingest/{healthExport,baseline30d,live,todoSync,checkin}.ts`, `src/content/{library,summaries,standards,horizons}.ts`,
  `server/api.ts`, `public/models/manifest.json`, pages `WarRoom.tsx` et `Reasoning.tsx` (niveau stub).
- **Mocks** (`src/mocks/`, déterministes, graine fixe) : Haddad 42 ans, J0 → J94 mesuré, projection jusqu'à J860.
  Hanche 1,99 % à J94 → 8,70 % (rythme) / 4,22 % (plan) à J860 · VO₂ −10,84 % à J94, Sol 0 : 36,5 / 37,3 ·
  PhenoAge 43,1 à J91 · délai radio 11,01 min le 2026-11-14 · 4 alertes AMBRE à J94 (hanche, cuisse, cœur/VO₂, nerf optique).
- **Tests de contrat** : `tests/mocks.contract.test.ts`, `tests/manifest.test.ts` (verts).

## Comment lancer
```bash
npm i
npm run dev      # http://localhost:5173 → /body, /warroom, /reasoning/:id
npm test         # vitest (tests de contrat des stubs)
npm run build    # typecheck + build de prod
```

## Pour remplacer un stub (Mouad, Ahmed, Steve)
1. Ouvre ton fichier de §7 : l'en-tête dit `STUB`. Supprime le corps, garde la signature.
2. N'importe plus `src/mocks/` depuis ton module ; les pages, elles, ne changent pas.
3. `npm test` : les tests de contrat décrivent ce que les pages attendent (forme des retours, chiffres de la fiche).
   Si ton vrai modèle donne un autre chiffre que le mock, mets le test à jour dans la même PR et note-le ici.

## Page Body — premier jet (sam. 14 nov. 14:25) — PAS ENCORE COMMITÉ au moment de l'écriture
- **Composition « Cyberware »** (`src/pages/body/Body.tsx` + `Body.css`) : en-tête · [sang + SpO₂] | corps 3D | [calques + alertes] · timeline ;
  fenêtre organe en modale. Tient sans défilement de page de 1280×720 à 1920×1080.
- **Scène 3D** (`src/three/`) : corps de secours **procédural** (aucun asset externe), 6 calques, matériau hologramme,
  balayage du scan, corps fantôme en projection, warnings hexagonaux, survol / épinglage / double-clic.
- **Panneaux** (`src/pages/body/panels/`) : Header (PhenoAge [Publié]), LayersPanel, AlertsPanel, BloodPanel, Spo2Widget,
  HoverCard, LeaderLines, Timeline (J0 → J860, rythme actuel / avec le plan), OrganWindow (3D isolée + synthèse + graphe pointillé).
- **Design system** `src/ui/` (Panel, Label, TagBadge, ProvenanceBadge, StatusDot/Chip, HatchBand, Sparkline, fmt…).
- **Garde-fou** : si WebGL tombe, la scène affiche un panneau gris « 3D INDISPONIBLE » ; le reste de la page marche.
- `server/api.ts` est **branché** dans `vite.config.ts` (`/api/todo`, `/ingest` — `npm run dev` seulement, pas `vite preview`).
- Vert : `npm run build` (tsc -b + vite), `npm test` (38 tests), 0 erreur console sur /body, /warroom, /reasoning/:id.

## Comment juger et itérer (workflow de revue)
1. **Regarder** : `status/shots/*.png` (21 états nommés) + `status/shots/report.json` (erreurs console par page, FPS indicatif).
2. **Régler** — un seul fichier par sujet :
   | Quoi | Où |
   | :-- | :-- |
   | Tous les réglages visuels 3D (opacités, fresnel, lignes de balayage, bloom, caméra, fantôme, scan) | `src/three/look.ts` |
   | Couleurs et typos (seule source ; aucun hex ailleurs) | `src/ui/tokens.ts` |
   | Warnings 3D (taille, portée des plaques) | `src/three/warnings/knobs.ts` |
   | Grille de la page (largeur des colonnes, marges, bandeau projection) | `src/pages/body/Body.css` |
   | Constantes en tête de chaque panneau (`// ── Réglages`) | `src/pages/body/panels/*.tsx` |
3. **Refaire les captures** : `npm run build && npm run shots` (≈ 2 min). Filtre : `npm run shots -- 10 12` ;
   net pour les slides : `npm run shots -- --2x` ; rebuild forcé : `npm run shots -- --build`.
   Le script sert `dist/` (vite preview, port 4179), pilote Chromium via Playwright (à avoir sous la main : `npm i -D playwright`
   si absent de la machine) et éteint le serveur.
4. **Partager un état précis** : tout l'état visuel de /body est dans l'URL (mis à jour en direct, `replaceState`).

   | Paramètre | Valeurs | Effet |
   | :-- | :-- | :-- |
   | `day` | `0`..`860`, `today`, `sol0`, `end` | jour affiché (> 94 = corps fantôme projeté) |
   | `layers` | liste à virgules (`squelette,muscles,organes,cardio,nerveux,exposition`), `all`, `none` | calques actifs |
   | `organ` | id d'organe (`hanche`, `coeur`…) | organe épinglé, caméra recentrée |
   | `hover` | id d'organe | carte de survol affichée |
   | `window` | id d'organe ou `global` | fenêtre organe ouverte (`global` = PhenoAge) |
   | `plan` | `0` \| `1` | rythme actuel / avec le plan |
   | `blood` | analyte (`hemoglobine`, `crp`…) | ligne de sang dépliée |
   | `noscan` | `1` | pas de balayage au chargement (lecture seule) |

   Exemple : `/body?day=860&plan=1&window=hanche` · `/body?layers=cardio&hover=coeur&noscan=1`.

## En cours
- Itérations visuelles sur la page Body après revue des captures.
- Vrais modèles Z-Anatomy (`.glb`) à la place du corps procédural (dépend de Steve).

## Bloqué / risques
- **`DAY_SOL0 = 210` est PROVISOIRE** (`src/mocks/mission.ts`) : à confirmer avec la fiche `sol-zero-fiche-v3`.
  Les courbes VO₂ et dose des mocks suivent cette constante.
- VO₂max pré-vol fixé à **45,0 ml/kg/min** dans les mocks (cohérent avec −10,84 % et 36,5 à Sol 0) : à confirmer avec la fiche.
- Normes `V1 4027 / 4003 / 4002` : `verified: false`, le texte est un **résumé**, pas une citation du PDF.
- Repères [H] inventés pour les mocks, à sourcer : muscle (ambre −4 % ou pente ≤ −0,8 %/sem, rouge −10 %),
  gaine du nerf optique (ambre 5,5 mm, rouge 6,0 mm), calcium urinaire (ambre 280, rouge 350 mg/24 h), dose (ambre 450, rouge 600 mSv).
- **FPS non vérifié sur un vrai GPU** : ~3,5 img/s en rendu logiciel (SwiftShader, sans GPU) dans les captures ;
  ~147 000 triangles, bloom actif. À mesurer sur le portable de démo ; leviers dans `look.ts` (`bloom.enabled`, `maxDpr`).
- **Corps procédural** : stylisé, pas anatomiquement exact ; crédit Z-Anatomy affiché « à venir ».
- **Délai radio** : `lightTimeMin` n'est exact que pour le 2026-11-14 (11,01 min) ; les autres dates sont une approximation
  d'orbite circulaire, pourtant étiquetées [Publié] (en-tête Body) / RÉEL — NASA JPL HORIZONS (War Room). À trancher.
- **PhenoAge** : interpolation factice, pas encore la formule de Levine 2018 (étiqueté [Publié] : à corriger avec les coefficients).
- Avertissement console tiers, sans effet : `THREE.Clock deprecated` (émis par @react-three/fiber 9 avec three 0.187).
- Bundle JS de 1,86 Mo (526 Ko gzip), pas de découpage ; sans conséquence en démo locale.
- Panneau CALQUES : avec 3 calques dépliés il défile (plafonné à 58 % de la colonne pour laisser la place aux alertes).

## Demandes aux autres
- @Mouad : confirmer `DAY_SOL0` et le VO₂ pré-vol ; dire si `getDayBody(day > 94)` doit rester « rythme actuel »
  (ajout hors contrat disponible : `getDayBodyPlan(day, adherence)` dans `src/sim/load.ts`).
- @Steve : vérifier les 3 normes dans le PDF NASA-STD-3001 Rév. C et passer `verified: true` ; noms de fichiers `.glb`
  attendus dans `public/models/manifest.json` (placeholder) ; coefficients PhenoAge (Levine 2018).
- @Ahmed : `todoSync` et `checkin` sont en mémoire (aucun appel réseau) ; `server/api.ts` répond déjà aux 4 routes.
