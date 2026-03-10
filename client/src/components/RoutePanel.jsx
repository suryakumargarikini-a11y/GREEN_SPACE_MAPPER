import { useState, useRef, useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { Navigation, X, Search, RotateCcw, Clock, Milestone } from 'lucide-react';

/**
 * RoutePanel – Lets the user search a destination and draws a route
 * from their current location using the FREE OSRM routing engine.
 * No API key required.
 *
 * Props:
 *   userLocation  – { lat, lng } | null
 *   darkMode      – boolean
 *   onClose       – () => void
 */
export default function RoutePanel({ userLocation, darkMode, onClose }) {
    const map = useMap();
    const routeLayerRef = useRef(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [routeInfo, setRouteInfo] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [travelMode, setTravelMode] = useState('car'); // OSRM profiles: car, foot

    // ── Geocode query using Nominatim (free OSM geocoding) ─────────────────
    const searchPlaces = async (q) => {
        if (!q || q.length < 2) { setSuggestions([]); return; }
        try {
            const res = await fetch(
                `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5`,
                { headers: { 'Accept-Language': 'en' } }
            );
            const data = await res.json();
            setSuggestions(data.map(d => ({
                name: d.display_name,
                lat: parseFloat(d.lat),
                lng: parseFloat(d.lon),
            })));
        } catch { setSuggestions([]); }
    };

    // Debounce search
    const searchTimeout = useRef(null);
    const handleInput = (e) => {
        setSearchQuery(e.target.value);
        clearTimeout(searchTimeout.current);
        searchTimeout.current = setTimeout(() => searchPlaces(e.target.value), 400);
    };

    // ── Draw route using OSRM ───────────────────────────────────────────────
    const calculateRoute = async (dest) => {
        setSuggestions([]);
        if (!userLocation) {
            setError('Your location is not available. Please enable browser location access.');
            return;
        }
        setLoading(true);
        setError('');
        setRouteInfo(null);
        clearRouteLayer();

        const { lat: sLat, lng: sLng } = userLocation;
        const url = `https://router.project-osrm.org/route/v1/${travelMode}/${sLng},${sLat};${dest.lng},${dest.lat}?overview=full&geometries=geojson&steps=true`;

        try {
            const res = await fetch(url);
            const data = await res.json();
            if (data.code !== 'Ok' || !data.routes.length) {
                setError('Could not find a route to that destination.');
                setLoading(false);
                return;
            }
            const route = data.routes[0];
            const coords = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);

            // Draw polyline on map
            const polyline = L.polyline(coords, {
                color: '#22c55e',
                weight: 5,
                opacity: 0.85,
            });
            polyline.addTo(map);
            routeLayerRef.current = polyline;
            map.fitBounds(polyline.getBounds(), { padding: [40, 40] });

            // Extract step instructions
            const steps = route.legs[0].steps.slice(0, 6).map(s => ({
                instructions: s.maneuver.type + (s.name ? ` onto ${s.name}` : ''),
            }));

            const distKm = (route.distance / 1000).toFixed(1);
            const mins = Math.round(route.duration / 60);
            setRouteInfo({
                distance: `${distKm} km`,
                duration: mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins} min`,
                destination: dest.name,
                steps,
            });
        } catch {
            setError('Routing service unavailable. Please try again.');
        }
        setLoading(false);
    };

    const clearRouteLayer = () => {
        if (routeLayerRef.current) {
            map.removeLayer(routeLayerRef.current);
            routeLayerRef.current = null;
        }
    };

    const clearRoute = () => {
        clearRouteLayer();
        setRouteInfo(null);
        setError('');
        setSearchQuery('');
        setSuggestions([]);
    };

    // Cleanup on unmount
    useEffect(() => () => clearRouteLayer(), []); // eslint-disable-line

    const card = darkMode
        ? 'bg-[#111a14] border-green-900/40 text-green-100'
        : 'bg-white border-gray-100 text-gray-900';
    const inputCls = darkMode
        ? 'bg-[#0a1a0e] border-green-900/50 text-green-100 placeholder:text-green-800'
        : 'bg-gray-50 border-gray-200 placeholder:text-gray-400';

    // Popular destinations
    const POPULAR = [
        { name: 'Central Park, NY', lat: 40.7812, lng: -73.9665 },
        { name: 'Hyde Park, London', lat: 51.5073, lng: -0.1657 },
        { name: 'Cubbon Park, BLR', lat: 12.9763, lng: 77.5929 },
        { name: 'Lodi Garden, DEL', lat: 28.5931, lng: 77.2196 },
    ];

    return (
        <div className={`absolute top-4 right-4 z-[600] w-80 rounded-2xl border shadow-2xl overflow-hidden ${card}`}>
            {/* Header */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-inherit bg-gradient-to-r from-green-500 to-emerald-600">
                <Navigation size={16} className="text-white" />
                <h3 className="text-white font-bold text-sm flex-1">Route Planner</h3>
                <button onClick={() => { clearRoute(); onClose(); }} className="text-white/80 hover:text-white transition-colors">
                    <X size={16} />
                </button>
            </div>

            <div className="p-4 space-y-3">
                {/* Origin */}
                <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs border ${darkMode ? 'border-green-900/40 bg-[#0a1a0e]' : 'border-gray-100 bg-gray-50'}`}>
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500 flex-shrink-0" />
                    <span className={darkMode ? 'text-green-400' : 'text-gray-500'}>
                        {userLocation ? 'Your current location' : '⚠️ Location not detected'}
                    </span>
                </div>

                {/* Destination search */}
                <div className="relative">
                    <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm ${inputCls}`}>
                        <Search size={14} className="text-green-500 flex-shrink-0" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={handleInput}
                            placeholder="Search destination…"
                            className="flex-1 border-none outline-none bg-transparent text-sm"
                        />
                    </div>
                    {/* Autocomplete dropdown */}
                    {suggestions.length > 0 && (
                        <div className={`absolute top-full left-0 right-0 mt-1 rounded-xl border shadow-xl z-10 overflow-hidden
                            ${darkMode ? 'bg-[#111a14] border-green-900/40' : 'bg-white border-gray-200'}`}>
                            {suggestions.map((s, i) => (
                                <button key={i}
                                    onClick={() => { setSearchQuery(s.name.split(',').slice(0, 2).join(',')); calculateRoute(s); }}
                                    className={`w-full text-left px-3 py-2 text-xs border-b last:border-b-0 transition-colors
                                        ${darkMode ? 'border-green-900/30 text-green-200 hover:bg-green-900/30' : 'border-gray-100 text-gray-700 hover:bg-green-50'}`}>
                                    📍 {s.name.length > 60 ? s.name.slice(0, 60) + '…' : s.name}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Travel mode */}
                <div className="flex gap-1.5">
                    {[{ id: 'car', label: '🚗 Driving' }, { id: 'foot', label: '🚶 Walking' }].map(({ id, label }) => (
                        <button key={id}
                            onClick={() => { setTravelMode(id); clearRoute(); }}
                            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all
                                ${travelMode === id
                                    ? 'bg-green-500 border-green-500 text-white'
                                    : darkMode
                                        ? 'border-green-900/50 text-green-500 hover:border-green-600'
                                        : 'border-gray-200 text-gray-500 hover:border-green-300'
                                }`}>
                            {label}
                        </button>
                    ))}
                </div>

                {/* Popular destinations */}
                {!routeInfo && !loading && (
                    <div className="pt-1">
                        <p className={`text-[10px] uppercase font-bold tracking-wider mb-2 ${darkMode ? 'text-green-800' : 'text-gray-400'}`}>
                            Popular Green Spaces
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                            {POPULAR.map(place => (
                                <button key={place.name}
                                    onClick={() => { setSearchQuery(place.name); calculateRoute(place); }}
                                    className={`text-[11px] px-2 py-1 rounded-full border transition-all
                                        ${darkMode ? 'bg-green-900/20 border-green-800/50 text-green-400 hover:bg-green-800/40'
                                            : 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100'}`}>
                                    {place.name}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Loading */}
                {loading && (
                    <div className="flex items-center gap-2 text-sm text-green-500 py-2">
                        <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                        Calculating route…
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div className="text-xs text-red-400 bg-red-100/10 border border-red-400/20 rounded-xl px-3 py-2">
                        {error}
                    </div>
                )}

                {/* Route result */}
                {routeInfo && (
                    <div className={`rounded-xl border p-3 space-y-2 ${darkMode ? 'border-green-800/50 bg-green-900/20' : 'border-green-200 bg-green-50'}`}>
                        <div className="flex gap-3">
                            <div className="flex items-center gap-1.5">
                                <Milestone size={14} className="text-green-500" />
                                <span className="font-bold text-green-600">{routeInfo.distance}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Clock size={14} className="text-green-500" />
                                <span className={`font-bold ${darkMode ? 'text-green-300' : 'text-gray-700'}`}>{routeInfo.duration}</span>
                            </div>
                        </div>

                        <div className={`text-xs ${darkMode ? 'text-green-500' : 'text-gray-500'}`}>
                            <div className="flex gap-1.5 items-start mb-0.5">
                                <span className="text-blue-400 mt-0.5">●</span>
                                <span className="line-clamp-1">Your current location</span>
                            </div>
                            <div className="flex gap-1.5 items-start">
                                <span className="text-red-400 mt-0.5">●</span>
                                <span className="line-clamp-1">{routeInfo.destination}</span>
                            </div>
                        </div>

                        {routeInfo.steps.length > 0 && (
                            <div className={`text-xs space-y-1.5 pt-2 border-t ${darkMode ? 'border-green-800/40' : 'border-green-200'}`}>
                                {routeInfo.steps.map((step, i) => (
                                    <div key={i} className={`flex gap-2 ${darkMode ? 'text-green-400' : 'text-gray-600'}`}>
                                        <span className="flex-shrink-0 w-4 h-4 rounded-full bg-green-500/20 text-green-600 flex items-center justify-center text-[10px] font-bold">
                                            {i + 1}
                                        </span>
                                        <span className="line-clamp-2 capitalize">{step.instructions}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        <button onClick={clearRoute}
                            className={`flex items-center gap-1.5 text-xs font-medium mt-1 transition-colors
                                ${darkMode ? 'text-green-600 hover:text-green-400' : 'text-gray-400 hover:text-gray-600'}`}>
                            <RotateCcw size={11} /> Clear route
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
