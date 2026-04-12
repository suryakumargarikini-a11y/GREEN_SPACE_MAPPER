"""
stac_service.py — Fast Sentinel-2 NDVI band fetch via Sentinel Hub.

Strategy:
  1. Disk cache (instant)
  2. Call Sentinel Hub Process API specifying:
     - 512x512 resolution (fast processing, scales dynamically)
     - Evalscript that extracts B04 (Red), B08 (NIR), and dataMask
     - FLOAT32 TIFF output format
  3. Load result using rasterio.MemoryFile
"""
import os
import io
import time
from datetime import datetime, timedelta
import requests
import rasterio
import numpy as np
from rasterio.transform import from_bounds
from dotenv import load_dotenv

from utils.cache import cache_exists, load_cache, save_cache

# Load environment variables
load_dotenv()

SH_CLIENT_ID = os.getenv("SH_CLIENT_ID")
SH_CLIENT_SECRET = os.getenv("SH_CLIENT_SECRET")
AUTH_URL = "https://services.sentinel-hub.com/oauth/token"
PROCESS_URL = "https://services.sentinel-hub.com/api/v1/process"

TARGET_PX = 512

# Simple in-memory token cache
_TOKEN_CACHE = {
    "access_token": None,
    "expires_at": 0
}

def _get_access_token() -> str:
    now = time.time()
    if _TOKEN_CACHE["access_token"] and now < _TOKEN_CACHE["expires_at"]:
        return _TOKEN_CACHE["access_token"]
        
    if not SH_CLIENT_ID or not SH_CLIENT_SECRET:
        raise RuntimeError("Missing SH_CLIENT_ID or SH_CLIENT_SECRET in environment! Cannot fetch Sentinel-2 data.")
        
    resp = requests.post(
        AUTH_URL,
        auth=(SH_CLIENT_ID, SH_CLIENT_SECRET),
        data={"grant_type": "client_credentials"},
        timeout=10
    )
    if resp.status_code != 200:
        raise RuntimeError(f"Failed to authenticate with Sentinel Hub: {resp.text}")
        
    token_info = resp.json()
    _TOKEN_CACHE["access_token"] = token_info["access_token"]
    _TOKEN_CACHE["expires_at"] = now + token_info["expires_in"] - 60 
    
    return _TOKEN_CACHE["access_token"]

def fetch_sentinel2_bands(geojson_geom: dict, bbox: tuple) -> tuple:
    """
    Main entry point.
    Calls Sentinel Hub Process API.
    Returns (red_arr, nir_arr, transform, crs_str).
    """
    # 1. Disk cache
    cached = load_cache(bbox)
    if cached is not None:
        red, nir, meta = cached
        import affine
        transform = affine.Affine(*meta["transform"])
        return red, nir, transform, meta["crs"]
        
    # 2. Get active Access Token
    access_token = _get_access_token()
    
    w, s, e, n = bbox
    
    # Check for the best low-cloud image over the last 60 days
    now = datetime.utcnow()
    past = now - timedelta(days=60)
    to_date = now.strftime("%Y-%m-%dT%H:%M:%SZ")
    from_date = past.strftime("%Y-%m-%dT%H:%M:%SZ")
    
    payload = {
      "input": {
        "bounds": {
          "bbox": [w, s, e, n],
          "properties": {"crs": "http://www.opengis.net/def/crs/OGC/1.3/CRS84"}
        },
        "data": [
          {
            "type": "sentinel-2-l2a",
            "dataFilter": {
              "timeRange": {
                "from": from_date,
                "to": to_date
              },
              "maxCloudCoverage": 25,
              "mosaickingOrder": "leastCC"
            }
          }
        ]
      },
      "output": {
        "width": TARGET_PX,
        "height": TARGET_PX,
        "responses": [
          {
            "identifier": "default",
            "format": {"type": "image/tiff"}
          }
        ]
      },
      "evalscript": '''
        //VERSION=3
        function setup() {
          return {
            input: ["B04", "B08", "dataMask"],
            output: { bands: 3, sampleType: "FLOAT32" }
          };
        }
        function evaluatePixel(sample) {
          return [sample.B04, sample.B08, sample.dataMask];
        }
      '''
    }
    
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Accept": "image/tiff"
    }
    
    # 3. Call Process API
    resp = requests.post(PROCESS_URL, json=payload, headers=headers, timeout=30)
    if resp.status_code != 200:
        raise RuntimeError(f"Sentinel Hub process failed ({resp.status_code}): {resp.text}")
        
    # 4. Extract data from GeoTIFF Response
    with rasterio.MemoryFile(resp.content) as memfile:
        with memfile.open() as src:
            red_arr = src.read(1).astype(np.float32)
            nir_arr = src.read(2).astype(np.float32)
            mask    = src.read(3)
            
            # Mask out invalid pixels
            red_arr[mask == 0] = np.nan
            nir_arr[mask == 0] = np.nan
            
            # The TIFF might not have an embedded EPSG:4326 transform, so we define it exactly using the requested bounding box
            transform = from_bounds(w, s, e, n, TARGET_PX, TARGET_PX)
            crs_str = "EPSG:4326"
            
    # 5. Save and return
    meta = {"transform": list(transform)[:6], "crs": crs_str}
    save_cache(bbox, red_arr, nir_arr, meta)
    
    return red_arr, nir_arr, transform, crs_str
