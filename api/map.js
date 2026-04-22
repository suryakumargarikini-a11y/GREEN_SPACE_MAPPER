require('dotenv').config();
const { getSentinelToken, getMapImage } = require('../services/sentinel');
const { getFallbackData } = require('../services/fallback');
const { getCoordinates } = require('../services/geocoding');

module.exports = async (req, res) => {
  // CORS Headers manually for native Vercel lambda
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Health probe support
  if (req.method === 'GET') {
    return res.status(200).send('OK');
  }

  if (req.method !== 'POST') {
    return res.status(405).json({error: "Method Not Allowed"});
  }

  const placeName = req.body?.placeName;

  if (!placeName || typeof placeName !== 'string') {
    return res.status(400).json({ error: "Missing or invalid placeName" });
  }

  const sentinelController = new AbortController();
  const timeoutId = setTimeout(() => sentinelController.abort(), 5000);

  let coords = null; 

  try {
    coords = await getCoordinates(placeName);
    const { mapUrl, bounds } = await getMapImage(coords.lat, coords.lng, sentinelController.signal);
    clearTimeout(timeoutId);

    const { generateHeuristics } = require('../services/fallback');
    const heuristics = generateHeuristics(); 

    return res.status(200).json({
      status: "Live",
      placeName: coords.displayName || placeName,
      coordinates: coords,
      mapUrl: mapUrl,
      overlayBounds: bounds,
      ...heuristics
    });

  } catch (error) {
    clearTimeout(timeoutId);
    console.error(`[SYSTEM TRIPPED] Exception fetching data for ${placeName}. Error: ${error.message}`);
    
    const { getFallbackData } = require('../services/fallback');
    const fallbackData = getFallbackData(placeName, coords);
    return res.status(200).json(fallbackData);
  }
};
