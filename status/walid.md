# Status — Walid (A)
_Mis à jour : sam. 14 nov. 21:00_

## Prêt en local — PAS ENCORE POUSSÉ sur origin/develop
> Tout ce qui suit est sur la branche `develop` LOCALE (commits WIP + arbre de travail). `origin/develop` n'existe pas encore : rien n'est « livré » au sens de la
> ROADMAP §3 tant que le commit + `git push -u origin develop` ne sont pas faits (puis develop = branche par défaut sur GitHub).
> Avant de pousser : vérifier que `feature/steve-models` ne contient pas déjà `public/models/manifest.json` (Steve possède `public/models/`).

- **Bootstrap** (ROADMAP §5) : scaffold Vite + React + TS, `src/types.ts` (§6), design tokens `src/ui/tokens.ts`.
- **Tous les stubs de §7**, signatures exactes, chacun une simple délégation vers `src/mocks/` :
  `src/sim/load.ts`, `src/models/{bioAge,band,aerobic,bone,radiation,phenoAge,trend,alerts,triage,router,planDay,explain}.ts`,
  `src/ingest/{healthExport,baseline30d,live,todoSync,checkin}.ts`, `src/content/{library,summaries,standards,horizons}.ts`,
  `server/api.ts`, `public/models/manifest.json`, pages `WarRoom.tsx` et `Reasoning.tsx` (niveau stub).
- **Mocks** (`src/mocks/`, déterministes, graine fixe) : Haddad 42 ans, J0 → J94 mesuré, projection jusqu'à J860.
  Hanche 1,99 % à J94 → 8,70 % (rythme) / 4,22 % (plan) à J860 · VO₂ −10,84 % à J94, Sol 0 : 36,5 / 37,3 ·
  PhenoAge 43,1 à J91 · délai radio 11,01 min le 2026-11-14 · 4 alertes AMBRE à J94 (hanche, cuisse, cœur/VO₂, nerf optique).
- **Tests de contrat** : `tests/mocks.contract.test.ts`, `tests/manifest.test.ts` (verts, 45 tests).

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

## Page Body — premier jet (sam. 14 nov. 14:25) — en local, pas encore poussé
- **Composition « Cyberware »** (`src/pages/body/Body.tsx` + `Body.css`) : en-tête · [sang + SpO₂] | corps 3D | [calques + alertes] · timeline ;
  fenêtre organe en modale. Tient sans défilement de page de 1280×720 à 1920×1080.
- **Scène 3D** (`src/three/`) : corps de secours **procédural** (aucun asset externe), 6 calques, matériau hologramme,
  balayage du scan, corps fantôme en projection, warnings hexagonaux, survol / épinglage / double-clic.
- **Panneaux** (`src/pages/body/panels/`) : Header (PhenoAge [Publié]), LayersPanel, AlertsPanel, BloodPanel, Spo2Widget,
  HoverCard, LeaderLines, Timeline (J0 → J860, rythme actuel / avec le plan), OrganWindow (3D isolée + synthèse + graphe pointillé).
- **Design system** `src/ui/` (Panel, Label, TagBadge, ProvenanceBadge, StatusDot/Chip, HatchBand, Sparkline, fmt…).
- **Garde-fou** : si WebGL tombe, la scène affiche un panneau gris « 3D INDISPONIBLE » ; le reste de la page marche.
- `server/api.ts` est **branché** dans `vite.config.ts` (`/api/todo`, `/ingest` — `npm run dev` seulement, pas `vite preview`).
- Vert : `npm run build` (tsc -b + vite), `npm test` (43 tests), 0 erreur console sur /body, /warroom, /reasoning/:id.

## Passe de revue n° 1 (sam. 15:10) — ce qui a changé
**3D / composition**
- Corps plus grand (caméra `look.camera`), plaques de warning plus grandes et lisibles (184×50, titre 13 px).
- **Un seul système de traits** : au repos, seul le trait plaque → marqueur reste. Le trait carte d'alerte → organe n'apparaît
  que si la carte est survolée ou l'organe épinglé, et jamais depuis une carte à moitié rognée.
- La carte de survol se pose **du côté opposé à la plaque** de l'organe, masque les plaques qu'elle recouvre, ne passe plus sur l'aide.
- Calque **cardio** : seule la crosse de l'aorte prend la couleur de statut (`PartDef.tintWeight`, `look.status.peripheral`) ;
  le reste du réseau reste neutre. Vue « tous calques » : plus de corps entièrement orange (teinte, bloom et seuil réduits).
- Calque **muscles** : ventres dessinés par leur liseré ; **nerveux** : nerfs épaissis (×1,6) et plus lumineux.
- Calque **exposition** : vraie carte à 5 paliers de **luminance** (la couleur reste réservée aux statuts) + légende dans la scène,
  étiquetée « carte illustrative [H] » (la répartition sur le corps est inventée ; seule la dose globale est une donnée).
- **Balayage** : plan plus petit, bande bleutée (plus de blanc brûlé), traîne sous le plan.
- **Bassin** refait (sacrum triangulaire, trous sacrés, symphyse, trou obturé) ; fenêtre organe recadrée ; silhouette « corps entier » visible.
- Typo : plus aucun texte sous 10 px ; listes défilantes avec fondu bas ; en-tête à blocs de largeur fixe (ne saute plus avec le jour).

**Honnêteté des étiquettes**
- **PhenoAge** : `PhenoAgeResult.mock?: boolean` (ajout §6). Tant que le stub répond, l'écran affiche `[Publié] FACTICE`,
  « FORMULE NON CALCULÉE », et le tableau s'appelle « ENTRÉES DE LA FORMULE (NON ENCORE CALCULÉE) ».
- **Os** : la scène, la carte de survol, le panneau calques et la fenêtre organe disent tous « ESTIMÉ PAR MODÈLE [H] — PAS LE SCANNER ».
  La colonne tendance devient « PENTE MODÈLE » ; la perte cumulée et la projection J860 n'ont plus de pseudo-tendance ;
  la ligne de projection est grise avec une étiquette `PROJ.` (plus de rouge dans « du jour »).
- **Synthèse** : badge SIMULÉ + « TEXTE GABARIT (MOCK) » tant que `SUMMARY_SOURCE === 'gabarit'` (`src/content/summaries.ts`) ;
  pour un jour futur : « SYNTHÈSE DE PROJECTION — PAS UN MESSAGE REÇU [H] ».
- **Écart d'âge** : `hasBioAgeModel(organId)` (`src/models/bioAge.ts`) — reins, sang, yeux, dose affichent « ÉCART NON MODÉLISÉ », plus « +0,0 ».
- **Délai radio** : `lightTimeSource(date)` (`src/content/horizons.ts`) — `[Publié]` seulement pour la date tabulée, sinon
  `≈ … MIN [H] APPROX.` ; War Room : plus de « RÉEL — NASA JPL HORIZONS » tant que `horizons.json` n'est pas branché.
- **Seuils** : valeur et seuil étiquetés séparément (`[NASA V1 4027]` sur le seuil osseux ; `[H]` sur les seuils inventés : FE, muscle, gaine, SpO₂ 95 %).
- **Compteurs** : `sang` ne compte plus le VO₂max du cœur (4 ambre = 4 alertes) ; en-tête « 11 SUIVIS + 3 NON MODÉLISÉS » ;
  ligne REINS = calcium urinaire (plus de « 0,00 » sans unité) ; Sol 0 / J860 / phase étiquetés `[Persona]` ;
  widget montre : référence personnelle 30 j (`baseline30d`) + étiquette `[Persona]` sur les constantes.

## Passe de revue n° 2 (sam. 16:25) — ce qui a changé
**Cassé → réparé**
- **Survol : moitié du corps effacée** — cause trouvée et reproduite : un bloc DOM 100 % opaque *animé* au-dessus du canevas WebGL
  est pris pour un occulteur par le compositeur de Chromium (la zone qu'il traverse reste noire). La carte de survol n'a plus
  d'animation de transform, plus de `will-change` / `backdrop-filter`, et un fond à 96 %. Vérifié en rendu logiciel ; **à revérifier sur le portable de démo**.
- **React #185 en maintenant ← / →** : `useLingering` (Warnings3D) ne fait plus de `setState` à chaque jour, seulement quand un warning disparaît.
  Test ajouté au script de captures (« 160 × ArrowRight sans exception »).
- **« AVEC LE PLAN » pilote maintenant toute la page** : corps 3D, plaques, calques, alertes, en-tête, carte de survol, ruban de la timeline,
  synthèse de la fenêtre organe. Un seul point d'accès : `useDayBody()` / `useDayAlerts()` / `scenarioBody()` dans `src/pages/body/store.ts`.
  Règle : un jour MESURÉ (≤ J94) ne change jamais avec le scénario (l'alerte du jour ne disparaît pas en cochant le plan).
- **Fenêtre « corps entier » en 1280×720** : ne dépasse plus de l'écran.

**3D / composition**
- **Carte de survol / épinglée** posée HORS de la silhouette (`CLEAR_M` dans HoverCard.tsx), suivi indépendant du framerate ;
  organe épinglé : la caméra se rapproche sans centrer l'organe (`look.camera.focusPull`), sa plaque s'efface (la carte la remplace),
  la teinte des autres organes s'éteint à moitié.
- **Balayage** : le scan « reconstruit » le corps (calques internes masqués au-dessus du plan, `look.scan.hideInner`), libellé `SCAN 042 %` qui suit l'anneau.
- **Muscles** : repère de profondeur par calque (`look.depthCue`) — la moitié du corps opposée à la caméra s'efface, la vue ne se lit plus « de dos » ;
  pectoraux et abdominaux redessinés ; paravertébraux en deux fuseaux continus.
- **Exposition** : champ lisse et symétrique, 5 paliers linéaires, plus de lignes de balayage sur la carte ; légende agrandie.
- **Règle verticale** passée à droite du corps (ne traverse plus les étiquettes) ; traits des plaques : horizontale puis coude côté plaque (zéro croisement).
- **Calque seul** : enveloppe plus lisible (`look.shell.opacityOneLayer`), organes gris « non modélisés » visibles.
- **Organe isolé** : liseré seul, plus d'aplat strié ni de blanc brûlé (`VIEW` dans OrganViewer.tsx), socle réduit.
- **Panneau CALQUES** : les 6 bascules sont toujours visibles (grille 2 × 3 en tête) ; dessous, le détail des seuls calques actifs.
- **1280×720** : l'aide de la scène passe en infobulle, la caméra recule un peu (`look.camera.fitPadPx`), l'en-tête ne déborde plus.
- **Timeline** : lecture en 20 s quel que soit le framerate ; `Espace` = lecture / pause.

**Ajouts hors contrat (non cassants)** : `alertsForDayPlan(day, adherence)` (models/alerts.ts), `getSummaryPlan(organId, day, adherence)`
(content/summaries.ts), `bodyAxis` / `scanState` / `scenarioBody` / `useDayBody` / `useDayAlerts` (store.ts), `look.depthCue`, uniforms `uDepthCue`, `uScanHide`.

## Comment juger et itérer (workflow de revue)
1. **Regarder** : `status/shots/*.png` (24 états nommés + test clavier) + `status/shots/report.json` (erreurs console par page, FPS indicatif).
2. **Régler** — un seul fichier par sujet :
   | Quoi | Où |
   | :-- | :-- |
   | Tous les réglages visuels 3D (opacités, fresnel, lignes de balayage, bloom, caméra, fantôme, scan) | `src/three/look.ts` |
   | Couleurs et typos (seule source ; aucun hex ailleurs) | `src/ui/tokens.ts` |
   | Warnings 3D (taille, portée des plaques) | `src/three/warnings/knobs.ts` |
   | Cadrage de l'organe isolé (fenêtre organe) | `VIEW` en tête de `src/three/OrganViewer.tsx` |
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
- ~~Vrais modèles Z-Anatomy~~ ✅ branchés par Steve (`src/three/zanatomy.ts`), repli sur le corps procédural.

## Bloqué / risques
- ✅ **`DAY_SOL0 = 210` confirmé** par Mouad (fiche alignée par Steve).
- VO₂max pré-vol : **44 ml/kg/min** dans le simulateur de Mouad (référence) ; les mocks gardent 45,0 mais ne sont plus lus par les pages.
- ✅ Normes vérifiées par Steve dans la Rév. C (`public/data/nasa/standards.json`, `verified: true`).
- Repères [H] inventés pour les mocks, à sourcer : muscle (ambre −4 % ou pente ≤ −0,8 %/sem, rouge −10 %),
  gaine du nerf optique (ambre 5,5 mm, rouge 6,0 mm), calcium urinaire (ambre 280, rouge 350 mg/24 h), dose (ambre 450, rouge 600 mSv).
- **FPS non vérifié sur un vrai GPU** : ~3,5 img/s en rendu logiciel (SwiftShader, sans GPU) dans les captures ;
  ~147 000 triangles, bloom actif. À mesurer sur le portable de démo ; leviers dans `look.ts` (`bloom.enabled`, `maxDpr`).
- Crédits Z-Anatomy affichés dans la page Body et dans le README (licence CC BY-NC-SA 4.0, usage hackathon).
- **Délai radio** : `lightTimeMin` n'est exact que pour le 2026-11-14 (11,01 min) ; les autres dates sont une approximation
  d'orbite circulaire — désormais affichée `≈ … [H] APPROX.` (voir `lightTimeSource`). Reste à brancher `horizons.json` (Steve).
- **PhenoAge** : interpolation factice, pas encore la formule de Levine 2018 — affiché « FACTICE » à l'écran (`mock: true`).
  Mouad : renvoyer `mock: false` (ou omettre le champ) dès que la formule est calculée, le marqueur disparaît tout seul.
- **Défauts visuels connus après la passe n° 2** : proportions de l'enveloppe (bras courts, mains et pieds sommaires, tête sans visage) ;
  bassin isolé encore stylisé (sacrum plat) ; cœur isolé peu détaillé ; vue « tous calques » laiteuse quand l'exposition est active ;
  le balayage passe aussi sur le squelette (qui n'est pas scanné) ; calque nerveux sans lignes sommeil / humeur (renvoi vers la montre).
- Avertissement console tiers, sans effet : `THREE.Clock deprecated` (émis par @react-three/fiber 9 avec three 0.187).
- Bundle JS de 1,86 Mo (526 Ko gzip), pas de découpage ; sans conséquence en démo locale.
- Panneau CALQUES : les 6 bascules sont fixes ; avec 4 calques ou plus (ou en 720p), le DÉTAIL sous les bascules défile.
- J860 « avec le plan » reste ROUGE au total : la dose cumulée (802 mSv) dépasse le repère 600 mSv [H] dans les deux scénarios.

## Demandes aux autres
- @Mouad, @Steve : ajouts hors contrat (dont `alertsForDayPlan`, `getSummaryPlan` — passe n° 2) à reprendre dans vos modules quand vous remplacez les stubs —
  `hasBioAgeModel(organId)` (bioAge.ts), `lightTimeSource(date)` (horizons.ts), `SUMMARY_SOURCE` (summaries.ts), et le champ `PhenoAgeResult.mock?`.
- @Mouad : confirmer `DAY_SOL0` et le VO₂ pré-vol ; dire si `getDayBody(day > 94)` doit rester « rythme actuel »
  (ajout hors contrat disponible : `getDayBodyPlan(day, adherence)` dans `src/sim/load.ts`).
- @Steve : vérifier les 3 normes dans le PDF NASA-STD-3001 Rév. C et passer `verified: true` ; noms de fichiers `.glb`
  attendus dans `public/models/manifest.json` (placeholder) ; coefficients PhenoAge (Levine 2018).
- @Ahmed : `todoSync` et `checkin` sont en mémoire (aucun appel réseau) ; `server/api.ts` répond déjà aux 4 routes.

## Réponse à Mouad (PR n°9) — sam. 19:55
- **PR n°9 fusionnée dans `develop`** (triage, router, planDay, explain réels).
- **En-tête Body** : « ÂGE SANGUIN 44,6 ANS · MODÈLE D'IA, NHANES [H] » sous PhenoAge (`bloodAgeSeries()`, dernier prélèvement ≤ jour affiché).
- **Fenêtre organe hanche / cuisse / cœur** : barre p10–p90 + médiane du modèle B (`organForecast`) à Sol 0 (J210) et J860, pour le scénario affiché,
  convertie en âge équivalent (`lossToYears`) sur le graphe ; valeurs en % de perte sous le graphe.


## Réponses aux demandes — sam. 21:00 (branche `feature/walid-requests`)
- **@Steve** ✅ `ModelManifest` : ajout de `avatar?: string` et `extraNodes?: Record<string, string[] | string>` dans `src/types.ts` (non cassant).
  `ZAnatomyManifest` peut maintenant être remplacé par `ModelManifest` (laissé tel quel, il reste compatible).
- **@Steve** ✅ crédits : README mis à jour avec la liste complète de `public/models/CREDITS.md` (modifiés, CC BY-NC-SA 4.0, non commercial).
- **@Steve** ✅ `horizons.json` : vraies données JPL Horizons poussées par Mouad (PR #11), plus de calcul provisoire.
- **@Mouad** ✅ panneau sang vérifié avec `getAnalyteMeta` : unités SI lues dans tes données. Correction : `urine_ctx` (quotidien)
  était rangé dans les prélèvements capillaires et faussait le jour du « prélèvement » → la cadence vient maintenant de `getAnalyteMeta().cadence`,
  libellé « CTX urin. », repli sur ton libellé et tes décimales pour tout nouvel analyte.
- **@Ahmed** ✅ `painZones?: OrganId[]` ajouté à `CheckIn` (`src/types.ts`) : tu peux remplacer `CheckInZones` par `CheckIn`.
- **@Ahmed** ❌ échelle 0–5 (`Score05`) : **refusée pour l'instant** — elle changerait le sens des règles R13 du triage de Mouad, le générateur
  de check-ins et les tests à quelques heures du gel. On garde humeur / fatigue / sommeil 1–5 et douleur 0–3.
- **@Ahmed** ❌ direction « Apple + SpaceX » : **refusée** — la War Room garde les tokens communs (`src/ui/tokens.ts`) pour une seule identité visuelle.
- **@Ahmed** ✅ noté : bloc « ingest » des tests de contrat sur les mocks, et les 4 lignes de `.gitignore`.
