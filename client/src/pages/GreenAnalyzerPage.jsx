/**
 * GreenAnalyzerPage.jsx
 *
 * Full-page Green Space Analyzer:
 *  - City search via Nominatim
 *  - Interactive Leaflet map with polygon draw tool (leaflet-draw)
 *  - NDVI-based green overlay rendered on map after analysis
 *  - AnalyticsPanel for stats
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  useMap,
  FeatureGroup,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import { EditControl } from 'react-leaflet-draw';

import { Search, BarChart2, Trash2, AlertCircle } from 'lucide-react';
import AnalyticsPanel from '../components/AnalyticsPanel';
import { useGreenAnalyzer } from '../hooks/useGreenAnalyzer';

// Fix Leaflet default marker icon paths (Vite asset hashing workaround)
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Sub-component: flies the map to a given GeoJSON feature                   */
/* ─────────────────────────────────────────────────────────────────────────── */
function FlyToFeature({ feature }) {
  const map = useMap();
  useEffect(() => {
    if (!feature) return;
    try {
      const layer = L.geoJSON(feature);
      const bounds = layer.getBounds();
      if (bounds.isValid()) map.flyToBounds(bounds, { padding: [30, 30], duration: 1.2 });
    } catch {/* ignore */}
  }, [feature, map]);
  return null;
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Main Page                                                                  */
/* ─────────────────────────────────────────────────────────────────────────── */
export default function GreenAnalyzerPage() {
  /* Dark mode (reads from body class, same pattern as rest of app) */
  const [darkMode, setDarkMode] = useState(() =>
    document.body.classList.contains('dark')
  );
  useEffect(() => {
    const obs = new MutationObserver(() =>
      setDarkMode(document.body.classList.contains('dark'))
    );
    obs.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

  /* Analyzer hook */
  const { result, loading, error, progress, analyzeRegion, searchRegion, reset } = useGreenAnalyzer();

  /* Search state */
  const [searchQuery, setSearchQuery]       = useState('');
  const [searchLoading, setSearchLoading]   = useState(false);
  const [searchError, setSearchError]       = useState('');
  const [regionFeature, setRegionFeature]   = useState(null); // GeoJSON Feature for fly-to

  /* Drawn polygon state */
  const [drawnPolygon, setDrawnPolygon]     = useState(null); // GeoJSON geometry
  const [regionName, setRegionName]         = useState('');
  const featureGroupRef                      = useRef(null);

  /* ── Search handler ────────────────────────────────────────────────────── */
  const handleSearch = async (e) => {
    e?.preventDefault();
    if (!searchQuery.trim()) return;
    setSearchLoading(true);
    setSearchError('');
    reset();
    setDrawnPolygon(null);

    const feature = await searchRegion(searchQuery.trim());
    setSearchLoading(false);

    if (!feature) {
      setSearchError(`Region "${searchQuery}" not found. Try a different name.`);
      return;
    }
    setRegionFeature(feature);
    setDrawnPolygon(feature.geometry);
    setRegionName(feature.properties?.display_name || searchQuery);
  };

  /* ── Leaflet-draw handlers ─────────────────────────────────────────────── */
  const handleDrawCreated = useCallback((e) => {
    const layer = e.layer;
    const geojson = layer.toGeoJSON();
    setDrawnPolygon(geojson.geometry);
    setRegionName('Custom Polygon');
    setRegionFeature(null);
    reset();
    // Clear previous drawn layers
    const fg = featureGroupRef.current;
    if (fg) {
      fg.clearLayers();
      fg.addLayer(layer);
    }
  }, [reset]);

  const handleClear = useCallback(() => {
    setDrawnPolygon(null);
    setRegionFeature(null);
    setRegionName('');
    setSearchQuery('');
    setSearchError('');
    reset();
    const fg = featureGroupRef.current;
    if (fg) fg.clearLayers();
  }, [reset]);

  /* ── Analyze handler ───────────────────────────────────────────────────── */
  const handleAnalyze = useCallback(async () => {
    if (!drawnPolygon) return;
    await analyzeRegion(drawnPolygon, regionName || 'Selected Region');
  }, [drawnPolygon, regionName, analyzeRegion]);

  /* ── Styles ────────────────────────────────────────────────────────────── */
  const panel = `h-full overflow-hidden flex flex-col border-r
    ${darkMode ? 'bg-[#111a14] border-green-900/40' : 'bg-white border-green-100'}`;
  const input = `w-full px-3 py-2 rounded-xl text-sm border outline-none transition-all duration-200
    ${darkMode
      ? 'bg-[#1a2a1e] border-green-900/50 text-green-100 placeholder-green-700 focus:border-green-500'
      : 'bg-green-50 border-green-200 text-green-900 placeholder-green-400 focus:border-green-500'}`;

  /* ── GeoJSON overlay styles ─────────────────────────────────────────────── */
  const greenStyle = { fillColor: '#22c55e', color: '#16a34a', weight: 1, fillOpacity: 0.45 };
  const regionStyle = { fillColor: '#22c55e', color: '#15803d', weight: 2, fillOpacity: 0.1 };

  return (
    <div
      className="flex flex-col md:flex-row overflow-hidden"
      style={{ height: 'calc(100vh - 64px)' }}
    >
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/*  LEFT PANEL — search + controls                                    */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <aside className={`${panel} w-full md:w-72 flex-shrink-0`}>
        {/* Header */}
        <div className={`px-4 pt-4 pb-3 border-b
          ${darkMode ? 'border-green-900/30' : 'border-green-100'}`}>
          <div className="flex items-center gap-2 mb-0.5">
            <BarChart2 size={18} className="text-green-500" />
            <h1 className={`font-bold text-base ${darkMode ? 'text-green-100' : 'text-green-900'}`}>
              Green Space Analyzer
            </h1>
          </div>
          <p className={`text-xs leading-relaxed ${darkMode ? 'text-green-600' : 'text-green-500'}`}>
            Search a city or draw a polygon, then analyze green coverage using real Sentinel-2 satellite data.
          </p>
        </div>

        {/* Search */}
        <div className="px-4 py-3">
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              id="analyzer-search"
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search city or region…"
              className={input}
            />
            <button
              type="submit"
              disabled={searchLoading || !searchQuery.trim()}
              className="flex-shrink-0 p-2 rounded-xl bg-green-500 text-white
                hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed
                transition-colors duration-200 shadow-sm"
              title="Search region"
            >
              {searchLoading
                ? <span className="block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                : <Search size={16} />
              }
            </button>
          </form>

          {searchError && (
            <div className={`mt-2 flex items-start gap-1.5 text-xs rounded-lg px-3 py-2
              ${darkMode ? 'bg-red-900/30 text-red-300' : 'bg-red-50 text-red-600'}`}>
              <AlertCircle size={13} className="flex-shrink-0 mt-0.5" />
              {searchError}
            </div>
          )}
        </div>

        {/* Draw hint */}
        <div className={`mx-4 rounded-xl px-3 py-2.5 text-xs border
          ${darkMode ? 'bg-[#0a1a0d] border-green-950 text-green-600' : 'bg-green-50 border-green-100 text-green-600'}`}>
          <span className="font-semibold">Or draw a polygon</span> on the map using the
          toolbar on the left side of the map.
        </div>

        {/* Selected region info */}
        {drawnPolygon && (
          <div className={`mx-4 mt-3 rounded-xl px-3 py-2.5 text-xs border fade-up
            ${darkMode ? 'bg-green-900/20 border-green-900/40 text-green-300' : 'bg-green-50 border-green-200 text-green-700'}`}>
            <div className="font-semibold truncate">{regionName || 'Custom Polygon'}</div>
            <div className={`mt-0.5 ${darkMode ? 'text-green-600' : 'text-green-500'}`}>
              Polygon ready for analysis
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="px-4 py-3 flex flex-col gap-2 mt-auto">
          <button
            id="analyze-btn"
            onClick={handleAnalyze}
            disabled={!drawnPolygon || loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl
              text-sm font-semibold bg-green-500 text-white
              hover:bg-green-600 active:scale-95
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-all duration-200 shadow"
          >
            {loading ? (
              <>
                <span className="block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Analyzing…
              </>
            ) : (
              <>
                <BarChart2 size={16} />
                Analyze Region
              </>
            )}
          </button>

          {(drawnPolygon || result) && (
            <button
              onClick={handleClear}
              className={`w-full flex items-center justify-center gap-2 py-2 rounded-xl
                text-sm font-medium border transition-all duration-200
                ${darkMode
                  ? 'border-green-900 text-green-500 hover:bg-green-900/30'
                  : 'border-green-200 text-green-600 hover:bg-green-50'}`}
            >
              <Trash2 size={14} />
              Clear
            </button>
          )}
        </div>
      </aside>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/*  MAP                                                                */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 relative" id="map-container">
        <MapContainer
          center={[20, 0]}
          zoom={2}
          style={{ height: '100%', width: '100%' }}
          zoomControl
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Fly to searched region */}
          {regionFeature && <FlyToFeature feature={regionFeature} />}

          {/* Region boundary overlay */}
          {regionFeature && (
            <GeoJSON
              key={JSON.stringify(regionFeature.geometry)}
              data={regionFeature}
              style={regionStyle}
            />
          )}

          {/* Green mask overlay (after analysis) */}
          {result?.green_mask_geojson?.features?.length > 0 && (
            <GeoJSON
              key={`green-${result.region_name}-${result.green_percentage}`}
              data={result.green_mask_geojson}
              style={greenStyle}
            />
          )}

          {/* Polygon draw tool */}
          <FeatureGroup ref={featureGroupRef}>
            <EditControl
              position="topleft"
              onCreated={handleDrawCreated}
              draw={{
                rectangle: false,
                circle: false,
                circlemarker: false,
                marker: false,
                polyline: false,
                polygon: {
                  allowIntersection: false,
                  showArea: true,
                  shapeOptions: { color: '#22c55e', fillOpacity: 0.15 },
                },
              }}
              edit={{ remove: false }}
            />
          </FeatureGroup>
        </MapContainer>

        {/* Loading overlay on map */}
        {loading && (
          <div className="absolute inset-0 z-[500] flex flex-col items-center justify-center gap-3
            bg-black/40 backdrop-blur-sm">
            <div className="bg-white/95 dark:bg-[#111a14] rounded-2xl shadow-2xl px-8 py-6 flex flex-col items-center gap-3 text-center">
              <div className="w-10 h-10 border-4 border-green-200 border-t-green-500 rounded-full animate-spin" />
              <p className="text-sm font-semibold text-green-800 dark:text-green-300">
                Processing satellite data…
              </p>
              {progress && (
                <div className="w-full max-w-[220px] mt-2">
                  <p className="text-xs text-green-600 dark:text-green-500 mb-2">
                    {progress.message}
                  </p>
                  <div className="w-full h-1.5 bg-green-100 dark:bg-green-900/50 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-500 transition-all duration-300 ease-out"
                      style={{ width: `${(progress.step / progress.total) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/*  RIGHT PANEL — AnalyticsPanel                                      */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <aside className={`w-full md:w-80 flex-shrink-0 border-l overflow-y-auto
        ${darkMode ? 'bg-[#111a14] border-green-900/40' : 'bg-white border-green-100'}`}>
        <AnalyticsPanel
          result={result}
          loading={loading}
          error={error}
          progress={progress}
          onReset={handleClear}
          darkMode={darkMode}
        />
      </aside>
    </div>
  );
}
