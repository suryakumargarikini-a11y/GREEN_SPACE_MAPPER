import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import MapView from '../components/MapView';
import Sidebar from '../components/Sidebar';
import { Trees, AlertCircle } from 'lucide-react';
import { useNearbyPlaces } from '../hooks/useNearbyPlaces';

/**
 * HomePage – main page combining the interactive map and the sidebar.
 * Manages app-level state: spaces data, user geolocation, selected space, active filters.
 */
export default function HomePage() {
    const [spaces, setSpaces] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [userLocation, setUserLocation] = useState(null);
    const [selectedSpace, setSelectedSpace] = useState(null);
    const [selectedNearby, setSelectedNearby] = useState(null);
    const [activeFilters, setActiveFilters] = useState(new Set());

    const { nearbyPlaces, nearbyLoading, nearbyError, refetchNearby } = useNearbyPlaces(userLocation);

    // ── Detect dark mode from body class ────────────────────────────────────
    const [darkMode, setDarkMode] = useState(() =>
        document.body.classList.contains('dark')
    );
    useEffect(() => {
        const observer = new MutationObserver(() =>
            setDarkMode(document.body.classList.contains('dark'))
        );
        observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
        return () => observer.disconnect();
    }, []);

    // ── Fetch green spaces from API ──────────────────────────────────────────
    const fetchSpaces = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            let url = '/api/spaces';
            if (activeFilters.size > 0) {
                url += `?facilities=${[...activeFilters].join(',')}`;
            }
            const { data } = await axios.get(url);
            setSpaces(data);
        } catch {
            setError('Could not load green spaces. Please ensure the server is running.');
        } finally {
            setLoading(false);
        }
    }, [activeFilters]);

    useEffect(() => { fetchSpaces(); }, [fetchSpaces]);

    // ── Get user location on mount ───────────────────────────────────────────
    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                () => { } // silently fail
            );
        }
    }, []);

    const handleNearbyClick = (place) => {
        setSelectedNearby(place);
        setSelectedSpace(null);
    };

    const handleAppSpaceClick = (space) => {
        setSelectedSpace(space);
        setSelectedNearby(null);
    };

    return (
        <div className="flex flex-1 overflow-hidden" style={{ height: 'calc(100vh - 64px)' }}>
            {/* ── Sidebar ──────────────────────────────────────────────────── */}
            <Sidebar
                spaces={spaces}
                userLocation={userLocation}
                selectedSpace={selectedSpace}
                onSelect={handleAppSpaceClick}
                activeFilters={activeFilters}
                onFilterChange={setActiveFilters}
                darkMode={darkMode}
                onNearbyClick={handleNearbyClick}
                nearbyPlaces={nearbyPlaces}
                nearbyLoading={nearbyLoading}
                nearbyError={nearbyError}
                refetchNearby={refetchNearby}
            />

            {/* ── Map area ─────────────────────────────────────────────────── */}
            <div className="flex-1 relative overflow-hidden">
                {loading && (
                    <div className={`absolute inset-0 z-20 flex flex-col items-center justify-center gap-3
              ${darkMode ? 'bg-[#0a0f0d]/90' : 'bg-white/90'}`}>
                        <Trees size={40} className="text-green-500 animate-bounce" />
                        <span className={`text-sm font-medium ${darkMode ? 'text-green-300' : 'text-green-700'}`}>
                            Loading green spaces…
                        </span>
                    </div>
                )}

                {error && !loading && (
                    <div className={`absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2
              px-4 py-3 rounded-xl text-sm shadow-lg
              ${darkMode ? 'bg-red-900/70 text-red-300 border border-red-800' : 'bg-red-50 text-red-600 border border-red-200'}`}>
                        <AlertCircle size={16} />
                        {error}
                    </div>
                )}

                <MapView
                    spaces={spaces}
                    nearbySpaces={nearbyPlaces}
                    darkMode={darkMode}
                    userLocation={userLocation}
                    selectedSpace={selectedSpace}
                    selectedNearby={selectedNearby}
                    onMarkerClick={handleAppSpaceClick}
                    onNearbyMarkerClick={handleNearbyClick}
                />
            </div>
        </div>
    );
}
