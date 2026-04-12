"""
Quick test: search-region → analyze pipeline
Tests a small park (Lalbagh) to keep download size minimal.
"""
import json
import sys
import requests

BASE = "http://localhost:8000"

# ── 1. Health ──────────────────────────────────────────────────────────────────
print("1) Checking health...")
r = requests.get(f"{BASE}/health", timeout=10)
assert r.status_code == 200, f"Health failed: {r.text}"
print("   ✅ Health OK:", r.json())

# ── 2. Search region ───────────────────────────────────────────────────────────
print("\n2) Searching for Lalbagh Botanical Garden, Bangalore...")
r = requests.get(f"{BASE}/api/search-region", params={"q": "Lalbagh Bengaluru"}, timeout=20)
assert r.status_code == 200, f"Search failed {r.status_code}: {r.text[:300]}"
feature = r.json()
print(f"   ✅ Found: {feature['properties']['display_name'][:70]}")
print(f"   Geometry type: {feature['geometry']['type']}")

# ── 3. Analyze ─────────────────────────────────────────────────────────────────
print("\n3) Running NDVI analysis (this may take 20-60s for first run)...")
payload = {
    "geojson": feature["geometry"],
    "region_name": feature["properties"]["display_name"]
}
r = requests.post(f"{BASE}/api/analyze", json=payload, timeout=180)
if r.status_code != 200:
    print(f"   ❌ FAILED {r.status_code}: {r.text[:500]}")
    sys.exit(1)

result = r.json()
print(f"   ✅ Analysis complete!")
print(f"   Region:          {result['region_name'][:60]}")
print(f"   Total area:      {result['total_area_km2']:.4f} km²")
print(f"   Green area:      {result['green_area_km2']:.4f} km²")
print(f"   Non-green area:  {result['non_green_area_km2']:.4f} km²")
print(f"   Green coverage:  {result['green_percentage']:.2f}%")
print(f"   Overlay PNG:     {'present ✅' if result['ndvi_overlay_png'].startswith('data:') else 'MISSING ❌'}")
fc = result.get("green_mask_geojson", {})
n_features = len(fc.get("features", []))
print(f"   GeoJSON features: {n_features} polygon(s)")

print("\n🎉 All tests passed! The analyzer is working correctly.")
