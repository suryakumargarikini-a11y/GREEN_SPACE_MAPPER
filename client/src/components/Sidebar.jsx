import { useState, useCallback } from 'react';
import { Search, Trees, ChevronLeft, ChevronRight, Loader2, RefreshCw, MapPin, ExternalLink } from 'lucide-react';
import SpaceCard from './SpaceCard';
import { useNearbyPlaces } from '../hooks/useNearbyPlaces';

const ALL_FACILITIES = [
    { id: 'playground', label: 'Playground', emoji: '🛝' },
    { id: 'walking_track', label: 'Walking Track', emoji: '🚶' },
    { id: 'garden', label: 'Garden', emoji: '🌸' },
    { id: 'benches', label: 'Benches', emoji: '🪑' },
    { id: 'sports_area', label: 'Sports Area', emoji: '⚽' },
];

const TYPE_EMOJI = {
    'Park': '🌳',
    'Garden': '🌸',
    'Forest': '🌲',
    'Nature Reserve': '🦋',
    'Recreation Ground': '⛳',
    'Green Space': '🌿',
};

function haversineKm(a, b) {
    if (!a || !b) return null;
    const R = 6371;
    const dLat = ((b.lat - a.lat) * Math.PI) / 180;
    const dLng = ((b.lng - a.lng) * Math.PI) / 180;
    const lat1 = (a.lat * Math.PI) / 180;
    const lat2 = (b.lat * Math.PI) / 180;
    const x = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function formatDist(km) {
    if (km === null) return null;
    return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

/** Small card for OSM nearby places — different from app SpaceCard */
function NearbyPlaceCard({ place, darkMode, onClick, isSelected }) {
    return (
        <div
            onClick={onClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onClick()}
            className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-200 border
                ${isSelected
                    ? darkMode ? 'bg-green-900/50 border-green-500/60' : 'bg-green-50 border-green-400'
                    : darkMode ? 'border-green-900/30 hover:border-green-700/50 hover:bg-green-900/20'
                        : 'border-gray-100 hover:border-green-200 hover:bg-gray-50'
                }`}
        >
            {/* Icon circle */}
            <div className={`w-9 h-9 flex-shrink-0 rounded-full flex items-center justify-center text-lg
                ${darkMode ? 'bg-green-900/40' : 'bg-green-50'}`}>
                {place.emoji}
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-1">
                    <p className={`text-sm font-semibold leading-tight truncate
                        ${darkMode ? 'text-green-100' : 'text-gray-900'}`}>
                        {place.name}
                    </p>
                    {place.distKm !== null && (
                        <span className="flex-shrink-0 text-xs text-green-500 font-medium">
                            {formatDist(place.distKm)}
                        </span>
                    )}
                </div>
                <p className={`text-[11px] mt-0.5 ${darkMode ? 'text-green-600' : 'text-gray-400'}`}>
                    {place.type}
                </p>
            </div>
        </div>
    );
}

/**
 * Sidebar – Two sections:
 *   1. "Your Spaces" — spaces added to the app (from server)
 *   2. "Nearby in OSM" — real parks/forests/gardens from OpenStreetMap
 */
export default function Sidebar({
    spaces, userLocation, selectedSpace, onSelect,
    activeFilters, onFilterChange, darkMode, onNearbyClick,
    nearbyPlaces, nearbyLoading, nearbyError, refetchNearby
}) {
    const [search, setSearch] = useState('');
    const [collapsed, setCollapsed] = useState(false);
    const [activeTab, setActiveTab] = useState('nearby'); // 'app' | 'nearby'

    // ── Filter app spaces by facilities & search ─────────────────────────────
    const filtered = spaces
        .filter((s) => activeFilters.size === 0 || [...activeFilters].every((f) => s.facilities.includes(f)))
        .filter((s) => search === '' || s.name.toLowerCase().includes(search.toLowerCase()))
        .map((s) => ({ ...s, distKm: haversineKm(userLocation, s.location) }))
        .sort((a, b) => (a.distKm ?? Infinity) - (b.distKm ?? Infinity));

    // ── Filter OSM places by search ───────────────────────────────────────────
    const filteredNearby = nearbyPlaces.filter((p) =>
        search === '' || p.name.toLowerCase().includes(search.toLowerCase())
    );

    const toggleFilter = (id) => {
        const next = new Set(activeFilters);
        next.has(id) ? next.delete(id) : next.add(id);
        onFilterChange(next);
    };

    const base = darkMode
        ? 'bg-[#111a14] border-green-900/40 text-green-100'
        : 'bg-white border-gray-100 text-gray-900';

    const tabBase = (active) => active
        ? darkMode ? 'bg-green-600 text-white shadow-sm' : 'bg-green-500 text-white shadow-sm'
        : darkMode ? 'text-green-400 hover:bg-green-900/30' : 'text-gray-500 hover:bg-gray-200';

    return (
        <aside className={`relative flex flex-col transition-all duration-300 border-r ${base}
            ${collapsed ? 'w-12' : 'w-72 xl:w-80'}`}>

            {/* Collapse toggle */}
            <button
                onClick={() => setCollapsed((p) => !p)}
                className={`absolute -right-3.5 top-5 z-10 w-7 h-7 rounded-full flex items-center justify-center
                    shadow-md border transition-colors
                    ${darkMode ? 'bg-[#1a2a1e] border-green-800 text-green-400 hover:bg-green-900'
                        : 'bg-white border-green-200 text-green-600 hover:bg-green-50'}`}>
                {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>

            {collapsed && (
                <div className="flex flex-col items-center pt-5 gap-3">
                    <Trees size={20} className="text-green-500" />
                </div>
            )}

            {!collapsed && (
                <>
                    {/* Header */}
                    <div className={`px-4 pt-4 pb-3 border-b ${darkMode ? 'border-green-900/40' : 'border-gray-100'}`}>
                        <h2 className="font-bold text-base flex items-center gap-2 mb-3">
                            <Trees size={16} className="text-green-500" />
                            Green Spaces
                            <span className={`ml-auto text-xs font-medium px-2 py-0.5 rounded-full
                                ${darkMode ? 'bg-green-900/50 text-green-400' : 'bg-green-100 text-green-700'}`}>
                                {activeTab === 'nearby' ? filteredNearby.length : filtered.length}
                            </span>
                        </h2>

                        {/* Tab switcher */}
                        <div className={`flex gap-1 p-1 rounded-xl mb-3 ${darkMode ? 'bg-green-900/20' : 'bg-gray-100'}`}>
                            <button
                                onClick={() => setActiveTab('nearby')}
                                className={`flex-1 text-xs font-semibold py-1.5 rounded-lg transition-all ${tabBase(activeTab === 'nearby')}`}>
                                🗺️ Nearby Places
                            </button>
                            <button
                                onClick={() => setActiveTab('app')}
                                className={`flex-1 text-xs font-semibold py-1.5 rounded-lg transition-all ${tabBase(activeTab === 'app')}`}>
                                📌 My Spaces ({spaces.length})
                            </button>
                        </div>

                        {/* Search */}
                        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm
                            ${darkMode ? 'bg-[#0a1a0e] border-green-900/40 placeholder:text-green-800'
                                : 'bg-gray-50 border-gray-200'}`}>
                            <Search size={14} className="text-green-500 flex-shrink-0" />
                            <input
                                type="text"
                                placeholder="Search spaces..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="flex-1 bg-transparent border-none outline-none text-sm"
                            />
                        </div>

                        {/* Filter chips — only shown in app tab */}
                        {activeTab === 'app' && (
                            <div className="flex flex-wrap gap-1.5 mt-3">
                                {ALL_FACILITIES.map((f) => {
                                    const active = activeFilters.has(f.id);
                                    return (
                                        <button key={f.id} onClick={() => toggleFilter(f.id)}
                                            className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-all duration-150
                                                ${active ? 'bg-green-500 border-green-500 text-white shadow'
                                                    : darkMode ? 'bg-green-900/20 border-green-800/50 text-green-400 hover:border-green-600'
                                                        : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-green-300 hover:text-green-700'}`}>
                                            {f.emoji} {f.label}
                                        </button>
                                    );
                                })}
                                {activeFilters.size > 0 && (
                                    <button onClick={() => onFilterChange(new Set())}
                                        className="text-xs px-2.5 py-1 rounded-full border font-medium text-red-400 border-red-300/50 hover:bg-red-50">
                                        Clear
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* ── NEARBY TAB (OSM places) ────────────────────────────── */}
                    {activeTab === 'nearby' && (
                        <div className="flex-1 overflow-y-auto px-3 py-3">
                            {/* Status bar */}
                            <div className="flex items-center justify-between mb-2">
                                <p className={`text-[10px] uppercase font-bold tracking-wider
                                    ${darkMode ? 'text-green-800' : 'text-gray-400'}`}>
                                    {userLocation ? 'Within 5 km · via OpenStreetMap' : 'Enable location to see nearby places'}
                                </p>
                                {userLocation && (
                                    <button onClick={refetchNearby} title="Refresh"
                                        className={`p-1 rounded-lg transition-colors ${darkMode ? 'text-green-600 hover:text-green-400' : 'text-gray-400 hover:text-green-600'}`}>
                                        <RefreshCw size={12} className={nearbyLoading ? 'animate-spin' : ''} />
                                    </button>
                                )}
                            </div>

                            {nearbyLoading && (
                                <div className="flex items-center gap-2 py-8 justify-center">
                                    <Loader2 size={20} className="text-green-500 animate-spin" />
                                    <span className={`text-sm ${darkMode ? 'text-green-600' : 'text-gray-400'}`}>
                                        Finding nearby green spaces…
                                    </span>
                                </div>
                            )}

                            {nearbyError && !nearbyLoading && (
                                <div className="text-xs text-red-400 bg-red-100/10 border border-red-400/20 rounded-xl px-3 py-2 mb-2">
                                    {nearbyError}
                                </div>
                            )}

                            {!nearbyLoading && !userLocation && (
                                <div className="text-center py-12">
                                    <MapPin size={36} className="mx-auto text-green-300 mb-3" />
                                    <p className={`text-sm ${darkMode ? 'text-green-600' : 'text-gray-400'}`}>
                                        Allow location access to discover nearby parks, forests and gardens
                                    </p>
                                </div>
                            )}

                            {!nearbyLoading && userLocation && filteredNearby.length === 0 && (
                                <div className="text-center py-12">
                                    <Trees size={36} className="mx-auto text-green-300 mb-3" />
                                    <p className={`text-sm ${darkMode ? 'text-green-600' : 'text-gray-400'}`}>
                                        No nearby places found
                                    </p>
                                </div>
                            )}

                            <div className="space-y-1.5">
                                {filteredNearby.map((place) => (
                                    <NearbyPlaceCard
                                        key={place.id}
                                        place={place}
                                        darkMode={darkMode}
                                        onClick={() => onNearbyClick?.(place)}
                                        isSelected={selectedSpace?.id === place.id}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ── APP TAB (user-added spaces) ───────────────────────── */}
                    {activeTab === 'app' && (
                        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
                            {filtered.length === 0 && (
                                <div className="text-center py-12">
                                    <Trees size={40} className="mx-auto text-green-300 mb-3" />
                                    <p className={`text-sm ${darkMode ? 'text-green-600' : 'text-gray-400'}`}>
                                        No spaces found
                                    </p>
                                    <p className={`text-xs mt-1 ${darkMode ? 'text-green-800' : 'text-gray-300'}`}>
                                        Use + Add Space to add one!
                                    </p>
                                </div>
                            )}
                            {filtered.map((space) => (
                                <SpaceCard
                                    key={space._id}
                                    space={space}
                                    distance={formatDist(space.distKm)}
                                    onClick={() => onSelect(space)}
                                    isSelected={selectedSpace?._id === space._id}
                                    darkMode={darkMode}
                                />
                            ))}
                        </div>
                    )}
                </>
            )}
        </aside>
    );
}
