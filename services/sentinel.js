const axios = require('axios');
const qs = require('qs');

let accessToken = null;
let tokenExpiry = 0; 

async function getSentinelToken() {
  const now = Math.floor(Date.now() / 1000);
  if (accessToken && tokenExpiry > now + 60) return accessToken;

  const clientId = process.env.CLIENT_ID;
  const clientSecret = process.env.CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Missing Sentinel Hub credentials in ENV');
  }

  const data = qs.stringify({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret
  });

  const response = await axios.post('https://services.sentinel-hub.com/oauth/token', data, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

  accessToken = response.data.access_token;
  tokenExpiry = now + response.data.expires_in;
  return accessToken;
}

/**
 * Derives a false-color or NDVI highlighting overlay from Sentinel Process API.
 * The EVALSCRIPT turns Green Space (NDVI > 0.3) into semi-transparent green mask, 
 * and other areas into a semi-transparent red mask, satisfying mapping requirements.
 */
async function getMapImage(lat, lng, abortSignal) {
  const token = await getSentinelToken();

  const offset = 0.05; 
  const bbox = [
    parseFloat(lng) - offset,
    parseFloat(lat) - offset,
    parseFloat(lng) + offset,
    parseFloat(lat) + offset
  ];

  /* 
   * NDVI Formula: (B08 - B04) / (B08 + B04)
   * The evalscript returns an RGBA image overlay mask. 
   * Green areas are shaded green [0,1,0,0.4], non-green areas red [1,0,0,0.4].
   */
  const evalscript = `
    //VERSION=3
    function setup() {
      return {
        input: ["B04", "B08", "dataMask"],
        output: { bands: 4 } // RGBA
      };
    }

    function evaluatePixel(sample) {
      if (sample.dataMask === 0) return [0, 0, 0, 0];

      let val = sample.B08 + sample.B04;
      let ndvi = val === 0 ? 0 : (sample.B08 - sample.B04) / val;

      // Overlay specifications: green if NDVI > 0.3, else red.
      if (ndvi > 0.3) {
        return [0.0, 0.8, 0.0, 0.5]; // Transparent Green
      } else {
        return [0.8, 0.0, 0.0, 0.5]; // Transparent Red
      }
    }
  `;

  const payload = {
    input: {
      bounds: {
        bbox: bbox,
        properties: { crs: "http://www.opengis.net/def/crs/EPSG/0/4326" }
      },
      data: [{ type: "sentinel-2-l2a" }]
    },
    output: {
      width: 512,
      height: 512,
      responses: [{ identifier: "default", format: { type: "image/png" } }]
    },
    evalscript: evalscript
  };

  const response = await axios({
    method: 'post',
    url: 'https://services.sentinel-hub.com/api/v1/process',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'image/png'
    },
    responseType: 'arraybuffer',
    data: payload,
    signal: abortSignal 
  });

  const base64Image = Buffer.from(response.data, 'binary').toString('base64');
  
  return {
    mapUrl: `data:image/png;base64,${base64Image}`,
    bounds: [
      [parseFloat(lat) - offset, parseFloat(lng) - offset],
      [parseFloat(lat) + offset, parseFloat(lng) + offset]
    ]
  };
}

module.exports = { getMapImage };
