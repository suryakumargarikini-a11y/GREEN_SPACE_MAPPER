require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const { getSentinelToken, getMapImage } = require('../services/sentinel');
const { getFallbackData } = require('../services/fallback');
const { getCoordinates } = require('../services/geocoding');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev", {
  skip: (req) => req.url === '/health'
}));

// API Routes
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});
app.post('/api/map', async (req, res) => {
  const { placeName } = req.body;

  if (!placeName || typeof placeName !== 'string') {
    return res.status(400).json({ error: "Missing or invalid placeName" });
  }

  // Strict 5-second controller only for the heavy Sentinel fetch
  const sentinelController = new AbortController();
  const timeoutId = setTimeout(() => sentinelController.abort(), 5000);

  let coords = null; // Stored to pass to fallback if Sentinel fails later

  try {
    // Phase 1: Geocoding
    coords = await getCoordinates(placeName);

    // Phase 2: Sentinel Fetch (5 second abort sequence)
    // Sentinel natively returns the mapUrl and overlayBounds to be mapped natively into Leaflet
    const { mapUrl, bounds } = await getMapImage(coords.lat, coords.lng, sentinelController.signal);
    clearTimeout(timeoutId);

    // Phase 3: Assembly (Success)
    const { generateHeuristics } = require('../services/fallback');
    const heuristics = generateHeuristics(); // Statistically mapping to the visual overlay

    const liveData = {
      status: "Live",
      placeName: coords.displayName || placeName,
      coordinates: coords,
      mapUrl: mapUrl,
      overlayBounds: bounds,
      ...heuristics
    };

    return res.json(liveData);

  } catch (error) {
    clearTimeout(timeoutId);
    console.error(`[SYSTEM TRIPPED] Exception fetching data for ${placeName}. Triggering graceful fallback. Reason: ${error.message}`);
    
    // Safety Net: Fallback Mode explicitly builds exactly identical keys
    const { getFallbackData } = require('../services/fallback');
    const fallbackData = getFallbackData(placeName, coords);
    return res.json(fallbackData);
  }
});

// Start Server Locally (ignored by Vercel Serverless)
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
      console.log(`✅  Server running on port ${PORT}`);
  });
}

// Export strictly for Vercel Serverless compatibility
module.exports = app;
