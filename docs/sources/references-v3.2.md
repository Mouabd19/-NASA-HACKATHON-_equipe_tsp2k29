# Sources de la v3.2 — vérification (Steve, sam. 15:20)

Données machine : `public/data/nasa/references.json` (15 entrées : id, étiquette, lien, ce que dit la source, à quoi elle sert, statut).
Normes NASA : `public/data/nasa/standards.json`. PhenoAge : `phenoage.md`.

## ⚠ Trois corrections qui changent des chiffres ou des étiquettes

### 1. Vitesses de vieillissement terrestre (écart d'âge par organe, §8) : 1 %/an est trop haut pour l'os et le muscle
| Organe | Roadmap | Sources | Valeur recommandée |
| :-- | :-- | :-- | :-- |
| Hanche | ≈ 1 %/an | MINOS (hommes 50–85 ans) : hanche totale ≈ 0,5 %/an, col ≈ 0,3 %/an ; MrOS : ≈ 0,3 %/an au col | **0,5 %/an** |
| Cuisse / mollet | ≈ 1 %/an | Méta-analyse 25 → 75 ans : ≈ 0,4 %/an ; ≈ 1 %/an seulement après 70 ans | **0,4 %/an** |
| Cœur (VO₂max) | ≈ 1 %/an | Fleg 2005 : 3–6 %/décennie à 20–39 ans, s'accélère ensuite ; « 10 %/décennie » = simplification courante | **1 %/an** (garder) |

**Conséquence pour la démo** (formule §8 inchangée) : hanche à J94, perte 1,99 % → **+4,0 ans** (et non +2,0) ; à J860, 8,70 % → **+17,4 ans** au rythme actuel et 4,22 % → **+8,4 ans** avec le plan.
Ces valeurs sont mesurées sur des hommes de plus de 50 ans ; à 42 ans la perte terrestre est plus lente, donc l'écart serait encore plus grand. **À décider par l'équipe** (Mouad + Steve) : soit les valeurs sourcées (plus honnêtes, chiffres plus spectaculaires), soit garder 1 %/an en l'affichant comme hypothèse prudente [H].

### 2. Bisphosphonates : la source n'est pas la norme NASA
La fiche attribuait « bisphosphonates + exercice → perte ~0 % » à la justification de [V1 4027]. La Rev C ne le dit pas. Vraie source : **LeBlanc et al. 2013, *Osteoporosis International*** (NASA–JAXA) : alendronate + ARED atténue la baisse de quasiment tous les indices osseux. Étiquette **[Publié]**, pas [NASA].

### 3. « Moins de 5 % de perte à la hanche avec l'ARED » : non sourcé
Pas trouvé. Source NASA trouvée à la place (NTRS, LeBlanc) : sur Mir/ISS (~171 j), > 90 % des astronautes ont perdu ≥ 5 % sur au moins un site osseux. Ne pas afficher le « < 5 % » tant qu'il n'est pas sourcé.

## Ce qui est confirmé
- **Anémie spatiale** (Trudel 2022, *Nature Medicine*) : +54 % de globules rouges détruits pendant 6 mois, réversible en 3–4 mois au retour → hémoglobine en lente baisse dans le générateur.
- **Calcium urinaire et calculs** (Okada 2022 ; Smith, NASA ; Buckey 2022) : le calcium urinaire monte dès J15–J30 et les marqueurs urinaires de résorption (NTX) aussi ; la première urine du matin suffit pour suivre os + risque de calcul → l'urine quotidienne de la v3.2 est réaliste. Calcium **urinaire**, pas sanguin (le sanguin reste régulé).
- **Nerf optique** (Fall 2022, *npj Microgravity* ; NASA 2025) : le diamètre de la gaine se mesure par échographie, y compris sur l'ISS ; c'est un **indicateur indirect** de pression intracrânienne, mesures hétérogènes → on alerte sur la tendance, jamais sur un point.
- **Échographie et os** : forte réflexion et atténuation (≈ 6–9 dB/MHz/cm pour l'os contre 0,5 pour le foie) → justifie que le scanner ne mesure pas la densité osseuse.
- **Centrifugeuse à bras court** : AGBRESA (DLR :envihab, Cologne, 2019, NASA/DLR/ESA), 60 jours d'alitement, 30 min/j à 1 g ; arrêts rares (malaises, pas mal des transports). Ça existe **au sol**, jamais en vol → [H] pour la version embarquée.
- **Âge des organes** (Oh 2023, *Nature*) : âge de 11 organes à partir des protéines du plasma, 5 676 adultes. Notre « écart d'âge » est un indicateur bien plus simple, à présenter comme inspiré de ce travail, pas comme cette méthode.

## Non vérifié / à faire
- « L'échographie est la seule imagerie médicale à bord de l'ISS » : pas de source NASA explicite trouvée → ne pas le dire tel quel ; dire « l'échographie est déjà utilisée à bord, y compris pour l'œil ».
- Articles complets non relus (résumés seulement) : Trudel 2022, LeBlanc 2013, Okada 2022.
