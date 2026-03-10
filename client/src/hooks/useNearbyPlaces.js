import { useState, useEffect, useCallback } from 'react';

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const RADIUS_METERS = 5000; // 5 km

// OSM tags we want to fetch (parks, gardens, forests, nature)
const OVERPASS_QUERY = (lat, lng, r) => `
[out:json][timeout:25];
(
  node["leisure"="park"](around:${r},${lat},${lng});
  way["leisure"="park"](around:${r},${lat},${lng});
  node["leisure"="garden"](around:${r},${lat},${lng});
  way["leisure"="garden"](around:${r},${lat},${lng});
  node["leisure"="nature_reserve"](around:${r},${lat},${lng});
  way["leisure"="nature_reserve"](around:${r},${lat},${lng});
  node["landuse"="forest"](around:${r},${lat},${lng});
  way["landuse"="forest"](around:${r},${lat},${lng});
  node["natural"="wood"](around:${r},${lat},${lng});
  way["natural"="wood"](around:${r},${lat},${lng});
  node["landuse"="grass"](around:${r},${lat},${lng});
  way["landuse"="grass"](around:${r},${lat},${lng});
  node["leisure"="recreation_ground"](around:${r},${lat},${lng});
  way["leisure"="recreation_ground"](around:${r},${lat},${lng});
);
out center 30;
`;

// Map OSM tag values to a friendly type label + emoji
function classifyPlace(tags) {
    const leisure = tags.leisure || '';
    const landuse = tags.landuse || '';
    const natural = tags.natural || '';

    if (leisure === 'park') return { type: 'Park', emoji: '🌳' };
    if (leisure === 'garden') return { type: 'Garden', emoji: '🌸' };
    if (leisure === 'nature_reserve') return { type: 'Nature Reserve', emoji: '🦋' };
    if (leisure === 'recreation_ground') return { type: 'Recreation Ground', emoji: '⛳' };
    if (landuse === 'forest' || natural === 'wood') return { type: 'Forest', emoji: '🌲' };
    if (landuse === 'grass') return { type: 'Green Space', emoji: '🌿' };
    return { type: 'Green Space', emoji: '🌿' };
}

function haversineKm(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Fetches nearby green spaces from OpenStreetMap Overpass API.
 * Returns { nearbyPlaces, nearbyLoading, nearbyError, refetchNearby }
 */
export function useNearbyPlaces(userLocation) {
    const [nearbyPlaces, setNearbyPlaces] = useState([]);
    const [nearbyLoading, setNearbyLoading] = useState(false);
    const [nearbyError, setNearbyError] = useState('');

    const fetchNearby = useCallback(async () => {
        if (!userLocation) return;
        setNearbyLoading(true);
        setNearbyError('');

        try {
            const query = OVERPASS_QUERY(userLocation.lat, userLocation.lng, RADIUS_METERS);
            const res = await fetch(OVERPASS_URL, {
                method: 'POST',
                body: query,
                headers: { 'Content-Type': 'text/plain' },
            });
            const data = await res.json();

            const places = data.elements
                .filter((el) => el.tags?.name) // only named places
                .map((el) => {
                    // nodes have lat/lng directly; ways have a 'center'
                    const lat = el.lat ?? el.center?.lat;
                    const lng = el.lon ?? el.center?.lon;
                    if (!lat || !lng) return null;

                    const { type, emoji } = classifyPlace(el.tags);
                    const distKm = haversineKm(userLocation.lat, userLocation.lng, lat, lng);

                    return {
                        id: `osm-${el.type}-${el.id}`,
                        name: el.tags.name,
                        type,
                        emoji,
                        location: { lat, lng },
                        distKm,
                        // optional extra info
                        website: el.tags.website || el.tags['contact:website'] || null,
                        openingHours: el.tags.opening_hours || null,
                        description: el.tags.description || null,
                        source: 'osm', // so we can distinguish from app spaces
                    };
                })
                .filter(Boolean)
                .sort((a, b) => a.distKm - b.distKm)
                .slice(0, 25); // cap at 25 results

            setNearbyPlaces(places);
        } catch (err) {
            setNearbyError('Could not fetch nearby places. Check your connection.');
            console.error('Overpass error:', err);
        } finally {
            setNearbyLoading(false);
        }
    }, [userLocation]);

    useEffect(() => {
        fetchNearby();
    }, [fetchNearby]);

    return { nearbyPlaces, nearbyLoading, nearbyError, refetchNearby: fetchNearby };
}
