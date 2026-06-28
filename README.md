# LocateMe

Share a destination link and let visitors track their distance in real time — no app install required.

## Features

**Owner Dashboard**
- Pick a location on the map or use GPS
- Set radius (50m – 5km) with visual circle
- Name, description, visibility, and expiration
- Generate short share links (`/l/AB23DF`)
- QR code + WhatsApp sharing

**Visitor Page**
- Live distance tracking via `watchPosition()`
- Direction, ETA (walk/cycle/drive), speed, accuracy
- Interactive dark-themed map with route overlay
- Compass (device orientation), radar, progress bar
- Arrival detection when inside radius
- Proximity status (Far Away → Arrived)
- Weather + sunrise/sunset at destination
- Device info (battery, network where supported)

## Tech Stack

- React + Vite
- Tailwind CSS v4
- Framer Motion
- Leaflet + OpenStreetMap (Carto dark tiles)
- Firebase Firestore (optional — falls back to localStorage)
- Open-Meteo (weather) + OSRM (routing)

## Quick Start

```bash
cd LocateMe
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

## Firebase Setup (Optional)

Without Firebase, locations are stored in the browser's localStorage (works for demo/single-device testing).

For production sharing across devices:

1. Create a [Firebase project](https://console.firebase.google.com/)
2. Enable Firestore
3. Copy `.env.example` to `.env` and fill in your config:

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_APP_URL=https://yourdomain.com
```

Firestore rules (development):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /locations/{id} {
      allow read: if true;
      allow create: if true;
    }
  }
}
```

## Deploy to Vercel

```bash
npm run build
```

Push to GitHub and import in [Vercel](https://vercel.com). Set environment variables in the Vercel dashboard. The included `vercel.json` handles SPA routing.

## Project Structure

```
src/
├── components/     # UI components (map, compass, stats, etc.)
├── pages/          # Home, Owner, Visitor
├── firebase/       # Firebase config
├── hooks/          # Geolocation, weather, device info
├── services/       # Location CRUD
└── utils/          # Haversine, bearing, ETA helpers
```

## License

MIT
