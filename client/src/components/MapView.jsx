import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Trees, X, LocateFixed, Navigation, Map as MapIcon, Satellite, ExternalLink, Navigation2 } from 'lucide-react';

import { GeoSearchControl, OpenStreetMapProvider } from 'leaflet-geosearch';
import 'leaflet-geosearch/dist/geosearch.css';

// Fix leaflet default marker icons (broken in Vite/Webpack)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// ── Custom green marker icon (app spaces) ──────────────────────────────────────
function createGreenIcon(isSelected = false) {
    const size = isSelected ? 44 : 36;
    const svg = `
    <svg width="${size}" height="${size}" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="22" cy="22" r="20" fill="${isSelected ? '#4ade80' : '#22c55e'}" 
              stroke="white" stroke-width="3"
              ${isSelected ? 'filter="drop-shadow(0 0 8px rgba(74,222,128,0.8))"' : ''}/>
      <text x="50%" y="58%" dominant-baseline="middle" text-anchor="middle" 
            font-size="18" font-family="sans-serif">🌿</text>
    </svg>`;
    return L.divIcon({
        html: svg,
        className: '',
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
        popupAnchor: [0, -size / 2],
    });
}

// ── Nearby OSM places marker icon ──────────────────────────────────────────────
function createOsmIcon(emoji, isSelected = false) {
    const size = isSelected ? 36 : 28;
    const svg = `
    <svg width="${size}" height="${size}" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="22" cy="22" r="20" fill="${isSelected ? '#60a5fa' : '#3b82f6'}" 
              stroke="white" stroke-width="2"
              ${isSelected ? 'filter="drop-shadow(0 0 8px rgba(96,165,250,0.8))"' : ''}/>
      <text x="50%" y="58%" dominant-baseline="middle" text-anchor="middle" 
            font-size="18" font-family="sans-serif">${emoji}</text>
    </svg>`;
    return L.divIcon({
        html: svg,
        className: '',
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
        popupAnchor: [0, -size / 2],
    });
}

// ── Search Control ─────────────────────────────────────────────────────────────
function SearchControl() {
    const map = useMap();
    useEffect(() => {
        const provider = new OpenStreetMapProvider();
        const searchControl = new GeoSearchControl({
            provider,
            style: 'bar',
            showMarker: true,
            showPopup: false,
            autoClose: true,
            retainZoomLevel: false,
            animateZoom: true,
            searchLabel: 'Search any location...',
        });
        map.addControl(searchControl);
        return () => map.removeControl(searchControl);
    }, [map]);
    return null;
}

// ── Map pan/zoom controller ───────────────────────────────────────────────────
function MapController({ selectedSpace, userLocation, selectedNearby }) {
    const map = useMap();
    useEffect(() => {
        if (selectedSpace?.location) {
            map.flyTo([selectedSpace.location.lat, selectedSpace.location.lng], 15, { duration: 1 });
        }
    }, [selectedSpace, map]);

    useEffect(() => {
        if (selectedNearby?.location) {
            map.flyTo([selectedNearby.location.lat, selectedNearby.location.lng], 16, { duration: 1 });
        }
    }, [selectedNearby, map]);

    useEffect(() => {
        if (userLocation) {
            map.flyTo([userLocation.lat, userLocation.lng], 14, { duration: 1 });
        }
    }, [userLocation, map]);

    return null;
}

// ── Recenter button ───────────────────────────────────────────────────────────
function RecenterButton({ userLocation }) {
    const map = useMap();
    if (!userLocation) return null;
    return (
        <button
            onClick={() => map.flyTo([userLocation.lat, userLocation.lng], 14, { duration: 0.8 })}
            title="Recenter to my location"
            className="absolute bottom-6 right-4 z-[500] w-12 h-12 bg-white dark:bg-[#111a14] border border-gray-200 dark:border-green-900/40 rounded-full flex items-center justify-center shadow-lg text-green-600 dark:text-green-400 hover:bg-gray-50 dark:hover:bg-green-900/40 transition-colors"
        >
            <LocateFixed size={20} />
        </button>
    );
}

// ── Main MapView ──────────────────────────────────────────────────────────────
export default function MapView({ spaces, nearbySpaces = [], userLocation, selectedSpace, selectedNearby, onMarkerClick, onNearbyMarkerClick }) {
    const [mapStyle, setMapStyle] = useState('terrain'); // 'terrain' or 'satellite'

    const defaultCenter = userLocation
        ? [userLocation.lat, userLocation.lng]
        : [20.5937, 78.9629]; // India default

    // Tile layers — map always uses standard tiles regardless of dark mode
    const terrainTile = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    const satelliteTile = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';

    const currentTileUrl = mapStyle === 'terrain' ? terrainTile : satelliteTile;
    const attribution = mapStyle === 'terrain'
        ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        : '&copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community';

    return (
        <div id="map-container" className="w-full h-full relative" style={{ isolation: 'isolate', filter: 'none' }}>
            <MapContainer
                center={defaultCenter}
                zoom={12}
                style={{ width: '100%', height: '100%', zIndex: 0 }}
                zoomControl={true}
            >
                <TileLayer url={currentTileUrl} attribution={attribution} />

                <SearchControl />
                <MapController selectedSpace={selectedSpace} userLocation={userLocation} selectedNearby={selectedNearby} />
                <RecenterButton userLocation={userLocation} />

                {/* User location marker */}
                {userLocation && (
                    <CircleMarker
                        center={[userLocation.lat, userLocation.lng]}
                        radius={10}
                        pathOptions={{ color: '#3b82f6', fillColor: '#60a5fa', fillOpacity: 0.9, weight: 3 }}
                    />
                )}

                {/* App spaces markers */}
                {spaces.map((space) => (
                    <Marker
                        key={space._id}
                        position={[space.location.lat, space.location.lng]}
                        icon={createGreenIcon(selectedSpace?._id === space._id)}
                        eventHandlers={{ click: () => onMarkerClick(space) }}
                    >
                        <Popup maxWidth={270} className="green-popup">
                            <div className="w-64 rounded-xl overflow-hidden font-['Inter']">
                                {space.imageUrl ? (
                                    <img src={space.imageUrl} alt={space.name} loading="lazy"
                                        className="w-full h-32 object-cover" />
                                ) : (
                                    <div className="w-full h-20 bg-green-100 flex items-center justify-center">
                                        <Trees size={32} className="text-green-400" />
                                    </div>
                                )}
                                <div className="p-3 bg-white">
                                    <h3 className="font-semibold text-gray-900 text-base mb-1">{space.name}</h3>
                                    {space.area && <p className="text-xs text-gray-500 mb-2">📐 {space.area}</p>}
                                    {space.description && (
                                        <p className="text-xs text-gray-600 mb-3 line-clamp-2">{space.description}</p>
                                    )}
                                    <Link
                                        to={`/park/${space._id}`}
                                        className="block w-full text-center text-xs font-semibold py-2 px-3 mt-3
                                            rounded-lg bg-green-500 text-white hover:bg-green-600 transition-colors">
                                        View Details →
                                    </Link>
                                </div>
                            </div>
                        </Popup>
                    </Marker>
                ))}

                {/* Nearby OSM places markers */}
                {nearbySpaces.map((place) => (
                    <Marker
                        key={place.id}
                        position={[place.location.lat, place.location.lng]}
                        icon={createOsmIcon(place.emoji, selectedNearby?.id === place.id)}
                        eventHandlers={{ click: () => onNearbyMarkerClick?.(place) }}
                    >
                        <Popup className="green-popup">
                            <div className="px-2 py-1 flex flex-col items-center">
                                <span className="text-2xl mb-1">{place.emoji}</span>
                                <h3 className="font-bold text-gray-900 min-w-max text-sm">{place.name}</h3>
                                <p className="text-xs text-gray-500 font-medium">{place.type}</p>
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>

            {/* ── Layer Toggle (Terrain/Satellite) ── */}
            <div className="absolute top-20 right-4 z-[500] flex flex-col gap-2">
                <button
                    onClick={() => setMapStyle('terrain')}
                    className={`w-10 h-10 rounded-xl shadow-lg flex items-center justify-center transition-all ${mapStyle === 'terrain'
                        ? 'bg-blue-500 text-white ring-2 ring-blue-300'
                        : 'bg-white text-gray-600 hover:bg-gray-50'
                        }`}
                    title="Terrain View"
                >
                    <MapIcon size={18} />
                </button>
                <button
                    onClick={() => setMapStyle('satellite')}
                    className={`w-10 h-10 rounded-xl shadow-lg flex items-center justify-center transition-all ${mapStyle === 'satellite'
                        ? 'bg-blue-500 text-white ring-2 ring-blue-300'
                        : 'bg-white text-gray-600 hover:bg-gray-50'
                        }`}
                    title="Satellite View"
                >
                    <Satellite size={18} />
                </button>
            </div>

            {/* ── Floating selected-nearby info panel ── */}
            {selectedNearby && (
                <div className="absolute bottom-6 left-4 z-[500] max-w-[280px] bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden animate-fade-up">
                    <div className="bg-green-500 px-4 py-2.5 flex items-center gap-2">
                        <span className="text-xl">{selectedNearby.emoji}</span>
                        <div className="flex-1 min-w-0">
                            <p className="text-white font-bold text-sm leading-tight truncate">{selectedNearby.name}</p>
                            <p className="text-green-100 text-xs">{selectedNearby.type}</p>
                        </div>
                        {selectedNearby.distKm != null && (
                            <span className="text-xs text-green-100 font-medium flex-shrink-0">
                                {selectedNearby.distKm < 1
                                    ? `${Math.round(selectedNearby.distKm * 1000)} m`
                                    : `${selectedNearby.distKm.toFixed(1)} km`}
                            </span>
                        )}
                    </div>
                    <div className="px-4 py-2.5 flex items-center gap-3">
                        {selectedNearby.openingHours && (
                            <p className="text-xs text-gray-500 flex-1 truncate">🕐 {selectedNearby.openingHours}</p>
                        )}
                        {selectedNearby.website && (
                            <a href={selectedNearby.website} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-1 text-xs text-green-600 hover:text-green-700 font-medium flex-shrink-0">
                                <ExternalLink size={11} /> Website
                            </a>
                        )}
                        {!selectedNearby.openingHours && !selectedNearby.website && (
                            <p className="text-xs text-gray-400">Click the marker for more info</p>
                        )}
                    </div>
                </div>
            )}

        </div>
    );
}
