"""
geojson_utils.py — GeoJSON / raster helper functions.
"""
import json
from typing import Any

import numpy as np
import rasterio
import rasterio.features
import rasterio.transform
from pyproj import Transformer
from shapely.geometry import shape, mapping
from shapely.ops import transform as shapely_transform


def geojson_to_shapely(geojson: dict):
    """Convert a GeoJSON geometry dict → Shapely geometry (WGS84)."""
    return shape(geojson)


def reproject_shape(shapely_geom, from_crs: str = "EPSG:4326", to_crs: str = "EPSG:6933"):
    """Reproject a Shapely geometry from one CRS to another."""
    transformer = Transformer.from_crs(from_crs, to_crs, always_xy=True)

    def _transform(x, y, z=None):
        xx, yy = transformer.transform(x, y)
        return (xx, yy) if z is None else (xx, yy, z)

    return shapely_transform(_transform, shapely_geom)


def vectorize_mask(
    binary_mask: np.ndarray,
    transform,
    crs_str: str,
    simplify_tolerance: float = 0.00005,
) -> dict:
    """
    Convert a boolean numpy mask → GeoJSON FeatureCollection in WGS84.

    Parameters
    ----------
    binary_mask   : 2-D bool array (True = green pixel)
    transform     : rasterio Affine transform for the raster
    crs_str       : CRS of the raster (e.g. 'EPSG:32643')
    simplify_tolerance : geometry simplification (degrees) to reduce payload size
    """
    features = list(
        rasterio.features.shapes(
            binary_mask.astype(np.uint8),
            mask=binary_mask.astype(np.uint8),
            transform=transform,
        )
    )

    if not features:
        return {"type": "FeatureCollection", "features": []}

    # Reproject each polygon from raster CRS → WGS84
    transformer = Transformer.from_crs(crs_str, "EPSG:4326", always_xy=True)

    def _reproj(x, y, z=None):
        xx, yy = transformer.transform(x, y)
        return (xx, yy) if z is None else (xx, yy, z)

    fc_features = []
    for geom_dict, val in features:
        if val == 0:
            continue
        geom = shape(geom_dict)
        geom_wgs84 = shapely_transform(_reproj, geom)
        if simplify_tolerance and not geom_wgs84.is_empty:
            geom_wgs84 = geom_wgs84.simplify(simplify_tolerance, preserve_topology=True)
        fc_features.append(
            {
                "type": "Feature",
                "geometry": mapping(geom_wgs84),
                "properties": {"class": "green"},
            }
        )

    return {"type": "FeatureCollection", "features": fc_features}


def bbox_from_geojson(geojson: dict) -> tuple:
    """Return (west, south, east, north) from a GeoJSON geometry."""
    geom = shape(geojson)
    return geom.bounds  # (minx, miny, maxx, maxy) == (W, S, E, N)
