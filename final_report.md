# 🌿 Green Space Mapper — Final Project Report

> A community-driven, full-stack web application for discovering, documenting, and exploring local green spaces worldwide.

---

## 📌 Project Overview

**Green Space Mapper** lets users discover parks, gardens, playgrounds, and urban forests on an interactive map. It supports community-driven space submissions, real-time environmental data (weather + AQI), route planning, nearby OSM place discovery, global exploration, and full CRUD management of spaces.

**Live Deployments:**
- **Frontend**: Vercel
- **Backend**: Render
- **Repository**: [GitHub — GREEN_SPACE_MAPPER](https://github.com/suryakumargarikini-a11y/GREEN_SPACE_MAPPER)

---

## 🏗️ Architecture

```
green-space-mapper/
├── client/          ← React + Vite (Frontend, deployed on Vercel)
├── server/          ← Node.js + Express (Backend, deployed on Render)
└── tests/           ← Playwright E2E + k6 Performance Tests
```

The app uses a classic **client-server monorepo** pattern:
- The **frontend** talks to the backend REST API via `axios`
- The **backend** talks to MongoDB (via Mongoose) for data and Firebase Storage for images
- External APIs are called from both client and server depending on sensitivity

---

## 🖥️ Frontend Stack

| Technology | Version | Purpose |
|---|---|---|
| **React** | ^19.2.0 | UI framework |
| **Vite** | ^7.3.1 | Build tool & dev server |
| **React Router DOM** | ^7.13.1 | Client-side routing |
| **Tailwind CSS** | ^4.2.1 | Utility-first styling |
| **@tailwindcss/vite** | ^4.2.1 | Tailwind Vite plugin |
| **@vis.gl/react-google-maps** | ^1.7.1 | Google Maps integration |
| **Leaflet** | ^1.9.4 | Alternative interactive maps |
| **React Leaflet** | ^5.0.0 | React bindings for Leaflet |
| **leaflet-geosearch** | ^4.2.2 | Geocoding search for Leaflet |
| **Axios** | ^1.13.6 | HTTP client for API calls |
| **Lucide React** | ^0.576.0 | Icon library |

### Dev Dependencies
| Tool | Purpose |
|---|---|
| **ESLint** ^9.39.1 | Linting |
| **@vitejs/plugin-react** | JSX fast refresh |
| **eslint-plugin-react-hooks** | Hooks linting rules |
| **eslint-plugin-react-refresh** | HMR linting |

---

## ⚙️ Backend Stack

| Technology | Version | Purpose |
|---|---|---|
| **Node.js** | v18+ | Runtime |
| **Express** | ^5.2.1 | Web framework |
| **Mongoose** | ^9.2.3 | MongoDB ODM |
| **Firebase Admin** | ^13.7.0 | Firebase Storage for image uploads |
| **Multer** | ^2.1.0 | Multipart form-data / file upload handling |
| **CORS** | ^2.8.6 | Cross-origin resource sharing |
| **dotenv** | ^17.3.1 | Environment variable management |

---

## 🌐 External APIs & Services Used

| API / Service | Used For | Free / Paid |
|---|---|---|
| **Google Maps JavaScript API** | Interactive map, markers, info windows, dark mode map style | Paid (with free tier) |
| **Google Maps Geocoding** | Coordinate auto-fill when adding spaces | Paid (with free tier) |
| **OpenStreetMap (OSM) Overpass API** | Fetching nearby green spaces without a custom database | Free |
| **Nominatim Geocoding API** | Global location search in the Explore page | Free |
| **Open-Meteo API** | Real-time weather data (temperature, wind, precipitation) | Free |
| **Open-AQI / WAQI API** | Real-time Air Quality Index (AQI) | Free |
| **Firebase Storage** | Storing user-uploaded space images | Free (Spark plan) |
| **MongoDB Atlas** | Cloud database for green space records | Free (M0 cluster) |

---

## 📄 Pages & Features

| Page | File | Key Features |
|---|---|---|
| **Home** | `HomePage.jsx` | Map view, space list, geolocation, dark mode |
| **Add Space** | `AddSpacePage.jsx` | Form with image upload, facility checkboxes, coordinate auto-fill |
| **Details** | `DetailsPage.jsx` | Full space info, weather, AQI, route planner, nearby OSM places, edit/delete |
| **Explore** | `ExplorePage.jsx` | Global search via Nominatim, real-time weather + AQI, nearby OSM discovery |

---

## 🧩 Components

| Component | Purpose |
|---|---|
| `Navbar.jsx` | Top navigation bar with dark mode toggle |
| `MapView.jsx` | Core Google Maps component — custom markers, info windows, dark mode tiles |
| `Sidebar.jsx` | Sortable list of spaces with thumbnails and distance |
| `SpaceCard.jsx` | Card component for each space in the sidebar |
| `AddSpaceForm.jsx` | Full space submission form — image upload, facilities, coordinates |
| `RoutePanel.jsx` | Route planning panel — start/end input, turn-by-turn directions |

---

## 🪝 Custom Hooks

| Hook | File | Purpose |
|---|---|---|
| `useNearbyPlaces` | `hooks/useNearbyPlaces.js` | Fetches nearby green spaces via OSM Overpass API and surfaces them in the UI |

---

## 🛠️ Utilities

| Utility | File | Purpose |
|---|---|---|
| `bestTime` | `utils/bestTime.js` | Algorithm that calculates the recommended best time to visit a green space based on weather, AQI, and time-of-day data |

---

## 🗄️ Database Schema

### `Space` Model (`server/models/Space.js`) — MongoDB via Mongoose

| Field | Type | Description |
|---|---|---|
| `name` | String | Name of the green space |
| `description` | String | User-provided description |
| `lat` / `lng` | Number | GPS coordinates |
| `facilities` | [String] | Array: Playground, Garden, Benches, Walking Track, Sports Area |
| `imageUrl` | String | Firebase Storage URL for uploaded photo |
| `createdAt` | Date | Auto-timestamp |

---

## 🔌 REST API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/spaces` | List all spaces (supports `?facilities=` filter) |
| `GET` | `/api/spaces/:id` | Get a single space |
| `POST` | `/api/spaces` | Create a new space (multipart/form-data with image) |
| `PUT` | `/api/spaces/:id` | Update an existing space |
| `DELETE` | `/api/spaces/:id` | Delete a space |

---

## 🧪 Testing Suite

### E2E Tests — Playwright (`tests/e2e/`)

| Test File | What It Covers |
|---|---|
| `add-space.spec.js` | Form validation, image upload, space creation flow |
| `api.spec.js` | Direct API endpoint testing (CRUD) |
| `details.spec.js` | Details page — weather, AQI, route planning, OSM nearby places |
| `edge-cases.spec.js` | 404 handling, empty states, invalid inputs |
| `filters.spec.js` | Facility filter combinations and space list results |
| `map.spec.js` | Map rendering, marker clicks, info windows |
| `route-planner.spec.js` | Route planning — start/end input, direction results |
| `search.spec.js` | Search / Nominatim geocoding in the Explore page |

### Page Object Models (`tests/pages/`)
- `HomePage.js`, `DetailsPage.js`, `AddSpacePage.js`, `ExplorePage.js`

### Performance Tests (`tests/performance/`)
| File | Tool | What It Tests |
|---|---|---|
| `k6-load.js` | **k6** | Load testing the backend `/api/spaces` endpoint under concurrent users |

---

## 🚀 Deployment

### Frontend → Vercel
- Root directory: `client/`
- Environment variable: `VITE_GOOGLE_MAPS_API_KEY`
- Auto-deploys on GitHub push

### Backend → Render
- Root directory: `server/`
- Build command: `npm install`
- Start command: `node server.js`
- Environment variables: `MONGO_URI`, `FIREBASE_*` credentials, `PORT`

---

## 🌍 Environment Variables Summary

### `client/.env`
```env
VITE_GOOGLE_MAPS_API_KEY=...
VITE_API_BASE_URL=...         # Points to Render backend
```

### `server/.env`
```env
PORT=5000
MONGO_URI=...
FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY=...
FIREBASE_STORAGE_BUCKET=...
```

---

## 📊 Key Design Decisions

| Decision | Rationale |
|---|---|
| **MongoDB + Mongoose** | Schema-flexible NoSQL ideal for community-submitted data with varying facility types |
| **Firebase Storage** | Free image hosting with direct CDN URLs, no server-side storage needed |
| **OSM Overpass API** | Completely free, no key required — enables global nearby space discovery |
| **Open-Meteo for weather** | Fully free, no API key, accurate global coverage |
| **Leaflet + Google Maps** | Google Maps for main UX, Leaflet used in Explore for global multi-provider tile support |
| **Playwright for E2E** | Industry-standard, fast, supports Chromium/Firefox/Safari |
| **k6 for load testing** | Lightweight Go-based tool, ideal for CI pipeline performance benchmarks |

---

## 📁 Full File Inventory

```
green-space-mapper/
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── AddSpaceForm.jsx
│   │   │   ├── MapView.jsx
│   │   │   ├── Navbar.jsx
│   │   │   ├── RoutePanel.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   └── SpaceCard.jsx
│   │   ├── hooks/
│   │   │   └── useNearbyPlaces.js
│   │   ├── pages/
│   │   │   ├── AddSpacePage.jsx
│   │   │   ├── DetailsPage.jsx
│   │   │   ├── ExplorePage.jsx
│   │   │   └── HomePage.jsx
│   │   ├── utils/
│   │   │   └── bestTime.js
│   │   ├── App.jsx
│   │   ├── App.css
│   │   ├── index.css
│   │   └── main.jsx
│   ├── index.html
│   ├── vite.config.js
│   ├── eslint.config.js
│   └── package.json
│
├── server/
│   ├── models/
│   │   └── Space.js
│   ├── routes/
│   │   └── spaces.js
│   ├── services/
│   │   └── firebase.js
│   ├── server.js
│   ├── seed.js
│   └── package.json
│
├── tests/
│   ├── e2e/
│   │   ├── add-space.spec.js
│   │   ├── api.spec.js
│   │   ├── details.spec.js
│   │   ├── edge-cases.spec.js
│   │   ├── filters.spec.js
│   │   ├── map.spec.js
│   │   ├── route-planner.spec.js
│   │   └── search.spec.js
│   ├── pages/
│   │   ├── AddSpacePage.js
│   │   ├── DetailsPage.js
│   │   ├── ExplorePage.js
│   │   └── HomePage.js
│   ├── performance/
│   │   └── k6-load.js
│   └── utils/
├── playwright.config.js
├── package.json
└── README.md
```
