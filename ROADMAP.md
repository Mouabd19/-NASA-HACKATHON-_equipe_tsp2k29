# SOL ZÉRO — Roadmap hackathon (NASA Space Apps, Grand Palais)

> **À lire par chaque membre ET par son Claude avant de toucher au code.**
> Ce fichier remplace le planning « 48 h / H0–H48 » de la fiche `sol-zero-fiche-v3` (§12) : on a en réalité **~30 h** (sam. 12:00 → dim. 18:30).
> Le contenu fonctionnel (modèles, seuils, démo, pitch) reste celui de la fiche v3.

**Repo :** https://github.com/Mouabd19/-NASA-HACKATHON-_equipe_tsp2k29
```bash
git clone https://github.com/Mouabd19/-NASA-HACKATHON-_equipe_tsp2k29.git sol-zero
cd sol-zero
```

---

## 0. Principe : on travaille en asynchrone

- **Personne n'attend personne.** Chaque module a un **contrat fixé dans ce fichier** (types §5, signatures §6). On code contre le contrat, pas contre le code des autres.
- **Des stubs dès le départ.** Le premier commit de Walid crée tous les fichiers de §6 avec des fonctions qui renvoient des **données factices** (mocks tirés de la fiche §7). L'interface marche donc tout de suite, et chacun remplace ensuite le stub de **ses propres** fichiers par la vraie implémentation.
- **Pas de réunion, des échéances.** Le planning (§2) donne pour chacun des livrables à pousser sur `develop` avant une heure donnée. Chacun gère ses repas et son sommeil.
- **Communication écrite.** Chacun tient `status/<prénom>.md` (§4). C'est là que les Claude des autres vont voir ce qui est fait, ce qui bloque et ce qui a changé.
- **Seuls moments synchrones :** les filages de dimanche après-midi (§2) et le passage devant le jury.

---

## 1. Qui fait quoi

| Rôle | Qui | Périmètre | Dossiers dont il/elle est **seul propriétaire** |
| :-- | :-- | :-- | :-- |
| **A — Interface + intégration + release** (le plus gros morceau) | **Walid** (Claude Max) | Scaffold, types, stubs, mocks ; 4 écrans ; silhouettes SVG + hachures + gris ; curseur de temps ; carte MAINTENANT/ENSUITE ; curseur lien Terre + compte à rebours ; carte d'organes + « Comparer à… » ; branchement des vrais modules à la place des mocks ; branches `release/*` et tag final | `src/App.tsx`, `src/screens/`, `src/components/`, `src/styles/`, `src/mocks/`, `src/types.ts`, `package.json`, `vite.config.ts` |
| **B — Check-in + Apple Watch** | **Ahmed** | Formulaires check-in, PVT-B, Dexie, parseur `export.xml`, référence 30 j, Raccourci iOS + `POST /ingest`, mode secours (dernière mesure / saisie manuelle) | `src/checkin/`, `src/db/`, `src/ingest/`, `server/` |
| **C — Modèles + règles + tests** | **Mouad** | `aerobic`, `bone`, `tscore`, `radiation`, `fatigue`, `baseline`, `band`, `triage` (+ Sol-routine), `router`, `gain`, `scanFit`, `coefficients.json`, générateur Haddad, **tests d'or** (fiche §11). Gère aussi les réglages du repo (collaborateurs, protection de `main`) | `src/models/`, `src/data/haddad/`, `tests/models/` |
| **D — Science, données NASA, contenus, pitch** | **Steve** | `fetch-horizons` + `lightTime`, `standards.json` (Rev C), `environments/*.json`, `organScan.json` Haddad, fiches protocole, textes « Pourquoi ? », gabarits + rendu du moi futur, jeu Inspiration4 (OSDR), diapos, script, vidéos de secours, soumission Space Apps | `scripts/`, `public/data/`, `src/nasa/`, `src/content/`, `docs/`, `pitch/` |

**Règle d'or :** on ne modifie **jamais** un fichier hors de son périmètre. Si tu as besoin d'un changement chez quelqu'un d'autre, tu l'écris dans la section « Demandes aux autres » de ton `status/<prénom>.md`, et tu continues avec le stub en attendant.

**Apple Watch :** la personne qui porte la montre pendant la démo (= le présentateur) fait l'export Santé de son iPhone (app Santé → photo de profil → Exporter toutes les données) et dépose `export.zip` dans le drive de l'équipe **avant sam. 15:00**. Ahmed travaille avec ce fichier ; en attendant, il utilise un petit `export.xml` d'exemple qu'il fabrique lui-même.

---

## 2. Échéances (heure de Paris)

Repères des orgas : déjeuner sam. 13:00 · dîner sam. 19:30 · déjeuner dim. 13:00 · **1re présentation dim. 18:30** · fin des jurys 21:30.

« Livré » = mergé dans `develop` avec les tests qui passent.

### Walid (A)
| Livré avant | Quoi |
| :-- | :-- |
| **sam. 12:45** | **Bootstrap** (§4) : scaffold Vite, `src/types.ts` copié de §5, **tous les stubs de §6**, `src/mocks/haddad.ts` (chiffres de la fiche §7), `status/` créé. **Les autres en dépendent : priorité absolue.** |
| sam. 17:00 | Les 4 écrans branchés sur les mocks ; silhouettes SVG, hachures, gris = inconnu |
| sam. 21:00 | Curseur de temps J94 → Sol 0 → J860 ; carte MAINTENANT / ENSUITE |
| dim. 02:00 | Curseur lien Terre (5 positions) + compte à rebours ; écran message au médecin (aperçu, humeur décochée) |
| dim. 08:00 | Carte d'organes (bande avant/après scan) + « Comparer à… » ; tous les modules livrés par les autres branchés à la place des mocks |
| **dim. 10:00** | **Jalon MVP** (§3) : le parcours de démo de 3 min tourne sans mock. Création de `release/1.0` |
| dim. 13:00 | Bonus selon l'ordre de §3, puis accessibilité |

### Mouad (C)
| Livré avant | Quoi |
| :-- | :-- |
| sam. 13:00 | Avant le bootstrap : réglages GitHub (collaborateurs, app Claude, protection de `main`) |
| sam. 16:00 | `coefficients.json`, `band`, `colorWithBand`, `aerobic`, `bone`, `tscore` + tests d'or correspondants |
| sam. 20:00 | `radiation`, `fatigue`, `baseline`, générateur Haddad (graine fixe) |
| dim. 00:00 | `triage` (+ Sol-routine), **`router`** + tests d'invariance (MAINTENANT identique aux 5 positions ; la distance ne baisse jamais le niveau) |
| dim. 04:00 | `gain` (vitesse de déconditionnement), `scanFit` (recalage de la bande par scan) |
| dim. 13:00 | Cas limites : donnée obligatoire expirée → `DONNEES_INSUFFISANTES`, jamais VERT |

### Ahmed (B)
| Livré avant | Quoi |
| :-- | :-- |
| sam. 16:00 | Formulaires check-in (`CheckinForm`), stockage Dexie |
| sam. 20:00 | **`parseHealthExport`** en flux sur le vrai `export.xml` du présentateur + `baseline30d` |
| dim. 00:00 | PVT-B (test de réflexes) |
| **dim. 02:00** | **Raccourci iOS + `POST /ingest` + `latestLive`** (timebox : s'il ne marche pas à **dim. 09:00**, on coupe) |
| dim. 08:00 | Mode secours : bouton « dernière mesure enregistrée » + saisie manuelle |
| dim. 13:00 | Bonus : ECG joint au message au médecin, FC au coucher |

### Steve (D)
| Livré avant | Quoi |
| :-- | :-- |
| sam. 15:00 | `scripts/fetch-horizons.ts` → `public/data/horizons.json` ; `lightTime(date)` (test : 11,01 min le 14/11/2026) |
| sam. 18:00 | `standards.json` (Rev C : id, citation, lien, `verified`) ; `environments/*.json` (1,84 / 0,64 mSv/j) |
| sam. 22:00 | Fiches protocole (MAINTENANT de chaque niveau) + textes « Pourquoi ? » |
| dim. 02:00 | Gabarits + `renderFutureSelf` ; `organScan.json` Haddad (J0 + écho cuisse J60) |
| dim. 10:00 | Storyboard + diapos v1 (5 max) ; jeu Inspiration4 trouvé (ou retiré du pitch) |
| dim. 13:00 | Script v2 chronométré ; test de l'app avec 2 personnes extérieures ; **vidéo de secours n° 1** (dès que le jalon MVP est atteint) |

### Fin commune (dimanche, seule partie synchrone)

| Heure | Quoi |
| :-- | :-- |
| **14:00** | **🧊 Gel des fonctionnalités.** Plus que des `hotfix/*` sur `release/1.0` |
| 14:00–16:30 | **10 filages en mode avion, dont 3 avec la montre.** Chacun corrige ce qui casse dans son périmètre |
| 16:30 | Walid merge `release/1.0` → `main` + tag `v1.0-demo`. Steve : **vidéo n° 2** + **soumission Space Apps** (vérifier la deadline exacte auprès des orgas dès samedi) |
| 17:00–18:00 | 2 derniers filages, build de prod local (`npm run build && npm run preview`), chargeurs |
| **18:00** | **Prêts** (on ne connaît pas notre ordre de passage) |

**Sommeil :** libre, au moins 4 h chacun. Avant de dormir : push + `status/<prénom>.md` à jour. Si les locaux ferment la nuit, on continue de chez soi.

---

## 3. MVP gelé

1. Check-in du jour.
2. Modèles corrigés (Rev C) : VO₂ (80 % / 36,5), hanche (95 %), radiation, avec bandes d'incertitude.
3. Silhouettes + curseur de temps (J94 → Sol 0 → J860), gris = inconnu.
4. Carte MAINTENANT / ENSUITE + curseur lien Terre (5 positions) + compte à rebours.
5. Import `export.xml` Apple Watch (vraie donnée du présentateur).
6. Paquet sol / message au médecin (aperçu, humeur décochée par défaut).
7. Message du moi futur (gabarits uniquement).
8. Carte d'organes avec recalage par scan (`organScan.json`).

**Hors MVP, dans l'ordre :** mesure Watch en direct → FC au coucher + corrélation → ECG joint → écran scindé → vue 3D des organes → animations.

**Règles de coupe :**
- Raccourci iOS pas fiable à **dim. 09:00** → on garde seulement l'import `export.xml`.
- Vue 3D : seulement si tout le reste est fini avant **dim. 11:00**. Par défaut : coupée.
- Rien de pas fini à **dim. 14:00** ne part en démo.
- Si un module n'est pas livré à temps, **l'interface garde le mock** et Walid affiche l'étiquette SIMULÉ : la démo ne casse jamais.

---

## 4. Gitflow et règles pour les Claude

### Branches

| Branche | Rôle | Qui y écrit |
| :-- | :-- | :-- |
| `main` | Ce qui part en démo. Tag `v1.0-demo` | Personne directement. Merge de `release/*` ou `hotfix/*` uniquement (Walid) |
| `develop` | Intégration continue | Via PR depuis `feature/*` |
| `feature/<prénom>-<sujet>` | Une feature = une branche, partie de `develop` | Son propriétaire |
| `release/1.0` | Créée au jalon MVP (dim. 10:00) | Walid (+ hotfix) |
| `hotfix/<sujet>` | Correction après le gel | Le propriétaire du fichier, PR vers `release/1.0` |

### Bootstrap (Walid, une seule fois, avant sam. 12:45)

```bash
git checkout main && git pull
git checkout -b develop
npm create vite@latest . -- --template react-ts   # garder README.md, ROADMAP.md et la fiche
npm i recharts dexie zustand
npm i -D vitest
# créer src/types.ts (§5), tous les stubs (§6), src/mocks/haddad.ts, status/{walid,mouad,ahmed,steve}.md
npm test && npm run build
git add . && git commit -m "chore: bootstrap (scaffold, types, stubs, mocks)"
git push -u origin develop
```

**Avant le bootstrap**, les autres ne restent pas bloqués : ils lisent la fiche et commencent leur code dans un dossier local, puis le recopient sur une branche `feature/*` partie de `develop` dès que celle-ci existe.

### Workflow d'une feature

```bash
git checkout develop && git pull origin develop
git checkout -b feature/mouad-bone-model
# ... remplacer le stub par la vraie implémentation, dans SON périmètre ...
npm test
git add -A && git commit -m "feat(models): bone loss + seuils Rev C 95 %"
git pull --rebase origin develop
git push -u origin feature/mouad-bone-model
gh pr create --base develop --fill
```

- **Merge** : chacun merge **sa propre PR** vers `develop` dès que les tests passent et qu'il ne touche que son périmètre. Pas besoin d'attendre une relecture.
- **Changer le contrat** (`src/types.ts` ou une signature de §6) : seulement par **ajout** (nouveau champ optionnel, nouvelle fonction), jamais en cassant l'existant. Demande à Walid via ton status ; il fait la PR.
- **Commits** : `feat(scope): …`, `fix(scope): …`, `test(scope): …`, `docs: …`, `chore: …`. Scopes : `ui`, `ingest`, `models`, `nasa`, `content`, `pitch`.
- **Petites PR, souvent** : une toutes les 1 à 2 h.

### Le fichier `status/<prénom>.md`

Chacun ne modifie **que le sien**, à chaque push :

```md
# Status — Mouad (C)
_Mis à jour : dim. 01:40_

## Livré sur develop
- aerobic, bone, band (tests d'or OK)

## En cours
- router (invariance OK, reste la conjonction)

## Bloqué / risques
- rien

## Demandes aux autres
- @Walid : ajouter `groundRoutine?: string[]` à TriageResult (ajout, non cassant)
```

### Consignes pour les Claude de l'équipe

1. Lire ce fichier, la fiche `sol-zero-fiche-v3` (seuils, modèles, tests d'or §11) et les fichiers `status/*.md` avant de coder.
2. **Ne jamais pousser directement sur `main` ni sur `develop`.** Toujours `feature/<prénom>-<sujet>` partie de `develop`, puis une PR vers `develop`.
3. Ne modifier **que** les fichiers du périmètre de ton humain (§1). Pour un autre périmètre : écrire la demande dans son status et continuer avec le stub.
4. Respecter **exactement** les types (§5) et les signatures (§6). Les autres codent contre elles en parallèle.
5. Chaque implémentation garde les mêmes exports que son stub. Ajouter des tests unitaires dans son propre dossier.
6. `git pull --rebase origin develop` puis `npm test` avant chaque push. Mettre à jour `status/<prénom>.md` dans la même PR.
7. Tout chiffre affiché porte une étiquette `[NASA]`, `[Publié]`, `[H]` ou `[Persona]` et, pour `[NASA]`, son identifiant (ex. `V1 4003`).
8. Aucun appel réseau pendant la démo : tout est pré-téléchargé dans `public/data/`.
9. Pas d'IA générative dans l'app (le moi futur = gabarits).
10. Après le gel (dim. 14:00) : uniquement des `hotfix/*`.

---

## 5. Contrat de types (`src/types.ts`, recopié tel quel au bootstrap)

```ts
export type Color = 'green' | 'amber' | 'red' | 'grey';
export type Tag = 'NASA' | 'Publié' | 'H' | 'Persona';
export type Provenance = 'RÉEL' | 'SIMULÉ' | 'H';
export type LinkPos = 'ISS' | 'Lune' | 'MarsProche' | 'MarsScenario' | 'Conjonction';
export type Level = 'VERT' | 'AMBRE' | 'ORANGE' | 'ROUGE' | 'DONNEES_INSUFFISANTES';
export type Organ = 'coeur' | 'hanche' | 'cuisse' | 'mollet' | string;

export interface Thresholds { amber: number; red: number }

export interface Projection {
  system: 'vo2' | 'hip' | 'radiation' | string;
  day: number;                  // 94, 180 (Sol 0), 860
  value: number;
  band: [number, number];
  color: Color;
  worst: Color;                 // couleur du pire cas de la bande
  standardId?: string;          // ex. 'V1 4003'
  tag: Tag;
}

export interface Measurement {
  type: 'RestingHeartRate' | 'HeartRateVariabilitySDNN' | 'VO2Max'
      | 'AppleSleepingWristTemperature' | 'SleepAnalysis' | 'HeartRate';
  value: number;
  unit: string;
  date: string;                 // ISO 8601
  source: 'apple-watch-export' | 'apple-watch-live' | 'manual' | 'simulated';
}

export interface Baseline { type: Measurement['type']; mean: number; sd: number; n: number }

export interface Checkin {
  date: string;
  day: number;                  // jour de mission
  sleepHours?: number;
  pvtMeanMs?: number;
  phq2?: number;                // 0–6
  systolic?: number; diastolic?: number;
  tempDelta?: number;           // écart à la référence de vol, °C
  symptoms: ('douleur_thoracique' | 'essoufflement' | 'malaise' | 'palpitations')[];
  exerciseDone: boolean;
}

export interface MissionState {
  persona: 'haddad' | 'presentateur';
  day: number;
  preVO2: number;
  adherence: number;            // 0..1
  checkins: Checkin[];
  measurements: Measurement[];
  doseLog: { date: string; mSv: number }[];
  scans: OrganScan[];
}

export interface TriageResult {
  level: Level;
  reasons: string[];            // règles déclenchées, ex. 'R13'
  groundRoutine: string[];      // ex. ['hipJ860'] → niveau « Sol-routine »
}

export interface RouterOutput {
  maintenant: string;           // NE DÉPEND JAMAIS de LinkPos
  ensuite: { decideur: 'moi' | 'CMO' | 'sol' | 'equipage'; reponseMin?: number; texte: string };
  echeance?: string;
}

export interface OrganScan {
  organ: Organ; volume?: number; composition?: Record<string, number>;
  date: string; day: number; device: string; uncertainty: number;
}

export interface Standard { id: string; title: string; quote: string; url: string; verified: boolean }

export interface GroundPacket {
  createdAt: string; level: Level; rule: string;
  measurements: Measurement[]; trend?: string; ecgAttached: boolean;
  includeMood: boolean;         // false par défaut
  arrivalAt: string; earliestReplyAt: string;
}
```

---

## 6. Signatures des modules (les stubs du bootstrap)

Chaque fichier existe dès le bootstrap avec cette signature et un retour factice. Son propriétaire le remplace par la vraie implémentation **sans changer la signature**.

| Fichier | Propriétaire | Export(s) |
| :-- | :-- | :-- |
| `src/models/band.ts` | Mouad | `colorWithBand(value: number, band: [number, number], t: Thresholds): { color: Color; worst: Color }` |
| `src/models/aerobic.ts` | Mouad | `projectVO2(s: MissionState, day: number): Projection` · `vo2Absolute(p: { pre: number; deficit: number }): number` |
| `src/models/bone.ts` | Mouad | `projectHip(s: MissionState, day: number): Projection` · `boneLossColor(loss: number, band: [number, number], t: Thresholds): { color: Color; worst: Color }` |
| `src/models/tscore.ts` | Mouad | `tScore(lossPct: number): number` |
| `src/models/radiation.ts` | Mouad | `radiationStatus(s: MissionState): Projection` · `missionDose(): number` |
| `src/models/fatigue.ts` | Mouad | `fatigueLevel(checkins: Checkin[]): Level` |
| `src/models/baseline.ts` | Mouad | `flightBaseline(ms: Measurement[], type: Measurement['type']): Baseline` |
| `src/models/triage.ts` | Mouad | `triage(s: MissionState): TriageResult` |
| `src/models/router.ts` | Mouad | `router(t: TriageResult, pos: LinkPos, delayMin: number): RouterOutput` |
| `src/models/gain.ts` | Mouad | `decondSpeed(organ: Organ, adherence: number): number` |
| `src/models/scanFit.ts` | Mouad | `fitScan(p: Projection, scan: OrganScan): Projection` |
| `src/data/haddad/generate.ts` | Mouad | `haddadState(day?: number): MissionState` |
| `src/ingest/healthExport.ts` | Ahmed | `parseHealthExport(file: File, onProgress?: (pct: number) => void): Promise<Measurement[]>` |
| `src/ingest/baseline30d.ts` | Ahmed | `baseline30d(ms: Measurement[], type: Measurement['type']): Baseline` |
| `src/ingest/live.ts` | Ahmed | `latestLive(): Promise<Measurement | null>` (lit ce que `server/ingest.ts` a reçu) |
| `src/db/index.ts` | Ahmed | `saveCheckin(c: Checkin): Promise<void>` · `listCheckins(): Promise<Checkin[]>` · `saveMeasurements(ms: Measurement[]): Promise<void>` |
| `src/checkin/CheckinForm.tsx` | Ahmed | `export function CheckinForm(p: { onSubmit: (c: Checkin) => void }): JSX.Element` |
| `src/checkin/PvtB.tsx` | Ahmed | `export function PvtB(p: { onDone: (meanMs: number) => void }): JSX.Element` |
| `server/ingest.ts` | Ahmed | Plugin Vite : `POST /ingest` (objet plat `{type, value, unit, date}`) et `GET /ingest/latest` |
| `src/nasa/horizons.ts` | Steve | `lightTimeMin(date: string): number` (lit `public/data/horizons.json`) · `conjunctionPeriods(): { start: string; end: string }[]` |
| `src/content/standards.ts` | Steve | `getStandard(id: string): Standard` (lit `standards.json`) |
| `src/content/protocols.ts` | Steve | `maintenantFor(level: Level, reasons: string[]): string` |
| `src/content/futureSelf.ts` | Steve | `renderFutureSelf(ps: Projection[], delayMin: number): string` |
| `src/content/packet.ts` | Steve | `buildGroundPacket(s: MissionState, t: TriageResult, delayMin: number, opts: { includeMood: boolean; ecg: boolean }): GroundPacket` |

**Note :** `router` (Mouad) appelle `maintenantFor` (Steve) pour le texte de MAINTENANT. Les deux codent contre la signature : pas besoin de se coordonner.

### Mocks (`src/mocks/haddad.ts`, Walid)

Valeurs de la fiche §7, pour que l'interface soit juste avant même que les modèles existent :
- VO₂ Sol 0 : 36,5 (35,0–38,1) au rythme actuel, 37,3 (35,9–38,8) avec le plan.
- Hanche J860 : perte 8,70 % (6,84–10,36) au rythme actuel, 4,22 % (3,32–5,02) avec le plan.
- Délai radio J94 : 7,2 min [Persona] ; 14/11/2026 : 11,01 min [NASA].
- Triage J94 : ORANGE, `groundRoutine: ['hipJ860']`.

---

## 7. Arborescence

```
src/
  types.ts, App.tsx, screens/, components/, styles/, mocks/   # Walid
  models/, data/haddad/                                        # Mouad
  checkin/, db/, ingest/                                       # Ahmed
  nasa/, content/ (standards.json, templates/, protocols/)     # Steve
server/ingest.ts                                               # Ahmed
scripts/fetch-horizons.ts                                      # Steve
public/data/ horizons.json, environments/*.json, organScan.json  # Steve
tests/models/ (Mouad) · tests/ingest/ (Ahmed) · tests/content/ (Steve) · tests/ui/ (Walid)
status/walid.md, mouad.md, ahmed.md, steve.md                  # chacun le sien
docs/ (fiche, ROADMAP.md) · pitch/                             # Steve
```

---

## 8. Définition de « fini » (avant de merger dans `develop`)

- [ ] Signature identique au stub de §6.
- [ ] Les tests d'or de la fiche §11 qui concernent ta feature passent.
- [ ] Les chiffres correspondent à la fiche §7 (VO₂ Sol 0 : 36,5 / 37,3 ; hanche J860 : 8,70 % / 4,22 %).
- [ ] Marche **sans réseau**.
- [ ] Aucun vert par défaut quand la donnée manque.
- [ ] `status/<prénom>.md` à jour.

---

## 9. Checklist démo (dimanche 17:00)

- [ ] `main` taggé `v1.0-demo`, build de prod local qui tourne en mode avion.
- [ ] Export Santé du présentateur chargé ; plan B « dernière mesure enregistrée » testé.
- [ ] App Fréquence cardiaque ouverte sur la montre juste avant le passage.
- [ ] Vidéos de secours n° 1 et n° 2 sur 2 ordinateurs + une clé USB.
- [ ] Diapos (5 max) + script chronométré à 3:00.
- [ ] Soumission Space Apps faite (lien du repo + vidéo).
- [ ] Chargeurs, adaptateur HDMI/USB-C testés.
