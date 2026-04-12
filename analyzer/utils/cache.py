"""
cache.py — File-based tile cache for Sentinel-2 band arrays.

Cache key: sha256(bbox_wkt + YYYYMM)
Storage:   %TEMP%/analyzer_cache/<key>_B04.npy  /  <key>_B08.npy
           + <key>_meta.json  (transform, crs, shape)
"""
import os
import json
import hashlib
import tempfile
from datetime import datetime
from pathlib import Path

import numpy as np

CACHE_DIR = Path(tempfile.gettempdir()) / "analyzer_cache"
CACHE_DIR.mkdir(parents=True, exist_ok=True)


def _cache_key(bbox: tuple, date_prefix: str) -> str:
    """bbox = (west, south, east, north). date_prefix = 'YYYYMM'."""
    raw = f"{bbox[0]:.6f},{bbox[1]:.6f},{bbox[2]:.6f},{bbox[3]:.6f}_{date_prefix}"
    return hashlib.sha256(raw.encode()).hexdigest()[:24]


def _month_prefix() -> str:
    return datetime.utcnow().strftime("%Y%m")


def cache_exists(bbox: tuple) -> bool:
    key = _cache_key(bbox, _month_prefix())
    return (
        (CACHE_DIR / f"{key}_B04.npy").exists()
        and (CACHE_DIR / f"{key}_B08.npy").exists()
        and (CACHE_DIR / f"{key}_meta.json").exists()
    )


def load_cache(bbox: tuple):
    """Returns (red_array, nir_array, meta_dict) or None if not found."""
    key = _cache_key(bbox, _month_prefix())
    try:
        red = np.load(str(CACHE_DIR / f"{key}_B04.npy"))
        nir = np.load(str(CACHE_DIR / f"{key}_B08.npy"))
        with open(CACHE_DIR / f"{key}_meta.json") as f:
            meta = json.load(f)
        return red, nir, meta
    except Exception:
        return None


def save_cache(bbox: tuple, red: np.ndarray, nir: np.ndarray, meta: dict):
    key = _cache_key(bbox, _month_prefix())
    np.save(str(CACHE_DIR / f"{key}_B04.npy"), red)
    np.save(str(CACHE_DIR / f"{key}_B08.npy"), nir)
    with open(CACHE_DIR / f"{key}_meta.json", "w") as f:
        json.dump(meta, f)
