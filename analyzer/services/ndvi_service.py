"""
ndvi_service.py — NDVI calculation, classification, and PNG overlay generation.

NDVI = (NIR - Red) / (NIR + Red)
Classification: NDVI > 0.3 → green, else non-green
"""
import base64
import io
from typing import Tuple

import numpy as np
from PIL import Image


NDVI_THRESHOLD = 0.3

# RGBA colours for the map overlay PNG
GREEN_RGBA = (34, 197, 94, 160)    # #22c55e at ~63% opacity
GREY_RGBA  = (156, 163, 175, 80)   # #9ca3af at ~31% opacity
NODATA_RGBA = (0, 0, 0, 0)         # fully transparent


def compute_ndvi(red: np.ndarray, nir: np.ndarray) -> np.ndarray:
    """
    Compute NDVI from float32 band arrays.
    Returns NDVI array in [-1, 1] with NaN where both bands are zero (no-data).
    """
    red = red.astype(np.float32)
    nir = nir.astype(np.float32)

    # Avoid division by zero
    denominator = nir + red
    with np.errstate(invalid="ignore", divide="ignore"):
        ndvi = np.where(denominator == 0, np.nan, (nir - red) / denominator)
    return ndvi


def classify_ndvi(ndvi: np.ndarray) -> np.ndarray:
    """
    Returns a boolean mask: True = green (NDVI > threshold).
    NaN pixels (no-data) are treated as non-green.
    """
    return np.where(np.isnan(ndvi), False, ndvi > NDVI_THRESHOLD)


def render_overlay_png(
    ndvi: np.ndarray,
    green_mask: np.ndarray,
) -> str:
    """
    Render a coloured RGBA PNG overlay of the NDVI classification.
    Returns base64-encoded PNG string for embedding in JSON.
    """
    h, w = ndvi.shape
    rgba = np.zeros((h, w, 4), dtype=np.uint8)

    no_data = np.isnan(ndvi) | ((ndvi == 0) & (~green_mask))

    # Green pixels
    rgba[green_mask, 0] = GREEN_RGBA[0]
    rgba[green_mask, 1] = GREEN_RGBA[1]
    rgba[green_mask, 2] = GREEN_RGBA[2]
    rgba[green_mask, 3] = GREEN_RGBA[3]

    # Non-green pixels (excluding no-data)
    non_green = ~green_mask & ~no_data
    rgba[non_green, 0] = GREY_RGBA[0]
    rgba[non_green, 1] = GREY_RGBA[1]
    rgba[non_green, 2] = GREY_RGBA[2]
    rgba[non_green, 3] = GREY_RGBA[3]

    # No-data → fully transparent (already zeros)

    img = Image.fromarray(rgba, mode="RGBA")

    # Downscale large rasters to keep the JSON response manageable (max 1024px wide)
    max_dim = 1024
    if w > max_dim or h > max_dim:
        scale = max_dim / max(w, h)
        img = img.resize((int(w * scale), int(h * scale)), Image.NEAREST)

    buf = io.BytesIO()
    img.save(buf, format="PNG", optimize=True)
    buf.seek(0)
    b64 = base64.b64encode(buf.read()).decode("utf-8")
    return f"data:image/png;base64,{b64}"


def run_ndvi_pipeline(
    red: np.ndarray,
    nir: np.ndarray,
) -> Tuple[np.ndarray, np.ndarray, str]:
    """
    Full pipeline: compute NDVI → classify → render overlay.
    Returns (ndvi_array, green_mask, overlay_png_base64).
    """
    ndvi = compute_ndvi(red, nir)
    green_mask = classify_ndvi(ndvi)
    overlay_png = render_overlay_png(ndvi, green_mask)
    return ndvi, green_mask, overlay_png
