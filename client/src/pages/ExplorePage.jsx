import { useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Search, Loader2, Wind, Droplets, Activity, Trees, ExternalLink, CloudSun } from 'lucide-react';
import { computeBestTime } from '../utils/bestTime';

// Fix Leaflet marker icons in Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});
const greenIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34],
});

const TAG_EMOJI = {
    park: '🌳', garden: '🌸', nature_reserve: '🦋', recreation_ground: '⛳',
    forest: '🌲', grassland: '🍀', common: '🌿', wetland: '🌾'
};

function haversineDist(a, b) {
    const R = 6371;
    const dLat = (b.lat - a.lat) * Math.PI / 180;
    const dLng = (b.lng - a.lng) * Math.PI / 180;
    const lat1 = a.lat * Math.PI / 180;
    const lat2 = b.lat * Math.PI / 180;
    const x = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}
function formatDist(km) { return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`; }

function getAqiInfo(aqi) {
    if (aqi == null) return { label: 'Unknown', color: 'text-gray-500', bg: 'bg-gray-100 dark:bg-gray-800' };
    if (aqi <= 20) return { label: 'Good', color: 'text-green-600 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/30' };
    if (aqi <= 40) return { label: 'Fair', color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-100 dark:bg-yellow-900/30' };
    if (aqi <= 60) return { label: 'Moderate', color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-100 dark:bg-orange-900/30' };
    if (aqi <= 80) return { label: 'Poor', color: 'text-red-500 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/30' };
    if (aqi <= 100) return { label: 'Very Poor', color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-100 dark:bg-purple-900/30' };
    return { label: 'Hazardous', color: 'text-rose-700 dark:text-rose-400', bg: 'bg-rose-100 dark:bg-rose-900/30' };
}

function getWeatherDesc(code) {
    if (code === undefined || code === null) return 'Unknown';
    if (code === 0) return 'Clear';
    if ([1, 2, 3].includes(code)) return 'Partly cloudy';
    if ([45, 48].includes(code)) return 'Fog';
    if (code >= 51 && code <= 55) return 'Drizzle';
    if (code >= 61 && code <= 65) return 'Rain';
    if (code >= 71 && code <= 75) return 'Snow';
    if (code >= 80 && code <= 82) return 'Showers';
    if (code >= 95) return 'Thunderstorm';
    return 'Variable';
}

// Map tile change helper component
import { useMap } from 'react-leaflet';
function ChangeView({ center, zoom }) {
    const map = useMap();
    map.setView(center, zoom);
    return null;
}

export default function ExplorePage() {
    const [query, setQuery] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [sugLoading, setSugLoading] = useState(false);
    const [result, setResult] = useState(null); // { name, lat, lng, displayName }
    const [weather, setWeather] = useState(null);
    const [aqi, setAqi] = useState(null);
    const [bestTime, setBestTime] = useState(null);
    const [nearby, setNearby] = useState([]);
    const [dataLoading, setDataLoading] = useState(false);
    const [satelliteView, setSatelliteView] = useState(false);
    const debounceRef = useRef(null);

    const darkMode = document.body.classList.contains('dark');

    const card = darkMode
        ? 'bg-[#0f1f13]/80 border-green-900/40 text-green-100'
        : 'bg-white border-gray-100 text-gray-900';

    // Autocomplete via Nominatim
    const handleInput = (e) => {
        const val = e.target.value;
        setQuery(val);
        clearTimeout(debounceRef.current);
        if (!val.trim()) { setSuggestions([]); return; }
        debounceRef.current = setTimeout(async () => {
            setSugLoading(true);
            try {
                const res = await fetch(
                    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(val)}&format=json&limit=6`,
                    { headers: { 'Accept-Language': 'en' } }
                );
                const data = await res.json();
                setSuggestions(data);
            } catch { setSuggestions([]); }
            finally { setSugLoading(false); }
        }, 400);
    };

    const handleSelect = async (place) => {
        const lat = parseFloat(place.lat);
        const lng = parseFloat(place.lon);
        setQuery(place.display_name.split(',').slice(0, 2).join(', '));
        setSuggestions([]);
        setResult({ name: place.display_name.split(',')[0], displayName: place.display_name, lat, lng });
        setWeather(null); setAqi(null); setNearby([]); setBestTime(null);
        setDataLoading(true);

        // Weather + AQI + Forecast
        try {
            const [wRes, aRes] = await Promise.all([
                fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,weathercode&hourly=temperature_2m,uv_index&timezone=auto&forecast_days=7`),
                fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lng}&current=european_aqi`),
            ]);
            const wData = await wRes.json();
            const aData = await aRes.json();
            setWeather(wData.current);
            setAqi(aData.current);
            setBestTime(computeBestTime(wData.hourly, wData.daily, lat));
        } catch { /* silent fail */ }

        // Nearby places via Overpass
        const radius = 100000;
        const q = `[out:json][timeout:25];(way["leisure"~"^(park|garden|nature_reserve|recreation_ground)$"](around:${radius},${lat},${lng});node["leisure"~"^(park|garden|nature_reserve|recreation_ground)$"](around:${radius},${lat},${lng}););out center 20;`;
        const tryEndpoints = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];
        const fetchOverpass = (endpoints) => {
            if (!endpoints.length) { setDataLoading(false); return; }
            const [url, ...rest] = endpoints;
            fetch(url, { method: 'POST', body: q })
                .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
                .then(res => {
                    const places = res.elements
                        .filter(el => el.tags?.name?.trim())
                        .map(el => {
                            const pLat = el.lat ?? el.center?.lat;
                            const pLng = el.lon ?? el.center?.lon;
                            const type = el.tags?.leisure || el.tags?.landuse || 'green_space';
                            return { id: el.id, name: el.tags.name, type, emoji: TAG_EMOJI[type] || '🌿', lat: pLat, lng: pLng, distKm: haversineDist({ lat, lng }, { lat: pLat, lng: pLng }) };
                        })
                        .filter(p => p.lat && p.lng && p.distKm > 0.05)
                        .sort((a, b) => a.distKm - b.distKm)
                        .slice(0, 12);
                    setNearby(places);
                    setDataLoading(false);
                })
                .catch(() => fetchOverpass(rest));
        };
        fetchOverpass(tryEndpoints);
    };

    const aqiInfo = getAqiInfo(aqi?.european_aqi);

    return (
        <div className={`min-h-screen px-4 py-8 ${darkMode ? 'bg-[#0a150c]' : 'bg-gray-50'}`}>
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="mb-8 text-center">
                    <h1 className={`text-2xl font-bold mb-1 ${darkMode ? 'text-green-300' : 'text-green-800'}`}>
                        🔍 Explore Any Location
                    </h1>
                    <p className={`text-sm ${darkMode ? 'text-green-700' : 'text-gray-500'}`}>
                        Search any place to instantly see weather, AQI, map & nearby green spaces
                    </p>
                </div>

                {/* Search input */}
                <div className="relative mb-6">
                    <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-sm ${darkMode ? 'bg-[#111a14] border-green-900/40' : 'bg-white border-gray-200'}`}>
                        <Search size={18} className={darkMode ? 'text-green-500' : 'text-green-600'} />
                        <input
                            type="text"
                            value={query}
                            onChange={handleInput}
                            placeholder="Search any place, university, park, city…"
                            className={`flex-1 outline-none text-sm bg-transparent ${darkMode ? 'text-green-100 placeholder:text-green-800' : 'text-gray-800 placeholder:text-gray-400'}`}
                        />
                        {sugLoading && <Loader2 size={16} className="text-green-500 animate-spin" />}
                    </div>

                    {/* Suggestions dropdown */}
                    {suggestions.length > 0 && (
                        <div className={`absolute top-full mt-2 left-0 right-0 z-50 rounded-xl shadow-xl border overflow-hidden ${darkMode ? 'bg-[#111a14] border-green-900/40' : 'bg-white border-gray-100'}`}>
                            {suggestions.map((s) => (
                                <button
                                    key={s.place_id}
                                    onClick={() => handleSelect(s)}
                                    className={`w-full text-left px-4 py-3 text-sm flex items-start gap-2 transition-colors border-b last:border-0
                                        ${darkMode ? 'border-green-900/20 text-green-200 hover:bg-green-900/30' : 'border-gray-50 text-gray-700 hover:bg-green-50'}`}
                                >
                                    <span className="mt-0.5 text-base flex-shrink-0">📍</span>
                                    <span className="line-clamp-2">{s.display_name}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Loading shimmer */}
                {dataLoading && !weather && (
                    <div className={`rounded-2xl border p-6 flex items-center justify-center gap-3 ${card}`}>
                        <Loader2 size={20} className="animate-spin text-green-500" />
                        <span className={`text-sm ${darkMode ? 'text-green-600' : 'text-gray-500'}`}>
                            Loading weather, AQI & nearby places…
                        </span>
                    </div>
                )}

                {result && weather && (
                    <div className="space-y-4">
                        {/* Place name */}
                        <div className={`rounded-2xl border px-5 py-4 shadow ${card}`}>
                            <h2 className={`font-bold text-base ${darkMode ? 'text-green-300' : 'text-green-800'}`}>{result.name}</h2>
                            <p className={`text-xs mt-0.5 opacity-60 line-clamp-1`}>{result.displayName}</p>
                            <p className={`text-xs mt-1 font-mono opacity-40`}>{result.lat.toFixed(4)}, {result.lng.toFixed(4)}</p>
                        </div>

                        {/* Weather + AQI */}
                        <div className={`rounded-2xl border shadow p-4 ${card}`}>
                            <div className="flex flex-wrap gap-3">
                                <div className={`flex items-center gap-2 flex-1 min-w-[120px] p-3 rounded-xl ${darkMode ? 'bg-green-900/20' : 'bg-green-50'}`}>
                                    <CloudSun size={22} className="text-green-500" />
                                    <div>
                                        <p className={`text-[10px] font-semibold uppercase tracking-widest ${darkMode ? 'text-green-600' : 'text-gray-500'}`}>Temperature</p>
                                        <p className="text-sm font-bold">{Math.round(weather.temperature_2m)}°C <span className="text-xs font-normal opacity-60">({getWeatherDesc(weather.weather_code)})</span></p>
                                    </div>
                                </div>
                                <div className={`flex items-center gap-2 flex-1 min-w-[100px] p-3 rounded-xl ${darkMode ? 'bg-green-900/20' : 'bg-green-50'}`}>
                                    <Wind size={20} className="text-blue-400" />
                                    <div>
                                        <p className={`text-[10px] font-semibold uppercase tracking-widest ${darkMode ? 'text-green-600' : 'text-gray-500'}`}>Wind</p>
                                        <p className="text-sm font-bold">{weather.wind_speed_10m} km/h</p>
                                    </div>
                                </div>
                                <div className={`flex items-center gap-2 flex-1 min-w-[100px] p-3 rounded-xl ${darkMode ? 'bg-green-900/20' : 'bg-green-50'}`}>
                                    <Droplets size={20} className="text-blue-500" />
                                    <div>
                                        <p className={`text-[10px] font-semibold uppercase tracking-widest ${darkMode ? 'text-green-600' : 'text-gray-500'}`}>Humidity</p>
                                        <p className="text-sm font-bold">{weather.relative_humidity_2m}%</p>
                                    </div>
                                </div>
                                {aqi && (
                                    <div className={`flex items-center gap-2 flex-1 min-w-[120px] p-3 rounded-xl ${aqiInfo.bg}`}>
                                        <Activity size={20} className={aqiInfo.color} />
                                        <div>
                                            <p className={`text-[10px] font-semibold uppercase tracking-widest ${aqiInfo.color}`}>Air Quality</p>
                                            <p className={`text-sm font-bold ${aqiInfo.color}`}>{Math.round(aqi.european_aqi)} EAQI · {aqiInfo.label}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Best Time to Visit */}
                        {bestTime && (
                            <div className={`rounded-2xl border shadow ${card}`}>
                                <div className={`px-5 py-4 border-b ${darkMode ? 'border-green-900/40' : 'border-gray-100'}`}>
                                    <h3 className={`text-sm font-bold ${darkMode ? 'text-green-300' : 'text-gray-700'}`}>🕐 Best Time to Visit</h3>
                                    {bestTime.overallTip && <p className={`text-xs mt-0.5 ${darkMode ? 'text-green-600' : 'text-gray-400'}`}>{bestTime.overallTip}</p>}
                                </div>
                                <div className="p-4 space-y-4">
                                    {bestTime.bestTimeOfDay && (
                                        <div className={`flex items-start gap-3 p-3 rounded-xl ${darkMode ? 'bg-green-900/20' : 'bg-green-50'}`}>
                                            <span className="text-2xl">⏰</span>
                                            <div>
                                                <p className={`text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-green-500' : 'text-green-700'}`}>Best Time of Day</p>
                                                <p className={`text-sm font-semibold mt-0.5 ${darkMode ? 'text-green-100' : 'text-gray-800'}`}>{bestTime.bestTimeOfDay}</p>
                                                <p className="text-xs mt-0.5 opacity-60">{bestTime.timeReason}</p>
                                            </div>
                                        </div>
                                    )}
                                    {bestTime.bestDays.length > 0 && (
                                        <div>
                                            <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${darkMode ? 'text-green-600' : 'text-gray-400'}`}>Best Upcoming Days</p>
                                            <div className="grid grid-cols-3 gap-2">
                                                {bestTime.bestDays.map((d, i) => (
                                                    <div key={i} className={`p-3 rounded-xl text-center border ${darkMode ? 'bg-green-900/20 border-green-900/30' : 'bg-white border-gray-100'}`}>
                                                        <p className="text-xl mb-1">{d.emoji}</p>
                                                        <p className={`text-xs font-bold ${darkMode ? 'text-green-200' : 'text-gray-700'}`}>{d.label}</p>
                                                        <p className={`text-[11px] mt-0.5 ${darkMode ? 'text-green-500' : 'text-gray-500'}`}>{d.maxTemp}° / {d.minTemp}°</p>
                                                        <p className={`text-[11px] font-semibold mt-1 ${d.ratingColor}`}>{d.rating}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {bestTime.seasonalAdvice && (
                                        <div className={`text-xs p-3 rounded-xl ${darkMode ? 'bg-green-950/50 text-green-400' : 'bg-blue-50 text-blue-700'}`}>
                                            {bestTime.seasonalAdvice}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Map */}
                        <div className={`rounded-2xl border shadow overflow-hidden ${card}`}>
                            <div className={`px-5 py-3 border-b flex items-center justify-between ${darkMode ? 'border-green-900/40' : 'border-gray-100'}`}>
                                <h3 className={`text-sm font-semibold ${darkMode ? 'text-green-300' : 'text-gray-700'}`}>📍 Location on Map</h3>
                                <div className={`flex rounded-lg overflow-hidden text-xs font-semibold border ${darkMode ? 'border-green-900/50' : 'border-gray-200'}`}>
                                    <button onClick={() => setSatelliteView(false)} className={`px-3 py-1 transition-colors ${!satelliteView ? 'bg-green-500 text-white' : darkMode ? 'bg-green-950 text-green-400' : 'bg-white text-gray-600'}`}>🗺 Street</button>
                                    <button onClick={() => setSatelliteView(true)} className={`px-3 py-1 transition-colors ${satelliteView ? 'bg-green-500 text-white' : darkMode ? 'bg-green-950 text-green-400' : 'bg-white text-gray-600'}`}>🛰 Satellite</button>
                                </div>
                            </div>
                            <div style={{ height: 280 }}>
                                <MapContainer center={[result.lat, result.lng]} zoom={14} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
                                    <ChangeView center={[result.lat, result.lng]} zoom={14} />
                                    {satelliteView ? (
                                        <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" attribution="Tiles &copy; Esri" maxZoom={19} />
                                    ) : (
                                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
                                    )}
                                    <Marker position={[result.lat, result.lng]} icon={greenIcon}>
                                        <Popup>{result.name}</Popup>
                                    </Marker>
                                </MapContainer>
                            </div>
                        </div>

                        {/* Nearby green spaces */}
                        <div className={`rounded-2xl border shadow ${card}`}>
                            <div className={`px-5 py-4 border-b flex items-center justify-between ${darkMode ? 'border-green-900/40' : 'border-gray-100'}`}>
                                <div>
                                    <h3 className={`text-sm font-bold ${darkMode ? 'text-green-300' : 'text-gray-700'}`}>🗺️ Nearby Green Spaces</h3>
                                    <p className={`text-[11px] mt-0.5 ${darkMode ? 'text-green-700' : 'text-gray-400'}`}>Parks, gardens & nature reserves within 100 km</p>
                                </div>
                                {dataLoading && <Loader2 size={16} className="text-green-500 animate-spin" />}
                            </div>
                            <div className="p-4">
                                {!dataLoading && nearby.length === 0 && (
                                    <div className="text-center py-6">
                                        <Trees size={28} className="mx-auto text-green-300 mb-2" />
                                        <p className={`text-sm ${darkMode ? 'text-green-700' : 'text-gray-400'}`}>No nearby green spaces found</p>
                                    </div>
                                )}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {nearby.map(place => (
                                        <a key={place.id} href={`https://www.openstreetmap.org/?mlat=${place.lat}&mlon=${place.lng}&zoom=15`} target="_blank" rel="noopener noreferrer"
                                            className={`group flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 ${darkMode ? 'border-green-900/30 hover:border-green-700/60 hover:bg-green-900/20' : 'border-gray-100 hover:border-green-200 hover:bg-green-50'}`}>
                                            <div className={`w-10 h-10 flex-shrink-0 rounded-full flex items-center justify-center text-xl ${darkMode ? 'bg-green-900/40' : 'bg-green-50'}`}>{place.emoji}</div>
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-sm font-semibold truncate ${darkMode ? 'text-green-100' : 'text-gray-900'}`}>{place.name}</p>
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium capitalize ${darkMode ? 'bg-green-900/50 text-green-400' : 'bg-green-100 text-green-700'}`}>{place.type.replace('_', ' ')}</span>
                                                    <span className="text-[11px] font-medium text-green-500">{formatDist(place.distKm)}</span>
                                                </div>
                                            </div>
                                            <ExternalLink size={14} className={`flex-shrink-0 opacity-0 group-hover:opacity-60 transition-opacity ${darkMode ? 'text-green-400' : 'text-gray-400'}`} />
                                        </a>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Empty state */}
                {!result && !dataLoading && (
                    <div className="text-center py-16 opacity-50">
                        <Trees size={48} className="mx-auto text-green-400 mb-3" />
                        <p className={`text-sm ${darkMode ? 'text-green-700' : 'text-gray-400'}`}>
                            Type any place name above to explore its green environment
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
