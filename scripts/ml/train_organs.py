"""Modèle B — projection des organes (hanche, cuisse, VO₂max) à Sol 0 et J860, avec bande d'incertitude.

Usage : python scripts/ml/train_organs.py  →  public/data/ml/organ-forecast.json

Apprentissage SUPERVISÉ (régression QUANTILE) sur la cohorte simulée calibrée NASA (cohort.py) :
  entrée  = ce qu'on observe chez un astronaute de J0 à J94 ;
  cible   = sa vraie perte à Sol 0 / J860 (connue dans la cohorte) ;
  sortie  = 3 quantiles (10 %, 50 %, 90 %) → la médiane est la projection, l'écart 10–90 % est la bande.
Point clé pour l'os : le scanner ne mesure PAS l'os. Le modèle apprend à déduire la perte osseuse des marqueurs
URINAIRES (calcium, CTX), mesurés tous les jours. Modèles linéaires : exportables et lisibles dans l'app.
"""
from __future__ import annotations

import numpy as np
from sklearn.linear_model import QuantileRegressor
from sklearn.model_selection import train_test_split

from cohort import DAY_END, DAY_SOL0, HIP, THIGH, VO2, organ_cohort, sat
from common import SEED, r, write_json

QUANTILES = [0.1, 0.5, 0.9]
ORGANS = {
    # organe : (features, unité, courbe de référence pour la base de comparaison « modèle fixe »)
    "hanche": (["uca_rise", "ctx_rise"], "% de perte de densité", HIP),
    "cuisse": (["thigh_loss_now", "thigh_slope28"], "% de perte de volume", THIGH),
    "coeur": (["vo2_def_now", "vo2_slope28"], "% de déficit de VO₂max", VO2),
}
SRC = {"hanche": "hip", "cuisse": "thigh", "coeur": "vo2"}
NOW = {"hanche": None, "cuisse": "thigh_loss_now", "coeur": "vo2_def_now"}


def main() -> None:
    data = organ_cohort()
    n = len(data["uca_rise"])
    idx_tr, idx_te = train_test_split(np.arange(n), test_size=0.25, random_state=SEED)
    models, metrics = {}, {}
    for organ, (feats, unit, curve) in ORGANS.items():
        X = np.column_stack([data[f] for f in feats])
        for horizon in (DAY_SOL0, DAY_END):
            for scen in ("cur", "plan"):
                y = data[f"{SRC[organ]}_{horizon}_{scen}"]
                key = f"{organ}/{horizon}/{scen}"
                qs = {}
                preds = {}
                for q in QUANTILES:
                    m = QuantileRegressor(quantile=q, alpha=0.0, solver="highs").fit(X[idx_tr], y[idx_tr])
                    qs[str(q)] = {"coef": [r(c) for c in m.coef_], "intercept": r(m.intercept_)}
                    preds[q] = m.predict(X[idx_te])
                lo, med, hi = np.sort(np.vstack([preds[q] for q in QUANTILES]), axis=0)
                yt = y[idx_te]
                # base de comparaison : « courbe fixe » mise à l'échelle par l'état observé à J94 (sans ML)
                ratio = sat(horizon, *curve) / sat(94, *curve)
                if NOW[organ]:
                    naive = data[NOW[organ]][idx_te] * ratio
                    if scen == "plan":
                        naive = data[NOW[organ]][idx_te] * (1 + 0.35 * (ratio - 1))
                    naive_mae = r(np.mean(np.abs(naive - yt)), 3)
                else:
                    naive_mae = r(np.mean(np.abs(np.median(y[idx_tr]) - yt)), 3)   # hanche : rien d'observé → médiane
                models[key] = {"features": feats, "quantiles": qs}
                metrics[key] = {
                    "mae_median": r(np.mean(np.abs(med - yt)), 3),
                    "mae_baseline_without_ml": naive_mae,
                    "coverage_10_90": r(np.mean((yt >= lo) & (yt <= hi)), 3),
                    "mean_target": r(yt.mean(), 3),
                }
                print(key, metrics[key])
    write_json("organ-forecast.json", {
        "id": "organ-forecast", "version": 1,
        "title": "Projection des organes — régression quantile (10 / 50 / 90 %)",
        "learning": "Supervisé (régression quantile linéaire, perte « pinball »). Entrée : mesures J0–J94. Cible : perte vraie à Sol 0 et J860.",
        "data": f"Cohorte SIMULÉE de {n} astronautes virtuels calibrée sur les ordres de grandeur NASA publiés (os, muscle, VO₂max), variabilité entre astronautes, 75 % entraînement / 25 % test.",
        "tag": "H",
        "units": {o: u for o, (_, u, _) in ORGANS.items()},
        "features_doc": {
            "uca_rise": "calcium urinaire : moyenne J88–J94 − moyenne J0–J6 (mg/24 h)",
            "ctx_rise": "CTX urinaire : moyenne J88–J94 − moyenne J0–J6",
            "thigh_loss_now": "perte de volume de la cuisse, moyenne des 7 derniers jours (%)",
            "thigh_slope28": "pente de la perte de la cuisse sur 28 jours (points de %/semaine)",
            "vo2_def_now": "déficit de VO₂max vs pré-vol, moyenne des 7 derniers jours (%)",
            "vo2_slope28": "pente du déficit de VO₂max sur 28 jours (points de %/semaine)",
        },
        "limits": [
            "Entraîné sur une cohorte SIMULÉE : il apprend les relations que nous avons calibrées, pas des données d'astronautes réels.",
            "La bande 10–90 % couvre la variabilité entre astronautes de la cohorte (couverture mesurée sur le test).",
            "Scénario « plan » : réponse au plan inconnue à J94 → incluse dans l'incertitude.",
        ],
        "models": models,
        "metrics": metrics,
    })


if __name__ == "__main__":
    main()
