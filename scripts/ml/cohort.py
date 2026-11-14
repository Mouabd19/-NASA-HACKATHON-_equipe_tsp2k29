"""Cohorte d'astronautes virtuels (SIMULÉE) pour entraîner les modèles B (projection des organes) et C (humeur).

Pourquoi simulée : les données humaines NASA publiques portent sur une poignée de personnes (Inspiration4 : 4,
Twins Study : 1) et les études ISS sont en accès contrôlé (LSDA). On calibre donc une population virtuelle sur les
ordres de grandeur publiés, avec de la VARIABILITÉ entre astronautes, et la vérité est connue pour chacun.

Calibrage (ordres de grandeur publiés, voir docs de Steve) :
  - os : perte de densité de la hanche ≈ 1–1,5 %/mois sans contre-mesure, nettement moins avec l'ARED
    (LeBlanc 2000 ; Sibonga) ; forte variabilité entre astronautes → multiplicateur log-normal (σ = 0,35) ;
    le calcium et le CTX urinaires montent avec la résorption (Smith, NASA ; Okada 2022).
  - muscle : atrophie des muscles posturaux de quelques % à J94 avec exercice (Gopalakrishnan 2010).
  - VO₂max : chute en début de vol puis rattrapage partiel (Moore 2014).
  - humeur : épisodes dépressifs injectés (début, intensité connus), journées difficiles isolées sans épisode.
Mêmes formules et mêmes bruits de mesure que le générateur de Haddad (src/sim/generate.ts) : Haddad est un
membre « moyen » de cette cohorte (tous les multiplicateurs = 1).
"""
from __future__ import annotations

import math

import numpy as np

from common import SEED

DAY_TODAY, DAY_SOL0, DAY_END = 94, 210, 860
DAYS = np.arange(DAY_TODAY + 1)


def fit_saturating(t1: float, v1: float, t2: float, v2: float) -> tuple[float, float]:
    """Même calage que src/models/curves.ts : L(t) = Linf (1 − e^{−t/τ}) passant par (t1, v1) et (t2, v2)."""
    ratio = v1 / v2
    lo, hi = 1.0, 1e5
    for _ in range(200):
        tau = math.sqrt(lo * hi)
        rr = (1 - math.exp(-t1 / tau)) / (1 - math.exp(-t2 / tau))
        if rr > ratio:
            lo = tau
        else:
            hi = tau
    tau = math.sqrt(lo * hi)
    return v1 / (1 - math.exp(-t1 / tau)), tau


def sat(t, linf, tau):
    return linf * (1 - np.exp(-np.asarray(t, dtype=float) / tau))


HIP = fit_saturating(94, 1.99, 860, 8.70)
VO2_PRE = 44.0
VO2 = fit_saturating(94, 10.84, 210, (1 - 36.5 / VO2_PRE) * 100)
THIGH = (6.0 / (1 - math.exp(-94 / 300)), 300.0)

MUSCLE_NOISE, VO2_NOISE, URINE_CA_NOISE, CTX_NOISE = 0.03, 0.03, 12.0, 15.0


def with_plan(curve, t, factor):
    """Après J94, on ne garde que `factor` de la perte restante (comme withPlan en TS)."""
    t = np.asarray(t, dtype=float)
    base = sat(t, *curve)
    at94 = sat(DAY_TODAY, *curve)
    return np.where(t <= DAY_TODAY, base, at94 + factor * (base - at94))


# ------------------------------------------------------------------------------------------------
# Modèle B : organes
# ------------------------------------------------------------------------------------------------

def organ_cohort(n: int = 2000, seed: int = SEED) -> dict[str, np.ndarray]:
    """Une ligne par astronaute : mesures J0–J94 bruitées → features ; pertes vraies à Sol 0 et J860 → cibles."""
    rng = np.random.default_rng(seed)
    rows: dict[str, list] = {k: [] for k in [
        "uca_rise", "ctx_rise", "thigh_loss_now", "thigh_slope28", "vo2_def_now", "vo2_slope28", "plan_keep",
        "hip_94", "hip_210_cur", "hip_860_cur", "hip_210_plan", "hip_860_plan",
        "thigh_210_cur", "thigh_860_cur", "thigh_210_plan", "thigh_860_plan",
        "vo2_210_cur", "vo2_860_cur", "vo2_210_plan", "vo2_860_plan"]}
    for _ in range(n):
        # --- os : vitesse individuelle (multiplicateur) + forme de courbe (τ) ---
        mb = rng.lognormal(0, 0.35)
        hip = (HIP[0] * mb * rng.uniform(0.85, 1.15), HIP[1] * rng.uniform(0.7, 1.3))
        # marqueurs urinaires : montée proportionnelle à la résorption, base individuelle
        amp = 90 * mb ** 0.8 * rng.lognormal(0, 0.2)
        uca = rng.normal(180, 25) + amp * (1 - np.exp(-DAYS / 30)) + rng.normal(0, URINE_CA_NOISE, DAYS.size)
        ctx = rng.normal(180, 30) + 140 / 90 * amp * (1 - np.exp(-DAYS / 30)) + rng.normal(0, CTX_NOISE, DAYS.size)
        # --- muscle (cuisse) ---
        mm = rng.lognormal(0, 0.35)
        thigh = (THIGH[0] * mm, THIGH[1] * rng.uniform(0.7, 1.4))
        vol = -sat(DAYS, *thigh) + rng.normal(0, MUSCLE_NOISE, DAYS.size)
        # --- VO₂max ---
        mv = rng.lognormal(0, 0.3)
        vo2c = (VO2[0] * mv, VO2[1] * rng.uniform(0.7, 1.4))
        vo2 = VO2_PRE * (1 - sat(DAYS, *vo2c) / 100) + rng.normal(0, VO2_NOISE, DAYS.size)
        # --- réponse au plan (fraction de la perte restante conservée) ---
        keep = rng.uniform(0.2, 0.5)

        rows["uca_rise"].append(uca[-7:].mean() - uca[:7].mean())
        rows["ctx_rise"].append(ctx[-7:].mean() - ctx[:7].mean())
        rows["thigh_loss_now"].append(-vol[-7:].mean())
        rows["thigh_slope28"].append(-np.polyfit(DAYS[-28:], vol[-28:], 1)[0] * 7)       # points de %/sem
        vdef = (1 - vo2 / VO2_PRE) * 100
        rows["vo2_def_now"].append(vdef[-7:].mean())
        rows["vo2_slope28"].append(np.polyfit(DAYS[-28:], vdef[-28:], 1)[0] * 7)
        rows["plan_keep"].append(keep)
        rows["hip_94"].append(float(sat(DAY_TODAY, *hip)))
        for name, curve in [("hip", hip), ("thigh", thigh), ("vo2", vo2c)]:
            for t in (DAY_SOL0, DAY_END):
                rows[f"{name}_{t}_cur"].append(float(sat(t, *curve)))
                rows[f"{name}_{t}_plan"].append(float(with_plan(curve, t, keep)))
    return {k: np.array(v) for k, v in rows.items()}


# ------------------------------------------------------------------------------------------------
# Modèle C : humeur
# ------------------------------------------------------------------------------------------------
MOOD_DAYS = np.arange(151)          # J0 → J150 : plus de recul pour placer des épisodes
EP_RAMP = 14


def mood_cohort(n: int = 1500, seed: int = SEED + 1, p_episode: float = 0.4) -> list[dict]:
    """Journaux quotidiens par astronaute. Épisode : début connu (onset), intensité s ; sinon onset = None."""
    rng = np.random.default_rng(seed)
    out = []
    ramp = np.minimum(1, MOOD_DAYS / DAY_TODAY)
    for i in range(n):
        onset = int(rng.integers(35, 140)) if rng.random() < p_episode else None
        s = rng.uniform(0.3, 1.2)            # épisodes légers à francs
        ep = np.zeros(MOOD_DAYS.size) if onset is None else s * np.clip((MOOD_DAYS - onset) / EP_RAMP, 0, 1)
        # mauvaises passes isolées (3 jours) : pièges à fausses alertes
        dip = np.zeros(MOOD_DAYS.size)
        for _ in range(rng.poisson(1.0)):
            d0 = int(rng.integers(21, MOOD_DAYS.size - 3))
            dip[d0:d0 + rng.integers(3, 8)] = rng.uniform(0.5, 1.2)   # 3 à 7 jours
        m0, f0, s0 = rng.uniform(3.5, 4.5), rng.uniform(1.5, 2.5), rng.uniform(3.5, 4.5)
        clip = lambda v: np.clip(np.round(v), 1, 5)
        log = {
            "id": i, "onset": onset,
            "mood": clip(m0 - 0.3 * ramp - 1.2 * ep - 0.8 * dip + rng.normal(0, 0.5, MOOD_DAYS.size)),
            "fatigue": clip(f0 + 0.4 * ramp + 1.2 * ep + 0.8 * dip + rng.normal(0, 0.5, MOOD_DAYS.size)),
            "sleep_felt": clip(s0 - 0.3 * ramp - 1.0 * ep - 0.6 * dip + rng.normal(0, 0.5, MOOD_DAYS.size)),
            "sleep_h": np.round(rng.normal(7.1, 0.3) - 0.4 * ramp - 0.8 * ep - 0.5 * dip + rng.normal(0, 0.4, MOOD_DAYS.size), 1),
            "hrv": np.round(rng.normal(58, 6) - 6 * ramp - 8 * ep - 4 * dip + rng.normal(0, 5, MOOD_DAYS.size), 1),
            # cortisol : prélèvement hebdo, dernière valeur connue
            "cortisol": np.repeat((rng.normal(380, 30) + 40 * ramp + 70 * ep + rng.normal(0, 15, MOOD_DAYS.size))[::7], 7)[:MOOD_DAYS.size],
            "episode": ep,
        }
        out.append(log)
    return out


BASELINE_DAYS = 21      # référence personnelle : J0 → J20
WINDOW = 7
MOOD_FEATURES = ["mood", "fatigue", "sleep_felt", "sleep_h", "hrv", "cortisol"]


def mood_features(log: dict, day: int) -> list[float] | None:
    """Écarts (z-scores) de la moyenne des 7 derniers jours à la référence personnelle J0–J20. None si trop tôt."""
    if day < BASELINE_DAYS + WINDOW - 1:
        return None
    feats = []
    for k in MOOD_FEATURES:
        x = np.asarray(log[k], dtype=float)
        base = x[:BASELINE_DAYS]
        sd = max(base.std(), 0.25 if k in ("mood", "fatigue", "sleep_felt") else 1e-3 + 0.05 * abs(base.mean()))
        feats.append((x[day - WINDOW + 1: day + 1].mean() - base.mean()) / sd)
    return feats
