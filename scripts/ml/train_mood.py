"""Modèle C — détection d'un glissement d'humeur (épisode dépressif) par rapport à la référence PERSONNELLE.

Usage : python scripts/ml/train_mood.py  →  public/data/ml/mood-risk.json

Apprentissage SUPERVISÉ (classification binaire, régression logistique) sur la cohorte simulée (cohort.py) :
  entrée = écarts (z-scores) de la moyenne des 7 derniers jours à la référence J0–J20 de l'astronaute
           (humeur, fatigue, sommeil ressenti, heures de sommeil, VFC, cortisol) ;
  cible  = « épisode installé ce jour-là » (connu, car injecté).
Découpage PAR ASTRONAUTE (pas par jour) : un astronaute du test n'a jamais été vu à l'entraînement.
Comparaison : détection d'anomalie NON SUPERVISÉE (IsolationForest, sans étiquettes).
Sortie = « signal à regarder », jamais un diagnostic (ROADMAP §11).
"""
from __future__ import annotations

import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score
from sklearn.model_selection import train_test_split

from cohort import BASELINE_DAYS, MOOD_DAYS, MOOD_FEATURES, WINDOW, mood_cohort, mood_features
from common import SEED, r, write_json

LABEL_LEVEL = 0.5     # « installé » = au moins la moitié de l'intensité
CONSECUTIVE = 2       # alerte si le score dépasse le seuil 2 jours de suite


def table(logs):
    X, y, who, day = [], [], [], []
    for log in logs:
        for d in MOOD_DAYS:
            f = mood_features(log, int(d))
            if f is None:
                continue
            X.append(f); y.append(int(log["episode"][d] >= LABEL_LEVEL)); who.append(log["id"]); day.append(int(d))
    return np.array(X), np.array(y), np.array(who), np.array(day)


def alarms(scores, who, day, thr):
    """Premier jour d'alerte par astronaute (score ≥ seuil pendant CONSECUTIVE jours)."""
    first = {}
    for w in np.unique(who):
        m = who == w
        s, d = scores[m], day[m]
        run = 0
        for si, di in zip(s, d):
            run = run + 1 if si >= thr else 0
            if run >= CONSECUTIVE:
                first[w] = di
                break
    return first


def evaluate(scores, who, day, logs_by_id, thr):
    first = alarms(scores, who, day, thr)
    delays, missed, false_alarm = [], 0, 0
    n_ep = n_no = 0
    for w, log in logs_by_id.items():
        onset = log["onset"]
        a = first.get(w)
        if onset is None:
            n_no += 1
            false_alarm += a is not None
        else:
            n_ep += 1
            if a is not None and a < onset:
                false_alarm += 1            # alerte AVANT le début : fausse alerte
                continue
            if a is None or a > MOOD_DAYS[-1]:
                missed += 1
            else:
                delays.append(a - onset)
    return {
        "detection_rate": r(1 - missed / max(n_ep, 1), 3),
        "median_delay_days": r(np.median(delays), 1) if delays else None,
        "false_alarm_rate_astronauts": r(false_alarm / max(n_ep + n_no, 1), 3),
    }


def main() -> None:
    logs = mood_cohort()
    ids = np.array([l["id"] for l in logs])
    tr_ids, te_ids = train_test_split(ids, test_size=0.25, random_state=SEED)
    X, y, who, day = table(logs)
    tr, te = np.isin(who, tr_ids), np.isin(who, te_ids)

    clf = LogisticRegression(max_iter=1000).fit(X[tr], y[tr])
    p_tr, p_te = clf.predict_proba(X[tr])[:, 1], clf.predict_proba(X[te])[:, 1]

    by_id = {l["id"]: l for l in logs}
    # seuil choisi sur l'ENTRAÎNEMENT : le plus bas qui garde ≤ 5 % d'astronautes en fausse alerte
    tr_logs = {i: by_id[i] for i in tr_ids}
    thr = 0.5
    for t in np.linspace(0.05, 0.95, 91):
        if evaluate(p_tr, who[tr], day[tr], tr_logs, t)["false_alarm_rate_astronauts"] <= 0.05:
            thr = float(t)
            break
    te_logs = {i: by_id[i] for i in te_ids}
    ev = evaluate(p_te, who[te], day[te], te_logs, thr)

    # Comparaison non supervisée : IsolationForest apprend « le normal » sur les jours de référence, sans étiquettes
    iso = IsolationForest(random_state=SEED).fit(X[tr][y[tr] == 0])
    iso_auc = roc_auc_score(y[te], -iso.score_samples(X[te]))

    metrics = {
        "n_astronauts_train": int(len(tr_ids)), "n_astronauts_test": int(len(te_ids)),
        "auc_test": r(roc_auc_score(y[te], p_te), 3),
        "threshold": r(thr, 3),
        **ev,
        "comparison_auc_isolation_forest_unsupervised": r(iso_auc, 3),
    }
    print(metrics)
    write_json("mood-risk.json", {
        "id": "mood-risk", "version": 1,
        "title": "Signal d'humeur — régression logistique sur la référence personnelle",
        "learning": "Supervisé (classification binaire, régression logistique). Cible : épisode installé ce jour (injecté donc connu). Découpage par astronaute.",
        "data": f"Cohorte SIMULÉE de {len(logs)} astronautes × {MOOD_DAYS.size} jours, 40 % avec un épisode (début et intensité aléatoires), mauvaises passes isolées comme pièges.",
        "tag": "H",
        "features": MOOD_FEATURES,
        "baseline_days": BASELINE_DAYS, "window": WINDOW, "consecutive_days": CONSECUTIVE,
        "coef": [r(c) for c in clf.coef_[0]],
        "intercept": r(clf.intercept_[0]),
        "threshold": r(thr, 3),
        "limits": [
            "Données SIMULÉES : montre que la méthode marche sur des épisodes que nous avons définis, pas sur de vrais astronautes.",
            "Signal à regarder, jamais un diagnostic : il PROPOSE un point psy, il n'impose rien (§11).",
            "Compare l'astronaute à lui-même (référence J0–J20), jamais à une norme.",
        ],
        "metrics": metrics,
    })


if __name__ == "__main__":
    main()
