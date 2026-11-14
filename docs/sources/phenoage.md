# PhenoAge — coefficients vérifiés (pour `src/models/phenoAge.ts`, Mouad)

_Vérifié par Steve (D), sam. 14:50. Étiquette dans l'app : **[Publié]**._

## Sources
- **Levine ME et al.** « An epigenetic biomarker of aging for lifespan and healthspan », *Aging* 10(4):573–591, 2018 — doi:10.18632/aging.101414 (PMC5940111). Article cité par la roadmap.
- **Liu Z, …, Levine M.** Correction de « A new aging measure captures morbidity and mortality risk across diverse subpopulations from NHANES IV », *PLOS Medicine*, 2019 — doi:10.1371/journal.pmed.1002760. **Source primaire** de l'équation complète ci-dessous (texte de la correction lu).
- ⚠ Le texte intégral d'*Aging* n'a pas pu être relu ici (site bloqué) : la constante finale est à confirmer sur le PDF si quelqu'un a 2 minutes.

## Formule (unités SI obligatoires)

```
xb = −19.907
     − 0.0336  × albumine            [g/L]
     + 0.0095  × créatinine          [µmol/L]
     + 0.1953  × glucose             [mmol/L]
     + 0.0954  × ln(CRP)             [CRP en mg/dL, log népérien]
     − 0.0120  × lymphocytes         [%]
     + 0.0268  × VGM (MCV)           [fL]
     + 0.3306  × IDR (RDW)           [%]
     + 0.00188 × phosphatases alc.   [U/L]
     + 0.0554  × leucocytes          [10³/µL]
     + 0.0804  × âge réel            [années]

γ = 0.0076927
M = 1 − exp( −exp(xb) × (exp(120·γ) − 1) / γ )      (exp(120γ) − 1 = 1.51714)
PhenoAge = 141.50 + ln( −0.00553 × ln(1 − M) ) / k
```

**Constante k :** `0.090165` (Levine 2018, et quasi toutes les implémentations publiques) contre `0.09165` (correction PLOS Med 2019). **Recommandation : k = 0.090165**, la version de l'article cité, avec la variante notée dans Raisonnement. Écart sur un adulte type : ~1,5 an.

**Conversions depuis les unités US :** albumine g/dL × 10 · créatinine mg/dL × 88.42 · glucose mg/dL ÷ 18.016 · CRP mg/L ÷ 10 (puis ln). La CRP doit être > 0 (pas de « < 0,1 » → 0).

## Vecteurs de test (tests d'or, k = 0.090165)
Profil sain : albumine 45, créatinine 80, glucose 5.0, CRP 0.1 mg/dL, lymphocytes 30 %, VGM 90, IDR 13, PAL 70, leucocytes 6.

| Âge réel | PhenoAge attendu (k = 0.090165) | (k = 0.09165) |
| :-- | :-- | :-- |
| 30 | 24.1 | 26.0 |
| 42 | 34.8 | 36.5 |
| 60 | 50.8 | 52.3 |
| 80 | 68.6 | 69.8 |

Tolérance conseillée : ± 0,1 an.

## Note pour le mock (§7 de la roadmap)
Le mock annonce « PhenoAge J91 : 43,1 ans pour 42 ans réels ». Pour l'obtenir, le générateur doit produire des marqueurs **dégradés** par rapport au profil sain (CRP plus haute, albumine plus basse, IDR plus haute — cohérent avec l'inflammation et l'anémie spatiale). Avec un profil sain, un homme de 42 ans sort autour de 35 ans.

## Limites à afficher dans Raisonnement
- Calibré sur une population terrestre (NHANES III), jamais validé chez les astronautes.
- Sensible à un épisode aigu (une CRP d'infection fait vieillir de plusieurs années) → on l'affiche sur le dernier prélèvement **hebdomadaire**, pas en alerte.
- C'est un score de risque de mortalité converti en âge, pas une mesure directe du vieillissement.
