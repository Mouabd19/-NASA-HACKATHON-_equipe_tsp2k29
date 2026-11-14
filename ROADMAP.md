# SOL ZÉRO — Roadmap hackathon (NASA Space Apps, Grand Palais)

> **À lire par chaque membre ET par son Claude avant de toucher au code.**
> Ce fichier remplace le planning « 48 h / H0–H48 » de la fiche `sol-zero-fiche-v3` (§12) : on a en réalité **~32 h** (sam. 10:00 → dim. 18:30).
> Le contenu fonctionnel (modèles, seuils, démo, pitch) reste celui de la fiche v3.

**Repo :** https://github.com/Mouabd19/-NASA-HACKATHON-_equipe_tsp2k29
```bash
git clone https://github.com/Mouabd19/-NASA-HACKATHON-_equipe_tsp2k29.git sol-zero
cd sol-zero
```
Mouad (propriétaire du repo) doit ajouter Ahmed, Walid et Steve en **collaborateurs** (Settings → Collaborators) pour qu'ils puissent push.

---

## 1. L'équipe et qui fait quoi

| Rôle (fiche v3) | Qui | Périmètre | Dossiers dont il/elle est **propriétaire** |
| :-- | :-- | :-- | :-- |
| **A — Interface + intégration** | **Mouad** | Squelette Vite/React, 4 écrans, silhouettes SVG, curseur de temps, carte MAINTENANT/ENSUITE, curseur « lien Terre », carte d'organes. **Release manager gitflow** (merge `develop`, branches `release/*`, tags) | `src/components/`, `src/screens/`, `src/App.tsx`, `src/styles/`, `package.json`, `vite.config.ts` |
| **B — Check-in + Apple Watch** | **Ahmed** | Formulaires check-in, PVT-B, Dexie, parseur `export.xml`, référence 30 j, Raccourci iOS + `POST /ingest`, mode secours (dernière mesure / saisie manuelle) | `src/ingest/`, `src/db/`, `src/checkin/`, `server/` |
| **C — Modèles + règles + tests** | **Walid** | `aerobic`, `bone`, `tscore`, `radiation`, `fatigue`, `baseline`, `band`, `triage` (+ Sol-routine), `router`, `gain` (vitesse de déconditionnement), recalage par scan, générateur Haddad, **tests d'or** | `src/models/`, `src/data/haddad/`, `tests/` |
| **D — Science, données NASA, pitch** | **Steve** | `fetch-horizons`, `standards.json` (Rev C), `environments/*.json`, `coefficients.json` (avec C), fiches protocole, textes « Pourquoi ? », gabarits du moi futur, `organScan.json` Haddad, jeu Inspiration4 (OSDR), diapos, script, vidéos de secours, soumission Space Apps | `scripts/`, `public/data/`, `src/content/` (`standards.json`, `templates/futureSelf.json`, `protocols/`), `docs/`, `pitch/` |

> Rôles modifiables au kickoff. **Contrainte** : celui/celle qui porte l'Apple Watch pendant la démo doit faire l'export Santé de son iPhone dès samedi après-midi (B l'aide). Le présentateur = la personne qui porte la montre ; un autre manipule l'app.

**Règle d'or anti-conflits :** on ne modifie **pas** un fichier hors de son périmètre sans prévenir le propriétaire. Les fichiers partagés (`src/types.ts`, `package.json`) passent par une PR courte relue par Mouad.

---

## 2. Planning (heure de Paris)

Repères fixes : déjeuner sam. 13:00 · dîner sam. 19:30 · déjeuner dim. 13:00 · **1re présentation dim. 18:30** · fin des jurys 21:30 · fermeture 22:00–22:30.

### Samedi 14 novembre

| Heure | Tous | Mouad (A) | Ahmed (B) | Walid (C) | Steve (D) |
| :-- | :-- | :-- | :-- | :-- | :-- |
| **12:00–12:30** | **Kickoff** : gel du MVP (§3), gel des seuils Rev C, validation de ce fichier et du contrat `src/types.ts` (§5) | Init gitflow + scaffold Vite React-TS + push `develop` | Lister le matériel : iPhone + Watch du présentateur, partage de connexion | Écrire `src/types.ts` avec Mouad | Lancer l'export Santé sur l'iPhone du présentateur (ça prend du temps) |
| 12:30–13:00 | — | Routing des 4 écrans (vides) | Formulaires check-in (squelette) | `coefficients.json` (avec D) | `scripts/fetch-horizons.ts` → `public/data/horizons.json` |
| 13:00–13:45 | **Déjeuner** | | | | |
| 13:45–16:30 | — | Silhouettes SVG, hachures, gris = inconnu | **Parseur `export.xml` en flux** + référence 30 j | Générateur Haddad (graine fixe), `aerobic`, `bone` (seuils 80 % / 95 %) + tests | `standards.json` (id, citation, lien, `verified`), `environments/*.json` (1,84 / 0,64 mSv/j) |
| 16:30–19:00 | — | Curseur de temps J94 → Sol 0 → J860 | Dexie (stockage), PVT-B | `band`, `radiation`, `tscore`, `colorWithBand` + tests d'or | Fiches protocole + textes « Pourquoi ? » avec liens vers la norme ; chercher le jeu Inspiration4 dans OSDR |
| **19:00–19:30** | **Intégration 1** : merge des features dans `develop`, parcours Haddad brut à l'écran | Merge + correction | Branche ses écrans | Branche ses modèles | Vérifie les chiffres affichés vs fiche §7 |
| 19:30–20:15 | **Dîner** | | | | |
| 20:15–00:30 | — | **Carte MAINTENANT / ENSUITE** + **curseur lien Terre** + compte à rebours | **Raccourci iOS + `POST /ingest`** (timebox 2 h, sinon on coupe) puis mode secours | `triage` (+ Sol-routine), **`router`** + tests d'invariance (MAINTENANT identique aux 5 positions), `gain.ts` | **Gabarits du moi futur** (`templates/futureSelf.json`), `organScan.json` Haddad (J0 + écho cuisse J60), storyboard de la démo |
| 00:30 | **Point de 10 min** : état de chaque feature, décision de coupe éventuelle | | | | |

### Nuit (samedi → dimanche)

Sommeil **en roulement, 4 h minimum chacun**, pour qu'il y ait toujours quelqu'un capable de débloquer :
- **00:30–04:30** : Mouad + Steve dorment · Ahmed + Walid continuent (paquet sol, message au médecin, recalage par scan).
- **04:30–08:30** : Ahmed + Walid dorment · Mouad + Steve continuent (carte d'organes, sélecteur « Comparer à… », diapos v1).

> Si les locaux ferment la nuit, chacun dort chez soi sur les mêmes créneaux et on se retrouve à 08:45. Rien ne reste uniquement en local : **push avant de dormir.**

### Dimanche 15 novembre

| Heure | Tous | Mouad (A) | Ahmed (B) | Walid (C) | Steve (D) |
| :-- | :-- | :-- | :-- | :-- | :-- |
| 08:30–10:00 | **Intégration 2** | Merge `develop`, parcours complet | Données réelles du présentateur dans l'app | Paquet sol + message au médecin branchés | Relecture : chaque chiffre a son étiquette [NASA]/[Publié]/[H]/[Persona] |
| **10:00** | **🎯 JALON MVP** : le script de 3 min tourne de bout en bout. Mouad crée `release/1.0`. Steve enregistre la **vidéo de secours n° 1** | | | | |
| 10:00–13:00 | Bonus, **seulement si le MVP est vert** (ordre de la fiche) | Carte d'organes : bande avant/après scan, accessibilité | Mesure Watch en direct fiabilisée, ou ECG joint (bonus) | Cas limites, données expirées → « données insuffisantes », jamais VERT | Diapos (5 max), script v2, test avec 2 personnes extérieures |
| 13:00–13:45 | **Déjeuner** | | | | |
| **14:00** | **🧊 GEL DES FONCTIONNALITÉS.** Plus aucune feature. Uniquement des `hotfix/*` sur `release/1.0` | | | | |
| 14:00–16:30 | **10 déroulés en mode avion, dont 3 avec la montre.** Corrections uniquement | Hotfix UI | Hotfix ingestion / plan B montre | Hotfix modèles | Chronomètre, ajuste le script |
| 16:30 | Merge `release/1.0` → `main` + tag `v1.0-demo`. **Vidéo de secours n° 2.** **Soumission Space Apps** (vérifier la deadline exacte auprès des orgas dès samedi) | | | | |
| 17:00–18:00 | 2 derniers filages complets, chargeurs, mode avion, onglets fermés, build local de prod (`npm run build && npm run preview`) | | | | |
| **18:00** | **Prêts.** On ne connaît pas notre ordre de passage : on doit pouvoir passer à 18:30 | | | | |
| 18:30–21:30 | Jurys | | | | |

---

## 3. MVP gelé (ne change pas après le kickoff)

1. Check-in du jour.
2. Modèles corrigés (Rev C) : VO₂ (80 % / 36,5), hanche (95 %), radiation, avec bandes d'incertitude.
3. Silhouettes + curseur de temps (J94 → Sol 0 → J860), gris = inconnu.
4. Carte MAINTENANT / ENSUITE + curseur lien Terre (5 positions) + compte à rebours.
5. Import `export.xml` Apple Watch (vraie donnée du présentateur).
6. Paquet sol / message au médecin (aperçu, humeur décochée par défaut).
7. Message du moi futur (gabarits uniquement).
8. Carte d'organes avec recalage par scan (`organScan.json`).

**Hors MVP, dans l'ordre de priorité :** mesure Watch en direct (Raccourci) → FC au coucher + corrélation → ECG joint → écran scindé → vue 3D des organes → animations.

**Règles de coupe :**
- Raccourci iOS pas fiable à **dim. 09:00** → on garde seulement l'import `export.xml` (ça reste de la vraie donnée Apple Watch).
- Vue 3D : on n'y touche que si tout le reste est fini avant **dim. 11:00**. Par défaut : coupée.
- Une feature pas finie à **14:00** dimanche ne part pas en démo.

---

## 4. Gitflow — les règles (pour les humains ET les Claude)

### Branches

| Branche | Rôle | Qui y écrit |
| :-- | :-- | :-- |
| `main` | Ce qui part en démo. Toujours stable. Tag `v1.0-demo` | **Personne directement.** Seulement via merge de `release/*` ou `hotfix/*` (Mouad) |
| `develop` | Intégration continue | Via PR depuis `feature/*` |
| `feature/<prénom>-<sujet>` | Une feature = une branche, partie de `develop` | Son propriétaire |
| `release/1.0` | Créée au jalon MVP (dim. 10:00), stabilisation | Mouad (+ hotfix) |
| `hotfix/<sujet>` | Correction urgente après le gel | N'importe qui, PR vers `release/1.0` (ou `main` après 16:30) |

### Setup initial (Mouad, au kickoff)

```bash
git checkout main && git pull
git checkout -b develop
npm create vite@latest . -- --template react-ts   # accepter d'écraser si demandé, garder README
npm i recharts dexie zustand
npm i -D vitest
git add . && git commit -m "chore: scaffold Vite React-TS + deps"
git push -u origin develop
```
Puis sur GitHub : `develop` en branche par défaut ; protection de `main` (pas de push direct).

### Workflow d'une feature

```bash
git checkout develop && git pull origin develop
git checkout -b feature/walid-bone-model
# ... travail ...
npm test                       # doit passer
git add -A && git commit -m "feat(models): bone loss + seuils Rev C 95 %"
git pull --rebase origin develop   # se remettre à jour avant de pousser
git push -u origin feature/walid-bone-model
gh pr create --base develop --fill   # ou via l'interface GitHub
```

### Conventions

- **Commits** : `feat(scope): ...`, `fix(scope): ...`, `test(scope): ...`, `docs: ...`, `chore: ...`. Scopes : `ui`, `ingest`, `models`, `data`, `pitch`.
- **Petites PR, souvent** : viser une PR toutes les 1–2 h. Une PR qui traîne = conflits à 3 h du matin.
- **Revue** : PR vers `develop` = auto-merge autorisé si les tests passent et que tu ne touches que ton périmètre. PR qui touche `src/types.ts` ou `package.json` = Mouad relit.
- **Push avant chaque repas et avant de dormir.**

### Consignes pour les Claude de l'équipe

1. Lis ce fichier et `sol-zero-fiche-v3` (seuils, modèles, tests d'or §11) avant de coder.
2. **Ne jamais push sur `main` ni sur `develop` directement.** Toujours une branche `feature/<prénom>-<sujet>` partie de `develop`, puis une PR vers `develop`.
3. Rester dans le périmètre de ton humain (tableau §1). Si tu dois modifier un fichier d'un autre périmètre, dis-le à ton humain au lieu de le faire.
4. Respecter le contrat de types `src/types.ts` (§5). Pour le changer : PR dédiée, courte.
5. `git pull --rebase origin develop` puis `npm test` avant chaque push.
6. Tout chiffre affiché porte une étiquette `[NASA]`, `[Publié]`, `[H]` ou `[Persona]` et, pour `[NASA]`, son identifiant (ex. `V1 4003`).
7. Aucun appel réseau pendant la démo : les données NASA sont pré-téléchargées dans `public/data/`.
8. Pas d'IA générative dans l'app (le moi futur = gabarits).
9. Après le gel (dim. 14:00) : uniquement des `hotfix/*`, jamais de nouvelle feature.

---

## 5. Arborescence et contrat de types

```
src/
  types.ts                 # contrat partagé (Mouad + Walid au kickoff)
  App.tsx, screens/, components/, styles/      # A — Mouad
  checkin/, db/, ingest/healthExport.ts        # B — Ahmed
  models/ aerobic bone tscore radiation fatigue baseline band triage router gain scanFit   # C — Walid
  data/haddad/             # C — générateur Haddad, graine fixe
  content/ standards.json templates/futureSelf.json protocols/   # D — Steve
server/ingest.ts           # B — middleware Vite POST /ingest
scripts/fetch-horizons.ts  # D
public/data/ horizons.json environments/*.json organScan.json   # D
tests/                     # C (+ chacun ses tests)
docs/ ROADMAP.md, sol-zero-fiche-v3.md          # D
pitch/ script.md, slides/                       # D
```

Contrat minimal à figer au kickoff (à ajuster, mais **une seule fois**) :

```ts
// src/types.ts
export type Color = 'green' | 'amber' | 'red' | 'grey';
export type Tag = 'NASA' | 'Publié' | 'H' | 'Persona';
export type LinkPos = 'ISS' | 'Lune' | 'MarsProche' | 'MarsScenario' | 'Conjonction';

export interface Projection {
  system: 'vo2' | 'hip' | 'radiation' | string;
  day: number;                 // J94, 180 (Sol 0), 860
  value: number;
  band: [number, number];
  color: Color;
  worst: Color;                // couleur du pire cas de la bande
  standardId?: string;         // ex. 'V1 4003'
  tag: Tag;
}

export interface RouterOutput {
  maintenant: string;          // NE DÉPEND JAMAIS de LinkPos
  ensuite: { decideur: 'moi' | 'CMO' | 'sol' | 'equipage'; reponseMin?: number; texte: string };
  echeance?: string;
}

export interface Measurement {
  type: 'RestingHeartRate' | 'HeartRateVariabilitySDNN' | 'VO2Max' | 'AppleSleepingWristTemperature' | 'SleepAnalysis' | 'HeartRate';
  value: number;
  unit: string;
  date: string;                // ISO
  source: 'apple-watch-export' | 'apple-watch-live' | 'manual' | 'simulated';
}

export interface OrganScan {
  organ: string; volume?: number; composition?: Record<string, number>;
  date: string; device: string; uncertainty: number;
}
```

---

## 6. Définition de « fini » (avant de merger dans `develop`)

- [ ] Les tests d'or de la fiche §11 qui concernent ta feature passent.
- [ ] Les chiffres à l'écran correspondent à la fiche §7 (VO₂ Sol 0 : 36,5 / 37,3 ; hanche J860 : 8,70 % / 4,22 %).
- [ ] Chaque écran affiche son étiquette RÉEL / SIMULÉ / [H].
- [ ] Ça marche **sans réseau**.
- [ ] Aucun vert par défaut quand la donnée manque.

---

## 7. Checklist démo (dimanche 17:00)

- [ ] `main` taggé `v1.0-demo`, build de prod local qui tourne en mode avion.
- [ ] Export Santé du présentateur chargé ; plan B « dernière mesure enregistrée » testé.
- [ ] App Fréquence cardiaque ouverte sur la montre juste avant le passage.
- [ ] Vidéos de secours n° 1 et n° 2 sur 2 ordinateurs + une clé USB.
- [ ] Diapos (5 max) + script chronométré à 3:00.
- [ ] Soumission Space Apps faite (lien du repo + vidéo).
- [ ] Chargeurs, adaptateur HDMI/USB-C testés sur l'écran des jurys si possible.
