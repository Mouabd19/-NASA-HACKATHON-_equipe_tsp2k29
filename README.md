# SOL ZÉRO

**NASA Space Apps Challenge — Health Monitoring Software for Astronauts** · équipe TSP2k29

> « L'astronaute sait **ce matin** dans quel état il est et **quoi faire**, sans attendre la Terre,
> et peut vérifier **pourquoi** jusqu'à la norme NASA. »

Deux pages : **Body** (reconstitution 3D du corps en calques, alertes ancrées, âge biologique, timeline J0 → J860)
et **War Room** (check-in du matin, consigne MAINTENANT / ENSUITE, to-do du jour, lien « Pourquoi ? » vers le raisonnement).

## Lancer le projet

```bash
npm i
npm run dev      # serveur de dev → http://localhost:5173
npm test         # tests (vitest)
npm run build    # typecheck + build de production (puis `npm run preview`)
```

Routes : `/body` · `/warroom` · `/reasoning/:id`. L'application fonctionne **sans réseau** (aucun appel à une API pendant la démo).

## Documentation

- **[ROADMAP.md](ROADMAP.md)** — produit, répartition, échéances, contrat de types (§6) et signatures des modules (§7). À lire avant de coder.
- [SOL_ZERO_NASA_DATA_SOURCES.md](SOL_ZERO_NASA_DATA_SOURCES.md) — sources de données NASA.
- `status/<prénom>.md` — avancement de chacun.

## Organisation du code

| Dossier | Contenu |
| :-- | :-- |
| `src/types.ts` | Contrat de types (ne change que par ajout) |
| `src/sim/`, `src/models/`, `src/ingest/`, `src/content/` | Modules de §7 — aujourd'hui des **stubs** qui délèguent à `src/mocks/` |
| `src/mocks/` | Données factices déterministes (persona Haddad, J0 → J94, projection jusqu'à J860) |
| `src/ui/` | Design system (`tokens.ts` = seule source des couleurs et des typos) |
| `src/pages/` | Pages Body, War Room, Raisonnement |
| `src/three/` | Scène 3D |
| `server/api.ts` | API locale (plugin Vite) pour le Raccourci iOS / Apple Watch |
| `tests/` | Tests de contrat |

## Honnêteté des données

Chaque chiffre porte son étiquette (`[NASA V1 4027]`, `[Publié]`, `[H]` = hypothèse de l'équipe, `[Persona]`) et chaque panneau sa provenance
(**RÉEL**, **SIMULÉ**, **[H]**). Les scans sont simulés ; la densité osseuse est **estimée par un modèle**, pas mesurée par le scanner ;
gris = inconnu, jamais vert par défaut. Les seuils rouges viennent de NASA-STD-3001 Vol. 1 Rév. C.

## Crédits

- Modèles anatomiques 3D (`public/models/*.glb`, **modifiés** : découpe par organe, simplification, compression meshopt) — dérivés de l'export glTF de [nqwrc/3d-anatomy](https://github.com/nqwrc/3d-anatomy), distribués sous **CC BY-NC-SA 4.0**, usage **non commercial réservé au hackathon** :
  « Z-Anatomy — The open source atlas of anatomy — CC BY-SA 4.0 » · « BodyParts3D — The Database Center for Life Science — CC BY-SA 2.1 Japan » ·
  « Cranial Nerves and Foramina — University of Dundee, CAHID — CC BY 4.0 » · « Anatomy of the Inner Ear — University of Dundee School of Medicine — CC BY-NC-SA 4.0 » ·
  « Kidney — lissiecowley — CC BY-NC 4.0 » · « Brainder » et « White matter » — University of Washington. Détail : [`public/models/CREDITS.md`](public/models/CREDITS.md).
- Normes : NASA-STD-3001 Vol. 1 Rév. C. Éphémérides : NASA JPL Horizons.
