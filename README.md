# 🌿 Local Green Space Mapper

A community-driven, full-stack web application that lets users **discover, document and explore local green spaces** — parks, gardens, playgrounds, and urban forests — on an interactive Google Map.

---

## ✨ Features

| Feature | Details |
|---|---|
| 🗺️ Interactive Map | Google Maps with custom markers, info windows, dark mode style |
| 📍 Geolocation | Auto-detect user position to centre map and compute distances |
| ➕ Add Green Space | Form with image upload, facility checkboxes, and coordinate auto-fill |
| 🔍 Filters | Filter spaces by facility (Playground, Garden, Benches, Walking Track, Sports Area) |
| 📋 Sidebar | List of all spaces sorted by distance with thumbnails |
| 🌙 Dark Mode | One-click toggle with persistent preference |
| 📱 Responsive | Fully mobile-friendly UI built with Tailwind CSS |
| 🗑️ Edit / Delete | Manage existing spaces from the details page |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** v18+ and **npm**
- **MongoDB** (local or [MongoDB Atlas](https://www.mongodb.com/atlas))
- A **Google Maps API key** (see below)
- A **Firebase project** with Storage enabled (see below)

---

### 1. Clone & Install

```bash
# Clone the repo
git clone <your-repo-url>
cd green-space-mapper

# Install backend dependencies
cd server && npm install

# Install frontend dependencies
cd ../client && npm install
```

---

### 2. Configure Environment Variables

#### Backend (`server/.env`)

```bash
cp server/.env.example server/.env
```

Edit `server/.env`:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/green-space-mapper

# Firebase Admin SDK
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
```

#### Frontend (`client/.env`)

```bash
cp client/.env.example client/.env
```

Edit `client/.env`:

```env
VITE_GOOGLE_MAPS_API_KEY=your-google-maps-api-key
```

---

### 3. Setting Up Google Maps API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project → **APIs & Services** → **Library**
3. Enable: **Maps JavaScript API**
4. Go to **Credentials** → **Create Credentials** → **API Key**
5. (Recommended) Restrict the key to your domain
6. Paste the key into `client/.env` as `VITE_GOOGLE_MAPS_API_KEY`

---

### 4. Setting Up Firebase

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project
3. Go to **Storage** → **Get Started** → choose your region
4. Go to **Project Settings** → **Service Accounts** → **Generate New Private Key**
5. Copy the values from the JSON file into your `server/.env`
6. In **Storage Rules**, set them to public (for testing):

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if true;
    }
  }
}
```

---

### 5. Seed the Database (Optional)

```bash
cd server
node seed.js
```

This inserts 5 example green spaces across India.

---

### 6. Run the Application

```bash
# Terminal 1 – Start backend
cd server
npm run dev

# Terminal 2 – Start frontend
cd client
npm run dev
```

Open **http://localhost:5173** in your browser.

---

## 📁 Folder Structure

```
green-space-mapper/
├── client/                  # React + Vite frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx
│   │   │   ├── MapView.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   ├── SpaceCard.jsx
│   │   │   └── AddSpaceForm.jsx
│   │   ├── pages/
│   │   │   ├── HomePage.jsx
│   │   │   ├── AddSpacePage.jsx
│   │   │   └── DetailsPage.jsx
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── .env.example
│   └── vite.config.js
│
└── server/                  # Node.js + Express backend
    ├── models/
    │   └── Space.js         # Mongoose schema
    ├── routes/
    │   └── spaces.js        # CRUD API routes
    ├── services/
    │   └── firebase.js      # Firebase Storage helper
    ├── server.js
    ├── seed.js              # Demo data script
    └── .env.example
```

---

## 🌐 Deployment

### Frontend → Vercel

1. Push your project to GitHub
2. Go to [vercel.com](https://vercel.com) → **New Project** → Import repo
3. Set **Root Directory** to `client`
4. Add Environment Variable: `VITE_GOOGLE_MAPS_API_KEY`
5. Deploy 🚀

### Backend → Render

1. Go to [render.com](https://render.com) → **New Web Service** → Connect repo
2. Set **Root Directory** to `server`
3. **Build Command**: `npm install`
4. **Start Command**: `node server.js`
5. Add all Environment Variables from `server/.env`
6. Deploy 🚀

After deployment, update your Vercel environment variable `VITE_API_BASE_URL` to point to your Render backend URL.

---

## 🔌 API Reference

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/spaces` | Get all spaces (filter: `?facilities=playground,benches`) |
| `GET` | `/api/spaces/:id` | Get single space by ID |
| `POST` | `/api/spaces` | Create new space (multipart/form-data) |
| `PUT` | `/api/spaces/:id` | Update space |
| `DELETE` | `/api/spaces/:id` | Delete space |

---

## 📄 License

MIT
