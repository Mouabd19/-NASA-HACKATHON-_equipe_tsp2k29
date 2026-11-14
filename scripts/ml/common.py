"""Chemins et utilitaires partagés par les scripts d'entraînement (exécutés AVANT la démo, jamais dans l'app)."""
from __future__ import annotations

import json
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT_DIR = ROOT / "public" / "data" / "ml"          # poids + métriques + fiches modèle (lus par l'app)
CACHE = Path(os.environ.get("SOLZERO_CACHE", Path.home() / ".cache" / "solzero"))  # données brutes, hors repo
SEED = 2029


def write_json(name: str, data: dict) -> Path:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    path = OUT_DIR / name
    path.write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"-> {path.relative_to(ROOT)} ({path.stat().st_size // 1024} Ko)")
    return path


def r(x: float, d: int = 6) -> float:
    return float(round(float(x), d))
