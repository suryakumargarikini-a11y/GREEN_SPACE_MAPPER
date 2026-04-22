const axios = require('axios');

// In-memory cache for ultra-fast lookups and bypassing API rate limits
const geocodeCache = new Map();

/**
 * Fetch coordinates for a text place name via OpenStreetMap's Nominatim API.
 * Uses aggressive caching to improve UX cleanly.
 */
async function getCoordinates(placeName) {
  // Normalize key for cache
  const key = placeName.toLowerCase().trim();

  // Return instantly from Cache if available
  if (geocodeCache.has(key)) {
    return geocodeCache.get(key);
  }

  try {
    // Ping Nominatim safely requiring User-Agent as per their Fair Use policy
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(placeName)}&format=json&limit=1`;
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'GreenSpaceAnalyzer/1.0 (Integration/Development)'
      },
      // Fast timeout: Do not wait longer than 3 seconds for geocoding
      timeout: 3000
    });

    const data = response.data;
    
    if (!data || data.length === 0) {
      throw new Error(`Could not locate place: ${placeName}`);
    }

    const coords = {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
      displayName: data[0].display_name
    };

    // Store in cache for future repetitions
    geocodeCache.set(key, coords);
    return coords;

  } catch (error) {
    console.error(`[GEOCODE FAIL] Failed resolving ${placeName}:`, error.message);
    throw new Error('Geocoding Failed'); // Thrown into express try/catch gracefully
  }
}

module.exports = { getCoordinates };
