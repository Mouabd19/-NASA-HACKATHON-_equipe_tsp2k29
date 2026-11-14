"""Modèle A — « âge sanguin » entraîné sur NHANES 2015–2018 (CDC, ~9 000 adultes réels).

Usage : python scripts/ml/train_blood_age.py
Télécharge les fichiers NHANES (une fois, dans ~/.cache/solzero/nhanes) et écrit public/data/ml/blood-age.json.

Modèle retenu : régression linéaire régularisée ElasticNet, âge ~ marqueurs (apprentissage SUPERVISÉ : la cible,
l'âge, est connue pour chaque personne). Linéaire exprès : l'app affiche la contribution de chaque marqueur.
Correction de biais (méthode « brain age ») : un modèle d'âge sous-estime les vieux et surestime les jeunes
(régression vers la moyenne) ; on apprend ce biais b(âge) = α + β·âge sur l'entraînement et on le retire.
Comparaisons dans la fiche modèle : Klemera-Doubal (2006) et gradient boosting (non linéaire).
"""
from __future__ import annotations

import urllib.request

import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.linear_model import ElasticNetCV
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.model_selection import train_test_split

from common import CACHE, SEED, r, write_json

CYCLES = {"I": 2015, "J": 2017}
BASE = "https://wwwn.cdc.gov/Nchs/Data/Nhanes/Public/{year}/DataFiles/{name}_{cycle}.xpt"

# fichier NHANES → {variable NHANES : nom de l'analyte dans SOL ZÉRO}. Unités = celles du générateur (SI).
VARS = {
    "DEMO": {"RIDAGEYR": "age"},
    "BIOPRO": {"LBDSALSI": "albumine", "LBDSCRSI": "creatinine", "LBDSGLSI": "glucose",
               "LBXSAPSI": "phosphatases_alcalines", "LBDSCASI": "calcium"},
    "CBC": {"LBXWBCSI": "leucocytes", "LBXLYPCT": "lymphocytes_pct", "LBXMCVSI": "vgm", "LBXRDW": "idr",
            "LBXHGB": "hemoglobine", "LBXHCT": "hematocrite"},
    "HSCRP": {"LBXHSCRP": "crp"},
    "VID": {"LBXVIDMS": "vitamine_d"},
}
UNITS = {"albumine": "g/L", "creatinine": "µmol/L", "glucose": "mmol/L", "phosphatases_alcalines": "U/L",
         "calcium": "mmol/L", "leucocytes": "10³/µL", "lymphocytes_pct": "%", "vgm": "fL", "idr": "%",
         "hemoglobine": "g/dL", "hematocrite": "%", "crp": "mg/L", "vitamine_d": "nmol/L"}
LOG = {"crp", "creatinine", "glucose", "phosphatases_alcalines"}   # distributions asymétriques → log
MIN_ABS_R = 0.10   # un marqueur presque indépendant de l'âge n'apporte que du bruit → exclu


def fetch(name: str, cycle: str) -> pd.DataFrame:
    d = CACHE / "nhanes"
    d.mkdir(parents=True, exist_ok=True)
    f = d / f"{name}_{cycle}.xpt"
    if not f.exists():
        url = BASE.format(year=CYCLES[cycle], name=name, cycle=cycle)
        print("téléchargement", url)
        urllib.request.urlretrieve(url, f)
    return pd.read_sas(f, format="xport")


def load() -> pd.DataFrame:
    frames = []
    for cycle in CYCLES:
        df = None
        for name, cols in VARS.items():
            part = fetch(name, cycle)[["SEQN", *cols]].rename(columns=cols)
            df = part if df is None else df.merge(part, on="SEQN", how="inner")
        frames.append(df)
    df = pd.concat(frames, ignore_index=True).dropna()
    return df[(df.age >= 20) & (df.age < 80)]          # 80 = âge plafonné par NHANES → exclu


def transform(df: pd.DataFrame, markers: list[str]) -> pd.DataFrame:
    X = df[markers].astype(float).copy()
    for m in markers:
        if m in LOG:
            X[m] = np.log(X[m].clip(lower=0.1))
    return X


def kdm_fit(X: pd.DataFrame, age: np.ndarray) -> tuple[dict, float]:
    params = {}
    for m in X.columns:
        k, q = np.polyfit(age, X[m].to_numpy(), 1)
        s = float(np.std(X[m].to_numpy() - (q + k * age)))
        rj = float(np.corrcoef(age, X[m])[0, 1])
        params[m] = {"q": q, "k": k, "s": s, "r": rj}
    be = kdm_predict(X, params)
    # Variance de l'écart (BA_E − âge), corrigée de la part due à l'erreur d'estimation (Klemera-Doubal 2006, éq. 26)
    rs = np.array([p["r"] for p in params.values()])
    r_char = np.sum(rs ** 2 / np.sqrt(1 - rs ** 2)) / np.sum(np.abs(rs) / np.sqrt(1 - rs ** 2))
    span = age.max() - age.min()
    s2_ba = float(np.var(be - age) - ((1 - r_char ** 2) / r_char ** 2) * (span ** 2) / (12 * len(params)))
    return params, max(s2_ba, 1.0)


def kdm_predict(X: pd.DataFrame, params: dict, age: np.ndarray | None = None, s2_ba: float | None = None) -> np.ndarray:
    num = np.zeros(len(X))
    den = 0.0
    for m, p in params.items():
        w = (p["k"] / p["s"]) ** 2
        num += (X[m].to_numpy() - p["q"]) * p["k"] / p["s"] ** 2
        den += w
    if age is not None and s2_ba is not None:
        num += age / s2_ba
        den += 1 / s2_ba
    return num / den


def main() -> None:
    df = load()
    all_markers = list(UNITS)
    X = transform(df, all_markers)
    y = df.age.to_numpy()
    Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.2, random_state=SEED)

    # Sélection : |corrélation avec l'âge| ≥ 0,10 sur l'entraînement
    corr = {m: abs(float(np.corrcoef(ytr, Xtr[m])[0, 1])) for m in all_markers}
    markers = [m for m in all_markers if corr[m] >= MIN_ABS_R]

    params, s2_ba = kdm_fit(Xtr[markers], ytr)
    ba_e_te = kdm_predict(Xte[markers], params)                     # sans l'âge : ce que disent les marqueurs seuls
    ba_te = kdm_predict(Xte[markers], params, yte, s2_ba)            # KDM final (avec l'âge réel)
    gap_te = ba_te - yte

    # Références : régression directe (supervisée sur l'âge) et gradient boosting (non linéaire)
    mu, sd = Xtr.mean(), Xtr.std()
    enet = ElasticNetCV(l1_ratio=[0.2, 0.5, 0.8, 1.0], cv=5, random_state=SEED).fit((Xtr - mu) / sd, ytr)
    gbm = HistGradientBoostingRegressor(random_state=SEED).fit(Xtr, ytr)

    pred_tr, pred_te = enet.predict((Xtr - mu) / sd), enet.predict((Xte - mu) / sd)
    beta, alpha = np.polyfit(ytr, pred_tr - ytr, 1)          # biais appris sur l'entraînement
    gap_corr_te = (pred_te - yte) - (alpha + beta * yte)
    metrics = {
        "n_train": int(len(ytr)), "n_test": int(len(yte)),
        "r2": r(r2_score(yte, pred_te), 3),
        "mae_years": r(mean_absolute_error(yte, pred_te), 2),
        "gap_sd_years": r(np.std(gap_corr_te), 2),
        "gap_vs_age_corr_after_correction": r(np.corrcoef(gap_corr_te, yte)[0, 1], 3),
        "comparison_r2_gradient_boosting": r(r2_score(yte, gbm.predict(Xte)), 3),
        "comparison_kdm_r_markers_vs_age": r(np.corrcoef(ba_e_te, yte)[0, 1], 3),
        "comparison_kdm_gap_sd_years": r(np.std(gap_te), 2),
    }
    print(metrics)
    write_json("blood-age.json", {
        "id": "blood-age", "version": 2,
        "title": "Âge sanguin — régression ElasticNet entraînée sur NHANES 2015–2018",
        "learning": "Supervisé (régression). Cible : âge chronologique. Modèle linéaire régularisé (ElasticNet, validation croisée 5 plis). Entraîné hors ligne avant la démo.",
        "data": f"NHANES 2015–2016 et 2017–2018 (CDC) : {len(df)} adultes de 20 à 79 ans, prises de sang réelles (80 % entraînement, 20 % test). Données terrestres.",
        "use": "Suivre la VARIATION de l'âge sanguin de Haddad d'un prélèvement à l'autre ; PhenoAge reste la référence publiée.",
        "tag": "Publié",
        "limits": [
            f"Les analyses de routine n'expliquent qu'une partie de l'âge (R² = {metrics['r2']}) : erreur moyenne ± {metrics['mae_years']} ans sur une personne.",
            "La valeur absolue est imprécise ; la variation chez une même personne est le signal utile.",
            "Population terrestre générale (États-Unis), pas des astronautes. Indicateur, pas diagnostic.",
            f"Klemera-Doubal testé : les marqueurs portent trop peu d'information (r = {metrics['comparison_kdm_r_markers_vs_age']}), l'estimation retombe sur l'âge réel (écart ± {metrics['comparison_kdm_gap_sd_years']} an).",
        ],
        "markers": [
            {"key": m, "unit": UNITS[m], "log": m in LOG, "mean": r(mu[m]), "sd": r(sd[m]), "coef": r(c)}
            for m, c in zip(all_markers, enet.coef_)
        ],
        "intercept": r(enet.intercept_),
        "bias": {"alpha": r(alpha), "beta": r(beta)},
        "metrics": metrics,
    })

if __name__ == "__main__":
    main()
