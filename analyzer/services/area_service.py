"""
area_service.py — Compute land-cover areas from an NDVI classification mask.

Uses pixel counting in an equal-area projection (EPSG:6933) so results
are accurate regardless of latitude.
"""
import numpy as np
import rasterio.warp
from rasterio.crs import CRS
from rasterio.transform import from_bounds
from pyproj import Transformer


# Sentinel-2 native pixel size (metres) at 10 m resolution
SENTINEL2_PIXEL_M = 10.0


def compute_areas(
    green_mask: np.ndarray,
    raster_transform,
    raster_crs: str,
) -> dict:
    """
    Compute total, green, and non-green areas in km².

    Parameters
    ----------
    green_mask      : 2-D boolean array (True = green pixel)
    raster_transform: rasterio Affine transform
    raster_crs      : CRS string (e.g. 'EPSG:32643')

    Returns
    -------
    dict with keys: total_area_km2, green_area_km2, non_green_area_km2, green_percentage
    """
    height, width = green_mask.shape
    total_pixels = height * width
    green_pixels = int(np.sum(green_mask))
    non_green_pixels = total_pixels - green_pixels

    # Determine pixel area in m²
    # If raster is in a projected CRS, pixel_x/pixel_y are in metres directly.
    # If geographic (degrees), we approximate using SENTINEL2_PIXEL_M.
    src_crs = CRS.from_string(raster_crs)

    if src_crs.is_geographic:
        # Approximate: transform center pixel to equal-area, measure 1 pixel
        pixel_area_m2 = _estimate_pixel_area_geographic(raster_transform, raster_crs)
    else:
        # Projected: pixel size in metres
        pixel_x = abs(raster_transform.a)
        pixel_y = abs(raster_transform.e)
        pixel_area_m2 = pixel_x * pixel_y

    total_area_km2 = (total_pixels * pixel_area_m2) / 1_000_000
    green_area_km2 = (green_pixels * pixel_area_m2) / 1_000_000
    non_green_area_km2 = (non_green_pixels * pixel_area_m2) / 1_000_000
    green_percentage = (green_pixels / total_pixels * 100) if total_pixels > 0 else 0.0

    return {
        "total_area_km2": round(total_area_km2, 6),
        "green_area_km2": round(green_area_km2, 6),
        "non_green_area_km2": round(non_green_area_km2, 6),
        "green_percentage": round(green_percentage, 2),
    }


def _estimate_pixel_area_geographic(transform, crs_str: str) -> float:
    """
    Estimate pixel area in m² for a geographic (degree-based) CRS.
    Reprojects one pixel at the raster centre to EPSG:6933 (equal-area) and measures.
    """
    # Centre pixel in source degrees
    cx_deg = transform.c + (transform.a * 0.5)
    cy_deg = transform.f + (transform.e * 0.5)

    tr = Transformer.from_crs(crs_str, "EPSG:6933", always_xy=True)
    # Corner points of one pixel
    x0, y0 = tr.transform(cx_deg, cy_deg)
    x1, y1 = tr.transform(cx_deg + transform.a, cy_deg + transform.e)

    return abs((x1 - x0) * (y1 - y0))
