import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, ImageOverlay, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// Invisible component strictly for moving the map view to the target bounds globally
function MapController({ bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [50, 50], animate: true });
    }
  }, [bounds, map]);
  return null;
}

function App() {
  const [placeName, setPlaceName] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const handleAnalyze = async (e) => {
    e.preventDefault();
    if (!placeName.trim()) return;

    setLoading(true);
    setError(null);
    setData(null);

    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
      const response = await fetch(`${baseUrl}/api/map`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ placeName: placeName.trim() })
      });

      if (!response.ok) {
        throw new Error('Connection logic failed.');
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      setError('Connection to mapping network disconnected.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app-wrapper">
      
      {/* 1. Underlying Leaflet Map Engine Fullscreen */}
      <div className="map-container">
        <MapContainer 
          center={[20, 0]} 
          zoom={3} 
          scrollWheelZoom={true}
          style={{ height: "100%", width: "100%" }}
          zoomControl={false} // Hidden to remove clutter
        >
          {/* Base Dark/Modern Mapbox-like Layer from CartoDB */}
          <TileLayer
            attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
          
          {/* Sentinel Result Bounding Overlay */}
          {data && data.overlayBounds && data.mapUrl && (
            <>
              <MapController bounds={data.overlayBounds} />
              <ImageOverlay
                bounds={data.overlayBounds}
                url={data.mapUrl}
                opacity={0.8}
              />
            </>
          )}
        </MapContainer>
      </div>

      {/* 2. Floating Search Bar Overlay */}
      <div className="search-overlay">
        <form onSubmit={handleAnalyze} className="search-form">
          <input 
            type="text" 
            className="search-input"
            required 
            value={placeName} 
            onChange={(e) => setPlaceName(e.target.value)} 
            placeholder="Search city, region, benchmark..."
          />
          <button type="submit" className="search-btn" disabled={loading}>
            {loading ? 'Scanning...' : 'Analyze'}
          </button>
        </form>
      </div>

      {/* Ephemeral Error Notification */}
      {error && <div className="error-toast">{error}</div>}

      {/* 3. Floating Dashboard Metrics Panel */}
      {data && (
        <div className="dashboard-overlay">
          
          <div className="dashboard-header">
            <div className={`status-badge ${data.status === 'Fallback' ? 'fallback' : 'live'}`}>
              Mode: {data.status}
            </div>
            <h2 className="location-title">{data.placeName}</h2>
            {data.coordinates && (
              <p className="location-coords">
                Lat: {data.coordinates.lat} | Lng: {data.coordinates.lng}
              </p>
            )}
          </div>

          <div className="metrics-grid">
            <div className="metric-card wide">
              <span className="metric-label">Land Classification</span>
              <span className="metric-value">{data.landType}</span>
            </div>

            <div className="metric-card">
              <span className="metric-label">Green Area</span>
              <span className="metric-value" style={{ color: '#10b981'}}>{data.greenArea}</span>
            </div>
            
            <div className="metric-card">
              <span className="metric-label">Non-Green</span>
              <span className="metric-value" style={{ color: '#ef4444'}}>{data.nonGreenArea}</span>
            </div>
            
            <div className="metric-card">
              <span className="metric-label">Tree Cover</span>
              <span className="metric-value">{data.treeCover}</span>
            </div>
            
            <div className="metric-card">
              <span className="metric-label">Urban Density</span>
              <span className="metric-value">{data.urbanDensity}</span>
            </div>

            <div className="metric-card">
              <span className="metric-label">Water Body</span>
              <span className="metric-value" style={{ color: '#3b82f6'}}>{data.water}</span>
            </div>
            
            <div className="metric-card">
              <span className="metric-label">Soil Moisture</span>
              <span className="metric-value">{data.soilMoisture}</span>
            </div>

            <div className="metric-card wide" style={{ marginTop: '4px' }}>
              <span className="metric-label">Avg. NDVI</span>
              <span className="metric-value">{data.ndvi} <span style={{fontSize: '0.8rem', fontWeight: 400, color: '#94a3b8'}}>({data.vegetationDensity})</span></span>
            </div>
          </div>
          
        </div>
      )}
      
    </div>
  )
}

export default App;
