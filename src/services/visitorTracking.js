import { doc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../firebase/config';
import { haversineDistance } from '../utils/haversine';
import { getMotionStatus } from '../utils/motionStatus';

const LOCAL_TRACK_KEY = 'locateme_visitor_track';
const TRACK_EVENT = 'locateme-visitor-track';
const STALE_MS = 120000;

function readLocalTrack() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_TRACK_KEY) || '{}');
  } catch {
    return {};
  }
}

function writeLocalTrack(store) {
  localStorage.setItem(LOCAL_TRACK_KEY, JSON.stringify(store));
}

function normalizeTrack(data) {
  if (!data?.lat || !data?.lng) return null;
  const updatedAt = data.updatedAt ?? null;
  const stale = updatedAt ? Date.now() - new Date(updatedAt).getTime() > STALE_MS : false;
  const speedKmh = data.speed ?? null;
  const motion = data.motionStatus ?? getMotionStatus(speedKmh);

  return {
    lat: data.lat,
    lng: data.lng,
    altitude: data.altitude ?? null,
    accuracy: data.accuracy ?? null,
    speed: speedKmh,
    heading: data.heading ?? null,
    displayName: data.displayName ?? 'Visitor',
    motionStatus: motion,
    battery: data.battery ?? null,
    network: data.network ?? null,
    online: !stale,
    updatedAt,
  };
}

const lastPublishRef = { time: 0, lat: null, lng: null };

export function shouldPublishPosition(position, { minIntervalMs = 800, minMoveM = 1 } = {}) {
  if (!position) return false;
  const now = Date.now();
  if (lastPublishRef.lat == null) return true;
  const movedM =
    haversineDistance(lastPublishRef.lat, lastPublishRef.lng, position.lat, position.lng) * 1000;
  if (movedM >= minMoveM) return true;
  return now - lastPublishRef.time >= minIntervalMs;
}

export async function publishVisitorPosition(locationId, position, meta = {}) {
  if (!locationId || !position) return;
  if (!shouldPublishPosition(position)) return;

  lastPublishRef.time = Date.now();
  lastPublishRef.lat = position.lat;
  lastPublishRef.lng = position.lng;

  const speedKmh = meta.speed ?? position.speed ?? null;
  const motion = getMotionStatus(speedKmh);

  const payload = {
    lat: position.lat,
    lng: position.lng,
    altitude: position.altitude ?? null,
    accuracy: position.accuracy ?? null,
    speed: speedKmh,
    heading: position.heading ?? null,
    displayName: meta.displayName ?? 'Visitor',
    motionStatus: motion,
    battery: meta.battery ?? null,
    network: meta.network ?? null,
    updatedAt: new Date().toISOString(),
  };

  if (isFirebaseConfigured && db) {
    await setDoc(
      doc(db, 'locations', locationId, 'status', 'live'),
      { ...payload, updatedAt: serverTimestamp() },
      { merge: true }
    );
    return;
  }

  const store = readLocalStore();
  store[locationId] = payload;
  writeLocalStore(store);
  window.dispatchEvent(new CustomEvent(TRACK_EVENT, { detail: { locationId, ...payload } }));
}

export function subscribeVisitorPosition(locationId, callback) {
  if (!locationId) return () => {};

  if (isFirebaseConfigured && db) {
    return onSnapshot(
      doc(db, 'locations', locationId, 'status', 'live'),
      (snap) => {
        if (!snap.exists()) {
          callback(null);
          return;
        }
        const data = snap.data();
        callback(
          normalizeTrack({
            ...data,
            updatedAt: data.updatedAt?.toDate?.()?.toISOString?.() ?? data.updatedAt,
          })
        );
      },
      () => callback(null)
    );
  }

  const read = () => {
    const store = readLocalTrack();
    callback(normalizeTrack(store[locationId]));
  };

  const onCustom = (e) => {
    if (e.detail?.locationId === locationId) read();
  };

  window.addEventListener(TRACK_EVENT, onCustom);
  window.addEventListener('storage', read);
  const interval = setInterval(read, 1000);
  read();

  return () => {
    window.removeEventListener(TRACK_EVENT, onCustom);
    window.removeEventListener('storage', read);
    clearInterval(interval);
  };
}

export function resetPublishThrottle() {
  lastPublishRef.time = 0;
  lastPublishRef.lat = null;
  lastPublishRef.lng = null;
}

export function isVisitorOnline(visitor) {
  return visitor?.online !== false && visitor?.lat != null;
}

function readLocalStore() {
  return readLocalTrack();
}

function writeLocalStore(store) {
  writeLocalTrack(store);
}
