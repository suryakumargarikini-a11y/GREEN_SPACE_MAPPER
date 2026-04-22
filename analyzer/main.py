"""
main.py — Green Space Analyzer FastAPI microservice.

Endpoints:
  POST /api/analyze           → Full NDVI pipeline for a GeoJSON polygon
  GET  /api/analyze/stream    → SSE endpoint — streams progress events
  GET  /api/search-region     → Nominatim geocoding → OSM boundary GeoJSON
  GET  /health                → Health check

Fallback: if real Sentinel-2 STAC data is unavailable, returns mock analysis data
so the frontend always receives a valid response.
"""
import asyncio
import json
import traceback
import uuid
from typing import Optional

import httpx
import requests
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Green Space Analyzer API",
    description="Real NDVI-based green space analysis using Sentinel-2 satellite imagery.",
    version="2.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Schemas ───────────────────────────────────────────────────────────────────

class AnalyzeRequest(BaseModel):
    geojson: dict = Field(..., description="GeoJSON geometry (Polygon or MultiPolygon)")
    region_name: str = Field(default="Selected Region")
    mock: bool = Field(default=False, description="Force mock data (for testing)")


class AnalyzeResponse(BaseModel):
    region_name: str
    total_area_km2: float
    green_area_km2: float
    non_green_area_km2: float
    green_percentage: float
    ndvi_overlay_png: str          # base64 data URI
    green_mask_geojson: dict       # GeoJSON FeatureCollection
    note: Optional[str] = None    # Info note if region was clamped or mock used


# ── Geometry helpers ─────────────────────────────────────────────────────────

def _normalize_geometry(geojson_geom: dict) -> dict:
    """
    Ensure we always have a Polygon/MultiPolygon to work with.
    If Nominatim returns a Point or LineString, expand it to a small bbox.
    Uses a 0.05° (~5 km) half-size around the coordinate.
    """
    geo_type = geojson_geom.get("type", "")
    if geo_type in ("Polygon", "MultiPolygon"):
        return geojson_geom  # already usable

    from shapely.geometry import shape
    geom = shape(geojson_geom)
    b = geom.bounds  # (minx, miny, maxx, maxy)

    if b[0] == b[2] or b[1] == b[3]:  # degenerate (point)
        half = 0.05
        cx, cy = (b[0] + b[2]) / 2, (b[1] + b[3]) / 2
        b = (cx - half, cy - half, cx + half, cy + half)
    else:
        # Add a small padding so the bbox is at least 0.01° wide
        pad = max(0.005, (b[2] - b[0]) * 0.05)
        b = (b[0] - pad, b[1] - pad, b[2] + pad, b[3] + pad)

    w, s, e, n = b
    return {
        "type": "Polygon",
        "coordinates": [[[w, s], [e, s], [e, n], [w, n], [w, s]]],
    }


# ── Lazy imports (avoid startup crashes if rasterio env not set up) ────────────

def _run_real_pipeline(geojson_geom, bbox):
    """
    Run the full real Sentinel-2 NDVI pipeline.
    Returns (areas_dict, overlay_png, green_geojson, note) or raises.
    """
    from services.stac_service import fetch_sentinel2_bands
    from services.ndvi_service import run_ndvi_pipeline
    from services.area_service import compute_areas
    from utils.geojson_utils import vectorize_mask, bbox_from_geojson

    w, s, e, n = bbox
    span_x = e - w
    span_y = n - s
    was_clamped = span_x > 0.5 or span_y > 0.5
    note = None
    if was_clamped:
        note = (
            f"Region was very large ({span_x:.2f}° × {span_y:.2f}°). "
            "Analysis was performed on a 0.5° × 0.5° patch centred on the region "
            "to keep response time under 30 s."
        )

    red_arr, nir_arr, transform, crs_str = fetch_sentinel2_bands(geojson_geom, bbox)

    if red_arr is None or red_arr.size == 0:
        raise RuntimeError("No satellite data could be retrieved for this region.")

    ndvi, green_mask, overlay_png = run_ndvi_pipeline(red_arr, nir_arr)
    areas = compute_areas(green_mask, transform, crs_str)
    green_geojson = vectorize_mask(green_mask, transform, crs_str)

    return areas, overlay_png, green_geojson, note


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "service": "green-space-analyzer", "version": "2.1.0"}


@app.post("/api/analyze", response_model=AnalyzeResponse)
def analyze(req: AnalyzeRequest):
    """
    Run the full NDVI pipeline for the submitted GeoJSON polygon.
    Falls back to mock analysis if STAC is unavailable.
    """
    from utils.geojson_utils import bbox_from_geojson

    try:
        geojson_geom = _normalize_geometry(req.geojson)
        bbox = bbox_from_geojson(geojson_geom)

        if req.mock:
            raise RuntimeError("mock_requested")

        areas, overlay_png, green_geojson, note = _run_real_pipeline(geojson_geom, bbox)

        return AnalyzeResponse(
            region_name=req.region_name,
            total_area_km2=areas["total_area_km2"],
            green_area_km2=areas["green_area_km2"],
            non_green_area_km2=areas["non_green_area_km2"],
            green_percentage=areas["green_percentage"],
            ndvi_overlay_png=overlay_png,
            green_mask_geojson=green_geojson,
            note=note,
        )

    except HTTPException:
        raise
    except Exception as exc:
        # ── Fallback to mock data ─────────────────────────────────────────────
        traceback.print_exc()
        print(f"[WARN] Real pipeline failed ({exc}). Returning mock data.")
        try:
            from services.mock_service import generate_mock_result
            from utils.geojson_utils import bbox_from_geojson
            mock = generate_mock_result(req.geojson, req.region_name)
            return AnalyzeResponse(**mock)
        except Exception as mock_exc:
            traceback.print_exc()
            raise HTTPException(
                status_code=500,
                detail=f"Analysis failed and mock fallback also failed: {mock_exc}",
            )


# ── SSE Progress streaming endpoint ──────────────────────────────────────────

def _sse_event(event: str, data: dict) -> str:
    """Format a Server-Sent Events message."""
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


@app.get("/api/analyze/stream")
async def analyze_stream(geojson: str, region_name: str = "Selected Region"):
    """
    SSE endpoint: streams progress messages while running the NDVI pipeline.
    Falls back to mock data if real pipeline fails.

    Query params:
      geojson      – URL-encoded JSON string of the GeoJSON geometry
      region_name  – Display name
    """
    try:
        geojson_geom = json.loads(geojson)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid geojson parameter.")

    async def event_generator():
        loop = asyncio.get_event_loop()

        try:
            from utils.geojson_utils import bbox_from_geojson
            norm_geom = _normalize_geometry(geojson_geom)
            bbox = bbox_from_geojson(norm_geom)
            w, s, e, n = bbox
            span_x = e - w
            span_y = n - s
            was_clamped = span_x > 0.5 or span_y > 0.5

            yield _sse_event("progress", {
                "step": 1, "total": 5,
                "message": "🛰️ Searching Sentinel-2 satellite imagery…",
            })

            # Try real pipeline with timeout
            real_success = False
            areas = None
            overlay_png = None
            green_geojson = None
            note = None

            try:
                # Step 1: Download
                from services.stac_service import fetch_sentinel2_bands
                from services.ndvi_service import run_ndvi_pipeline
                from services.area_service import compute_areas
                from utils.geojson_utils import vectorize_mask

                result_tuple = await asyncio.wait_for(
                    loop.run_in_executor(
                        None,
                        fetch_sentinel2_bands,
                        norm_geom,
                        bbox,
                    ),
                    timeout=60.0,  # 60 second timeout for download
                )
                red_arr, nir_arr, transform, crs_str = result_tuple

                if red_arr is None or red_arr.size == 0:
                    raise RuntimeError("No satellite data could be retrieved for this region.")

                yield _sse_event("progress", {
                    "step": 2, "total": 5,
                    "message": "📡 Satellite bands downloaded. Computing NDVI…",
                })

                # Step 2: Compute NDVI
                ndvi, green_mask, overlay_png = await loop.run_in_executor(
                    None, run_ndvi_pipeline, red_arr, nir_arr
                )

                yield _sse_event("progress", {
                    "step": 3, "total": 5,
                    "message": "🌿 NDVI computed. Measuring green areas…",
                })

                # Step 3 & 4: Areas and Vectorization
                areas = await loop.run_in_executor(
                    None, compute_areas, green_mask, transform, crs_str
                )

                yield _sse_event("progress", {
                    "step": 4, "total": 5,
                    "message": "🗺️ Vectorising green space mask…",
                })

                green_geojson = await loop.run_in_executor(
                    None, vectorize_mask, green_mask, transform, crs_str
                )

                yield _sse_event("progress", {
                    "step": 5, "total": 5,
                    "message": "✅ Live satellite analysis complete!",
                })

                real_success = True

                if was_clamped and not note:
                    note = (
                        f"Large region ({span_x:.2f}°×{span_y:.2f}°) was clamped "
                        "to a 0.5°×0.5° patch for speed."
                    )

                result = {
                    "region_name": region_name,
                    "total_area_km2": areas["total_area_km2"],
                    "green_area_km2": areas["green_area_km2"],
                    "non_green_area_km2": areas["non_green_area_km2"],
                    "green_percentage": areas["green_percentage"],
                    "ndvi_overlay_png": overlay_png,
                    "green_mask_geojson": green_geojson,
                    "note": note,
                }
            except Exception as pipeline_exc:
                traceback.print_exc()
                print(f"[WARN] Stream pipeline failed: {pipeline_exc}. Falling back to mock data.")
                # ── Mock fallback ─────────────────────────────────────────────
                yield _sse_event("progress", {
                    "step": 2, "total": 5,
                    "message": "⚡ Generating estimated analysis (satellite unavailable)…",
                })

                from services.mock_service import generate_mock_result
                mock = await loop.run_in_executor(
                    None, generate_mock_result, norm_geom, region_name
                )

                yield _sse_event("progress", {
                    "step": 4, "total": 5,
                    "message": "📊 Calculating area statistics…",
                })
                yield _sse_event("progress", {
                    "step": 5, "total": 5,
                    "message": "✅ Estimated analysis ready.",
                })

                result = mock

            yield _sse_event("result", result)

        except Exception as exc:
            traceback.print_exc()
            yield _sse_event("error", {"message": str(exc)})

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


# ── Geocoding ─────────────────────────────────────────────────────────────────

@app.get("/api/search-region")
def search_region(q: str):
    """
    Search for a city/region boundary using Nominatim + OSM.
    Returns a GeoJSON Feature with the boundary polygon.
    """
    if not q or len(q.strip()) < 2:
        raise HTTPException(status_code=400, detail="Query too short.")

    nominatim_url = (
        f"https://nominatim.openstreetmap.org/search"
        f"?q={requests.utils.quote(q)}&format=json&limit=1&polygon_geojson=1"
    )
    headers = {"User-Agent": "GreenSpaceAnalyzer/2.0 (open-source project)"}

    try:
        nom_resp = requests.get(nominatim_url, headers=headers, timeout=15)
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Nominatim geocoding failed: {exc}")

    if nom_resp.status_code != 200 or not nom_resp.json():
        raise HTTPException(status_code=404, detail=f"Region '{q}' not found.")

    results = nom_resp.json()
    best    = results[0]

    display_name = best.get("display_name", q)
    geojson_geom = best.get("geojson")
    bb = best.get("boundingbox")  # [south, north, west, east]

    # Prefer the bounding-box polygon over a degenerate Point/LineString
    # because STAC searches reject points as region shapes.
    if geojson_geom and geojson_geom.get("type") not in ("Polygon", "MultiPolygon"):
        # Nominatim gave us a Point or LineString — use the bbox instead
        geojson_geom = None

    if not geojson_geom:
        if not bb:
            raise HTTPException(status_code=404, detail="No geometry returned for this region.")
        s, n, w, e = float(bb[0]), float(bb[1]), float(bb[2]), float(bb[3])
        geojson_geom = {
            "type": "Polygon",
            "coordinates": [[[w, s], [e, s], [e, n], [w, n], [w, s]]],
        }

    return {
        "type": "Feature",
        "geometry": geojson_geom,
        "properties": {
            "display_name": display_name,
            "osm_id":       best.get("osm_id"),
            "osm_type":     best.get("osm_type"),
            "class":        best.get("class"),
            "type":         best.get("type"),
        },
    }
