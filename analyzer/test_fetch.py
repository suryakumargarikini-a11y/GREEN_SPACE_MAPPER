import sys
import os

sys.path.append(os.path.dirname(__file__))

from services.stac_service import fetch_sentinel2_bands

# Test bbox for say, Central Park, NY or some small area
bbox = (-73.978, 40.773, -73.953, 40.785)
geojson_geom = {
    "type": "Polygon",
    "coordinates": [[
        [-73.978, 40.773],
        [-73.953, 40.773],
        [-73.953, 40.785],
        [-73.978, 40.785],
        [-73.978, 40.773]
    ]]
}

try:
    print("Testing fetch_sentinel2_bands...")
    red, nir, transform, crs = fetch_sentinel2_bands(geojson_geom, bbox)
    print(f"Success! Red shape: {red.shape}, Nir shape: {nir.shape}")
    print(f"Transform: {transform}")
    print(f"CRS: {crs}")
except Exception as e:
    print(f"Error: {e}")
