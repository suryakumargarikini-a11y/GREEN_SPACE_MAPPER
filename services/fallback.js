/**
 * Fallback service generates structured dummy analysis data
 * spanning all extended geospatial statistics when APIs fail.
 */

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomFloat(min, max, decimals = 2) {
  const str = (Math.random() * (max - min) + min).toFixed(decimals);
  return parseFloat(str);
}

function getVegetationLevel(ndvi) {
  if (ndvi < 0.3) return "Low";
  if (ndvi <= 0.6) return "Medium";
  return "High";
}

const LAND_TYPES = ["Urban", "Forest", "Agriculture", "Water", "Mixed"];

// Generates logically consistent heuristics across all required percentages
function generateHeuristics() {
  const landType = LAND_TYPES[getRandomInt(0, LAND_TYPES.length - 1)];
  let greenArea, nonGreenArea, ndvi, treeCover, urbanDensity, soilMoisture, water;

  if (landType === "Forest") {
    greenArea = getRandomInt(65, 95);
    ndvi = getRandomFloat(0.55, 0.9);
    treeCover = getRandomInt(60, 90);
    urbanDensity = getRandomInt(0, 5);
    water = getRandomInt(0, 15);
    soilMoisture = getRandomInt(50, 90);
  } else if (landType === "Urban") {
    greenArea = getRandomInt(5, 30);
    ndvi = getRandomFloat(0.1, 0.3);
    treeCover = getRandomInt(2, 15);
    urbanDensity = getRandomInt(70, 95);
    water = getRandomInt(0, 10);
    soilMoisture = getRandomInt(10, 40);
  } else if (landType === "Water") {
    greenArea = getRandomInt(0, 15);
    ndvi = getRandomFloat(0.01, 0.2);
    treeCover = getRandomInt(0, 5);
    urbanDensity = getRandomInt(0, 5);
    water = getRandomInt(70, 100);
    soilMoisture = 100;
  } else if (landType === "Agriculture") {
    greenArea = getRandomInt(50, 85);
    ndvi = getRandomFloat(0.4, 0.7);
    treeCover = getRandomInt(5, 20);
    urbanDensity = getRandomInt(0, 10);
    water = getRandomInt(5, 15);
    soilMoisture = getRandomInt(40, 80);
  } else {
    // Mixed
    greenArea = getRandomInt(30, 60);
    ndvi = getRandomFloat(0.25, 0.55);
    treeCover = getRandomInt(10, 40);
    urbanDensity = getRandomInt(20, 50);
    water = getRandomInt(5, 25);
    soilMoisture = getRandomInt(30, 60);
  }

  nonGreenArea = 100 - greenArea;

  return {
    landType,
    greenArea: greenArea + "%",
    nonGreenArea: nonGreenArea + "%",
    ndvi,
    vegetationDensity: getVegetationLevel(ndvi),
    treeCover: treeCover + "%",
    urbanDensity: urbanDensity + "%",
    soilMoisture: soilMoisture + "%",
    water: water + "%"
  };
}

function getFallbackCoordinates() {
  return {
    lat: parseFloat((Math.random() * (60 - (-40)) + (-40)).toFixed(4)),
    lng: parseFloat((Math.random() * (120 - (-120)) + (-120)).toFixed(4))
  };
}

function getFallbackData(placeNameInput, actualCoordinates = null) {
  const coords = actualCoordinates || getFallbackCoordinates();
  const heuristics = generateHeuristics();

  // Offset standard is 0.05 around targeting center
  const offset = 0.05;
  const overlayBounds = [
    [coords.lat - offset, coords.lng - offset],
    [coords.lat + offset, coords.lng + offset]
  ];

  // Dummy raster transparent map 
  const fallbackSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><rect width="512" height="512" fill="rgba(255, 0, 0, 0.4)"/><circle cx="256" cy="256" r="100" fill="rgba(0, 255, 0, 0.5)"/><text x="50%" y="50%" text-anchor="middle" fill="#fff" font-family="sans-serif" font-size="20">SIMULATED OVERLAY</text></svg>`;
  const mapUrl = "data:image/svg+xml;base64," + Buffer.from(fallbackSvg).toString('base64');

  return {
    status: "Fallback",
    placeName: placeNameInput,
    coordinates: coords,
    mapUrl,
    overlayBounds,
    ...heuristics
  };
}

// Optionally publicize heuristics separately if Sentinel is alive 
// but we just need fast math to pair with an image.
module.exports = { getFallbackData, generateHeuristics };
