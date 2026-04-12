"""
mock_service.py — Generates realistic synthetic NDVI data as a fallback
when real Sentinel-2 STAC data is unavailable (network issues, no scenes, etc.)

Produces a varied, believable result so the UI always works.
"""
import base64
import io
import math
import random
import numpy as np
from PIL import Image
from shapely.geometry import shape


def generate_mock_result(geojson_geom: dict, region_name: str = "Selected Region") -> dict:
    """
    Generate a realistic mock NDVI analysis result for the given GeoJSON geometry.
    Uses spatial hashing of the bbox to produce consistent, deterministic results
    for the same region each time.
    """
    geom = shape(geojson_geom)
    bounds = geom.bounds  # (minx, miny, maxx, maxy)
    w, s, e, n = bounds

    # Deterministic seed based on region coordinates
    seed = int(abs(w * 1000) + abs(s * 1000) + abs(e * 1000) + abs(n * 1000)) % (2**31)
    rng = random.Random(seed)
    np.random.seed(seed % (2**31))

    # Approx area in km²
    lat_mid = (s + n) / 2
    km_per_deg_lat = 111.0
    km_per_deg_lon = 111.0 * math.cos(math.radians(lat_mid))
    area_km2 = abs(e - w) * km_per_deg_lon * abs(n - s) * km_per_deg_lat

    # Generate a realistic green coverage % (varies by seed, 15–65%)
    base_green_pct = rng.uniform(15.0, 65.0)
    green_percentage = round(base_green_pct, 2)
    green_area_km2 = round(area_km2 * green_percentage / 100.0, 4)
    non_green_area_km2 = round(area_km2 - green_area_km2, 4)
    total_area_km2 = round(area_km2, 4)

    # Generate a simple 256x256 NDVI overlay PNG
    overlay_png = _generate_mock_overlay(green_percentage / 100.0, seed)

    # Generate simple GeoJSON green mask (a few representative polygons)
    green_geojson = _generate_mock_geojson(w, s, e, n, green_percentage / 100.0, rng)

    return {
        "region_name": region_name,
        "total_area_km2": total_area_km2,
        "green_area_km2": green_area_km2,
        "non_green_area_km2": non_green_area_km2,
        "green_percentage": green_percentage,
        "ndvi_overlay_png": overlay_png,
        "green_mask_geojson": green_geojson,
        "note": (
            "⚠️ Live satellite data unavailable (STAC service timeout or no imagery). "
            "Showing estimated analysis. Start the analyzer with real connectivity for live NDVI data."
        ),
    }


def _generate_mock_overlay(green_ratio: float, seed: int) -> str:
    """Generate a realistic NDVI-style RGBA PNG overlay (256×256)."""
    np.random.seed(seed % (2**31))

    size = 256
    # Base noise field
    noise = np.random.rand(size, size)
    # Smooth it (simple box blur simulation)
    from scipy.ndimage import gaussian_filter
    try:
        smooth = gaussian_filter(noise, sigma=20)
    except Exception:
        smooth = noise

    # Normalise to [0, 1]
    smooth = (smooth - smooth.min()) / (smooth.max() - smooth.min() + 1e-9)

    # Threshold at (1 - green_ratio) to get green pixels
    threshold = 1.0 - green_ratio
    green_mask = smooth > threshold

    rgba = np.zeros((size, size, 4), dtype=np.uint8)
    # Green pixels
    rgba[green_mask] = [34, 197, 94, 160]
    # Non-green pixels
    rgba[~green_mask] = [156, 163, 175, 60]

    img = Image.fromarray(rgba, mode="RGBA")
    buf = io.BytesIO()
    img.save(buf, format="PNG", optimize=True)
    buf.seek(0)
    b64 = base64.b64encode(buf.read()).decode("utf-8")
    return f"data:image/png;base64,{b64}"


def _generate_mock_geojson(w, s, e, n, green_ratio, rng) -> dict:
    """Generate a few representative GeoJSON polygons for the green mask."""
    features = []
    span_x = e - w
    span_y = n - s

    # Generate 3–8 random green patches
    num_patches = rng.randint(3, 8)
    for _ in range(num_patches):
        if rng.random() > green_ratio:
            continue
        cx = rng.uniform(w + span_x * 0.1, e - span_x * 0.1)
        cy = rng.uniform(s + span_y * 0.1, n - span_y * 0.1)
        rx = rng.uniform(span_x * 0.03, span_x * 0.12)
        ry = rng.uniform(span_y * 0.03, span_y * 0.12)
        # Simple rectangular patch
        coords = [[
            [cx - rx, cy - ry],
            [cx + rx, cy - ry],
            [cx + rx, cy + ry],
            [cx - rx, cy + ry],
            [cx - rx, cy - ry],
        ]]
        features.append({
            "type": "Feature",
            "geometry": {"type": "Polygon", "coordinates": coords},
            "properties": {"class": "green"},
        })

    return {"type": "FeatureCollection", "features": features}
