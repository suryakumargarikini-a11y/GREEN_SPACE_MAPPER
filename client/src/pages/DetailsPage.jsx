import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { computeBestTime } from '../utils/bestTime';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import {
    ArrowLeft, Loader2, Trees, AlertCircle,
    MapPin, Ruler, Edit, Trash2, CloudSun, Wind, Droplets, Activity, ExternalLink
} from 'lucide-react';

function haversineDist(a, b) {
    const R = 6371;
    const dLat = (b.lat - a.lat) * Math.PI / 180;
    const dLng = (b.lng - a.lng) * Math.PI / 180;
    const lat1 = a.lat * Math.PI / 180;
    const lat2 = b.lat * Math.PI / 180;
    const x = Math.sin(dLat/2)**2 + Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLng/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1-x));
}

function formatDist(km) {
    return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

const TAG_EMOJI = {
    park: '🌳', garden: '🌸', nature_reserve: '🦋', recreation_ground: '⛳',
    forest: '🌲', grassland: '🍀', common: '🌿', wetland: '🌾'
};

// Fix default leaflet marker icon (broken in Vite bundlers)
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

const FACILITY_ICONS = {
    playground: { emoji: '🛝', color: '#f59e0b' },
    walking_track: { emoji: '🚶', color: '#3b82f6' },
    garden: { emoji: '🌸', color: '#22c55e' },
    benches: { emoji: '🪑', color: '#8b5cf6' },
    sports_area: { emoji: '⚽', color: '#ef4444' },
};

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
    if (code === 1 || code === 2 || code === 3) return 'Partly cloudy';
    if (code === 45 || code === 48) return 'Fog';
    if (code >= 51 && code <= 55) return 'Drizzle';
    if (code >= 61 && code <= 65) return 'Rain';
    if (code >= 71 && code <= 75) return 'Snow';
    if (code >= 80 && code <= 82) return 'Showers';
    if (code >= 95) return 'Thunderstorm';
    return 'Variable';
}

export default function DetailsPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [space, setSpace] = useState(null);
    const [weather, setWeather] = useState(null);
    const [aqi, setAqi] = useState(null);
    const [nearbyPlaces, setNearbyPlaces] = useState([]);
    const [nearbyLoading, setNearbyLoading] = useState(false);
    const [bestTime, setBestTime] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [deleting, setDeleting] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);

    const [darkMode, setDarkMode] = useState(() => document.body.classList.contains('dark'));
    const [satelliteView, setSatelliteView] = useState(false);
    useEffect(() => {
        const obs = new MutationObserver(() => setDarkMode(document.body.classList.contains('dark')));
        obs.observe(document.body, { attributes: true, attributeFilter: ['class'] });
        return () => obs.disconnect();
    }, []);

    // ── Fetch space by id, Weather/AQI, and Nearby Places ───────────────────
    useEffect(() => {
        const load = async () => {
            try {
                const { data } = await axios.get(`/api/spaces/${id}`);
                setSpace(data);
                
                if (data.location) {
                    const { lat, lng } = data.location;

                    // Weather + AQI + Forecast (parallel, fire-and-forget)
                    Promise.all([
                        axios.get(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,weathercode&hourly=temperature_2m,uv_index&timezone=auto&forecast_days=7`),
                        axios.get(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lng}&current=european_aqi`)
                    ]).then(([wRes, aRes]) => {
                        setWeather(wRes.data.current);
                        setAqi(aRes.data.current);
                        setBestTime(computeBestTime(wRes.data.hourly, wRes.data.daily, lat));
                    }).catch(err => console.error("Could not fetch weather data", err));

                    // Nearby Places via Overpass API (100 km radius)
                    setNearbyLoading(true);
                    const radius = 100000; // 100 km in metres
                    const query = `[out:json][timeout:25];(way["leisure"~"^(park|garden|nature_reserve|recreation_ground)$"](around:${radius},${lat},${lng});node["leisure"~"^(park|garden|nature_reserve|recreation_ground)$"](around:${radius},${lat},${lng});way["landuse"~"^(forest|grass|meadow|grassland)$"]["name"](around:${radius},${lat},${lng}););out center 25;`;
                    
                    const tryEndpoints = [
                        'https://overpass-api.de/api/interpreter',
                        'https://overpass.kumi.systems/api/interpreter',
                    ];
                    
                    const fetchOverpass = (endpoints) => {
                        if (endpoints.length === 0) { setNearbyLoading(false); return; }
                        const [url, ...rest] = endpoints;
                        fetch(url, { method: 'POST', body: query })
                            .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
                            .then(res => {
                                const places = res.elements
                                    .filter(el => el.tags?.name?.trim())
                                    .map(el => {
                                        const placeLat = el.lat ?? el.center?.lat;
                                        const placeLng = el.lon ?? el.center?.lon;
                                        const leisure = el.tags?.leisure || '';
                                        const landuse = el.tags?.landuse || '';
                                        const type = leisure || landuse || 'green_space';
                                        const emoji = TAG_EMOJI[type] || '🌿';
                                        const distKm = haversineDist({ lat, lng }, { lat: placeLat, lng: placeLng });
                                        return { id: el.id, name: el.tags.name, type, emoji, lat: placeLat, lng: placeLng, distKm };
                                    })
                                    .filter(p => p.lat && p.lng && p.distKm > 0.05)
                                    .sort((a, b) => a.distKm - b.distKm)
                                    .slice(0, 14);
                                setNearbyPlaces(places);
                                setNearbyLoading(false);
                            })
                            .catch(() => fetchOverpass(rest));
                    };
                    fetchOverpass(tryEndpoints);
                }
            } catch {
                setError('Could not load this green space.');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [id]);

    // ── Delete handler ───────────────────────────────────────────────────────
    const handleDelete = async () => {
        setDeleting(true);
        try {
            await axios.delete(`/api/spaces/${id}`);
            navigate('/');
        } catch {
            setError('Failed to delete. Please try again.');
            setDeleting(false);
            setConfirmDelete(false);
        }
    };

    const base = darkMode ? 'bg-[#0a0f0d] text-green-100' : 'bg-green-50 text-gray-900';
    const card = darkMode ? 'bg-[#111a14] border-green-900/40' : 'bg-white border-green-100';

    if (loading) return (
        <div className={`flex-1 flex items-center justify-center ${base}`}>
            <Loader2 size={36} className="text-green-500 animate-spin" />
        </div>
    );

    if (error || !space) return (
        <div className={`flex-1 flex flex-col items-center justify-center gap-4 ${base}`}>
            <AlertCircle size={40} className="text-red-400" />
            <p className="text-base">{error || 'Space not found.'}</p>
            <Link to="/" className="text-green-500 hover:underline text-sm">← Back to Map</Link>
        </div>
    );
    
    const aqiInfo = getAqiInfo(aqi?.european_aqi);

    return (
        <div className={`min-h-screen ${base} pb-16`}>
            <div className="max-w-3xl mx-auto px-4 pt-6">
                {/* Back */}
                <Link to="/"
                    className={`inline-flex items-center gap-1.5 text-sm font-medium mb-5 transition-colors
              ${darkMode ? 'text-green-400 hover:text-green-300' : 'text-green-700 hover:text-green-500'}`}>
                    <ArrowLeft size={15} /> Back to Map
                </Link>

                {/* Hero image */}
                <div className={`rounded-2xl overflow-hidden shadow-lg border mb-6 ${card}`}>
                    {space.imageUrl ? (
                        <img src={space.imageUrl} alt={space.name} loading="lazy"
                            className="w-full h-64 sm:h-80 object-cover" />
                    ) : (
                        <div className="w-full h-48 sm:h-64 flex items-center justify-center bg-green-100 dark:bg-green-900/30">
                            <Trees size={64} className="text-green-300" />
                        </div>
                    )}

                    <div className="p-5 sm:p-7">
                        {/* Title row */}
                        <div className="flex items-start justify-between gap-4 mb-4">
                            <h1 className="text-2xl sm:text-3xl font-bold">{space.name}</h1>
                            <div className="flex gap-2 flex-shrink-0">
                                <Link to={`/add?edit=${space._id}`}
                                    className={`p-2 rounded-xl border transition-colors
                      ${darkMode ? 'border-green-800 text-green-400 hover:bg-green-900/40' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                                    <Edit size={16} />
                                </Link>
                                {!confirmDelete ? (
                                    <button onClick={() => setConfirmDelete(true)}
                                        className="p-2 rounded-xl border border-red-300/50 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                                        <Trash2 size={16} />
                                    </button>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <button onClick={handleDelete} disabled={deleting}
                                            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-red-500 text-white hover:bg-red-600 disabled:opacity-60">
                                            {deleting ? 'Deleting…' : 'Confirm'}
                                        </button>
                                        <button onClick={() => setConfirmDelete(false)}
                                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border
                          ${darkMode ? 'border-green-800 text-green-400' : 'border-gray-200 text-gray-500'}`}>
                                            Cancel
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Meta */}
                        <div className={`flex flex-wrap gap-4 mb-4 text-sm
                ${darkMode ? 'text-green-400' : 'text-gray-500'}`}>
                            <span className="flex items-center gap-1.5">
                                <MapPin size={14} />
                                {space.location.lat.toFixed(4)}, {space.location.lng.toFixed(4)}
                            </span>
                            {space.area && (
                                <span className="flex items-center gap-1.5"><Ruler size={14} />{space.area}</span>
                            )}
                        </div>

                        {/* Description */}
                        {space.description && (
                            <p className={`text-sm leading-relaxed mb-5 ${darkMode ? 'text-green-300/80' : 'text-gray-600'}`}>
                                {space.description}
                            </p>
                        )}
                        
                        {/* Weather & AQI */}
                        <div className={`mb-6 p-4 rounded-xl border flex flex-col md:flex-row gap-4 items-center justify-between
                            ${darkMode ? 'bg-green-900/20 border-green-800/40' : 'bg-green-50/50 border-green-100'}`}>
                            
                            {weather ? (
                                <div className="flex gap-6 items-center flex-wrap">
                                    <div className="flex items-center gap-2">
                                        <div className={`p-2 rounded-full ${darkMode ? 'bg-[#0a1a0e] text-blue-400' : 'bg-white text-blue-500 shadow-sm'}`}>
                                            <CloudSun size={20} />
                                        </div>
                                        <div>
                                            <p className={`text-[10px] uppercase font-bold ${darkMode ? 'text-green-600' : 'text-gray-400'}`}>Temperature</p>
                                            <p className="font-semibold">{Math.round(weather.temperature_2m)}°C <span className="text-xs font-normal opacity-70">({getWeatherDesc(weather.weather_code)})</span></p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className={`p-2 rounded-full ${darkMode ? 'bg-[#0a1a0e] text-cyan-400' : 'bg-white text-cyan-500 shadow-sm'}`}>
                                            <Wind size={20} />
                                        </div>
                                        <div>
                                            <p className={`text-[10px] uppercase font-bold ${darkMode ? 'text-green-600' : 'text-gray-400'}`}>Wind</p>
                                            <p className="font-semibold">{weather.wind_speed_10m} km/h</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className={`p-2 rounded-full ${darkMode ? 'bg-[#0a1a0e] text-teal-400' : 'bg-white text-teal-500 shadow-sm'}`}>
                                            <Droplets size={20} />
                                        </div>
                                        <div>
                                            <p className={`text-[10px] uppercase font-bold ${darkMode ? 'text-green-600' : 'text-gray-400'}`}>Humidity</p>
                                            <p className="font-semibold">{weather.relative_humidity_2m}%</p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 text-sm opacity-60">
                                    <Loader2 size={16} className="animate-spin" /> Loading weather...
                                </div>
                            )}

                            {/* AQI Section */}
                            {aqi ? (
                                <div className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border shadow-sm ${aqiInfo.bg} ${darkMode ? 'border-transparent' : 'border-gray-100'}`}>
                                    <Activity size={24} className={aqiInfo.color} />
                                    <div>
                                        <p className={`text-[10px] uppercase font-bold tracking-wider opacity-80 ${aqiInfo.color}`}>Air Quality</p>
                                        <p className={`font-bold text-base ${aqiInfo.color}`}>
                                            {aqi.european_aqi} <span className="text-xs opacity-75">EAQI</span> • {aqiInfo.label}
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 text-sm opacity-60">
                                    <Loader2 size={16} className="animate-spin" /> Loading AQI...
                                </div>
                            )}
                        </div>

                        {/* Facilities */}
                        {space.facilities.length > 0 && (
                            <div>
                                <h2 className={`text-xs font-bold uppercase tracking-widest mb-2.5
                    ${darkMode ? 'text-green-600' : 'text-gray-400'}`}>
                                    Facilities
                                </h2>
                                <div className="flex flex-wrap gap-2">
                                    {space.facilities.map((f) => {
                                        const info = FACILITY_ICONS[f] || { emoji: '📍', color: '#6b7280' };
                                        return (
                                            <span key={f}
                                                style={{ background: info.color + '18', color: info.color, border: `1px solid ${info.color}44` }}
                                                className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-xl font-medium capitalize">
                                                <span>{info.emoji}</span>
                                                {f.replace('_', ' ')}
                                            </span>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Best Time to Visit */}
                {bestTime && (
                    <div className={`rounded-2xl border shadow ${card}`}>
                        <div className={`px-5 py-4 border-b ${darkMode ? 'border-green-900/40' : 'border-gray-100'}`}>
                            <h2 className={`text-sm font-bold ${darkMode ? 'text-green-300' : 'text-gray-700'}`}>🕐 Best Time to Visit</h2>
                            {bestTime.overallTip && (
                                <p className={`text-xs mt-0.5 ${darkMode ? 'text-green-600' : 'text-gray-400'}`}>{bestTime.overallTip}</p>
                            )}
                        </div>
                        <div className="p-4 space-y-4">
                            {/* Best time of day */}
                            {bestTime.bestTimeOfDay && (
                                <div className={`flex items-start gap-3 p-3 rounded-xl ${darkMode ? 'bg-green-900/20' : 'bg-green-50'}`}>
                                    <span className="text-2xl">⏰</span>
                                    <div>
                                        <p className={`text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-green-500' : 'text-green-700'}`}>Best Time of Day</p>
                                        <p className={`text-sm font-semibold mt-0.5 ${darkMode ? 'text-green-100' : 'text-gray-800'}`}>{bestTime.bestTimeOfDay}</p>
                                        <p className={`text-xs mt-0.5 opacity-60`}>{bestTime.timeReason}</p>
                                    </div>
                                </div>
                            )}

                            {/* Best days */}
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

                            {/* Seasonal advice */}
                            {bestTime.seasonalAdvice && (
                                <div className={`text-xs p-3 rounded-xl ${darkMode ? 'bg-green-950/50 text-green-400' : 'bg-blue-50 text-blue-700'}`}>
                                    {bestTime.seasonalAdvice}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Mini map (free Leaflet — street + satellite) */}
                <div className={`rounded-2xl overflow-hidden shadow border ${card}`}>
                    <div className={`px-5 py-3 border-b flex items-center justify-between ${darkMode ? 'border-green-900/40' : 'border-gray-100'}`}>
                        <h2 className={`text-sm font-semibold ${darkMode ? 'text-green-300' : 'text-gray-700'}`}>
                            📍 Location on Map
                        </h2>
                        <div className={`flex rounded-lg overflow-hidden text-xs font-semibold border ${darkMode ? 'border-green-900/50' : 'border-gray-200'}`}>
                            <button
                                onClick={() => setSatelliteView(false)}
                                className={`px-3 py-1 transition-colors ${
                                    !satelliteView
                                        ? 'bg-green-500 text-white'
                                        : darkMode ? 'bg-green-950 text-green-400 hover:bg-green-900/40' : 'bg-white text-gray-600 hover:bg-gray-50'
                                }`}>
                                🗺 Street
                            </button>
                            <button
                                onClick={() => setSatelliteView(true)}
                                className={`px-3 py-1 transition-colors ${
                                    satelliteView
                                        ? 'bg-green-500 text-white'
                                        : darkMode ? 'bg-green-950 text-green-400 hover:bg-green-900/40' : 'bg-white text-gray-600 hover:bg-gray-50'
                                }`}>
                                🛰 Satellite
                            </button>
                        </div>
                    </div>
                    <div className="h-64" style={{ position: 'relative' }}>
                        <MapContainer
                            center={[space.location.lat, space.location.lng]}
                            zoom={15}
                            style={{ height: '100%', width: '100%' }}
                            zoomControl={true}
                            scrollWheelZoom={false}
                        >
                            {satelliteView ? (
                                <TileLayer
                                    url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                                    attribution='Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics'
                                    maxZoom={19}
                                />
                            ) : (
                                <TileLayer
                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                                />
                            )}
                            <Marker position={[space.location.lat, space.location.lng]} icon={greenIcon}>
                                <Popup>{space.name}</Popup>
                            </Marker>
                        </MapContainer>
                    </div>
                </div>

                {/* Nearby Places */}
                <div className={`mt-6 rounded-2xl border shadow ${card}`}>
                    <div className={`px-5 py-4 border-b flex items-center justify-between ${darkMode ? 'border-green-900/40' : 'border-gray-100'}`}>
                        <div>
                            <h2 className={`text-sm font-bold ${darkMode ? 'text-green-300' : 'text-gray-700'}`}>
                                🗺️ Nearby Green Spaces
                            </h2>
                            <p className={`text-[11px] mt-0.5 ${darkMode ? 'text-green-700' : 'text-gray-400'}`}>
                                Parks, gardens &amp; nature reserves within 100 km · via OpenStreetMap
                            </p>
                        </div>
                        {nearbyLoading && (
                            <Loader2 size={16} className="text-green-500 animate-spin flex-shrink-0" />
                        )}
                    </div>

                    <div className="p-4">
                        {nearbyLoading && nearbyPlaces.length === 0 && (
                            <div className="flex items-center gap-2 py-6 justify-center text-sm opacity-60">
                                <Loader2 size={18} className="animate-spin text-green-500" />
                                Scanning nearby green spaces…
                            </div>
                        )}

                        {!nearbyLoading && nearbyPlaces.length === 0 && (
                            <div className="text-center py-8">
                                <Trees size={32} className="mx-auto text-green-300 mb-2" />
                                <p className={`text-sm ${darkMode ? 'text-green-700' : 'text-gray-400'}`}>No nearby places found within 100 km</p>
                            </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {nearbyPlaces.map(place => (
                                <a
                                    key={place.id}
                                    href={`https://www.openstreetmap.org/?mlat=${place.lat}&mlon=${place.lng}&zoom=15`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`group flex items-center gap-3 p-3 rounded-xl border transition-all duration-200
                                        ${darkMode
                                            ? 'border-green-900/30 hover:border-green-700/60 hover:bg-green-900/20'
                                            : 'border-gray-100 hover:border-green-200 hover:bg-green-50'}`}
                                >
                                    <div className={`w-10 h-10 flex-shrink-0 rounded-full flex items-center justify-center text-xl
                                        ${darkMode ? 'bg-green-900/40' : 'bg-green-50'}`}>
                                        {place.emoji}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm font-semibold leading-tight truncate
                                            ${darkMode ? 'text-green-100' : 'text-gray-900'}`}>
                                            {place.name}
                                        </p>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium capitalize
                                                ${darkMode ? 'bg-green-900/50 text-green-400' : 'bg-green-100 text-green-700'}`}>
                                                {place.type.replace('_', ' ')}
                                            </span>
                                            <span className="text-[11px] font-medium text-green-500">
                                                {formatDist(place.distKm)}
                                            </span>
                                        </div>
                                    </div>
                                    <ExternalLink size={14} className={`flex-shrink-0 opacity-0 group-hover:opacity-60 transition-opacity
                                        ${darkMode ? 'text-green-400' : 'text-gray-400'}`} />
                                </a>
                            ))}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
