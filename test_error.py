"""Capture exact error from analyze endpoint."""
import requests, json

BASE = "http://localhost:8000"

# Use a tiny hard-coded polygon (small park area in Bengaluru)
# ~1km² bounding box around Lalbagh
small_polygon = {
    "type": "Polygon",
    "coordinates": [[
        [77.578, 12.942],
        [77.587, 12.942],
        [77.587, 12.952],
        [77.578, 12.952],
        [77.578, 12.942],
    ]]
}

print("Posting small Lalbagh polygon for analysis...")
r = requests.post(
    f"{BASE}/api/analyze",
    json={"geojson": small_polygon, "region_name": "Lalbagh Test"},
    timeout=300
)
print(f"Status: {r.status_code}")
try:
    data = r.json()
    if r.status_code == 200:
        print("✅ SUCCESS!")
        print(f"  Total area:     {data['total_area_km2']:.4f} km²")
        print(f"  Green area:     {data['green_area_km2']:.4f} km²")
        print(f"  Green coverage: {data['green_percentage']:.2f}%")
        print(f"  Overlay PNG:    {'OK' if data['ndvi_overlay_png'].startswith('data:') else 'MISSING'}")
        print(f"  GeoJSON polys:  {len(data['green_mask_geojson'].get('features',[]))}")
    else:
        print(f"❌ ERROR: {json.dumps(data, indent=2)}")
except Exception as e:
    print(f"Parse error: {e}")
    print(r.text[:2000])
