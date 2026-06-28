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
  if (data?.lat == null || data?.lng == null) return null;
  const updatedAt = data.updatedAt ?? null;
  const stale = updatedAt ? Date.now() - new Date(updatedAt).getTime() > STALE_MS : false;
  const speedKmh =
    typeof data.speed === 'number' && Number.isFinite(data.speed) ? data.speed : null;
  const motion =
    data.motionStatus?.label && data.motionStatus?.emoji
      ? data.motionStatus
      : getMotionStatus(speedKmh);

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

const lastPublishRef = { time: 0, lat: null, lng: null, metaKey: null };

export function shouldPublishPosition(
  position,
  meta = {},
  { minIntervalMs = 800, minMoveM = 1, metaIntervalMs = 4000 } = {}
) {
  if (!position) return false;
  const now = Date.now();
  const metaKey = `${meta.battery ?? ''}|${meta.network ?? ''}|${meta.displayName ?? ''}`;
  if (lastPublishRef.lat == null) return true;
  const movedM =
    haversineDistance(lastPublishRef.lat, lastPublishRef.lng, position.lat, position.lng) * 1000;
  if (movedM >= minMoveM) return true;
  if (metaKey !== lastPublishRef.metaKey) return true;
  if (now - lastPublishRef.time >= metaIntervalMs) return true;
  return now - lastPublishRef.time >= minIntervalMs;
}

export async function publishVisitorPosition(locationId, position, meta = {}) {
  if (!locationId || !position) return;
  if (!shouldPublishPosition(position, meta)) return;

  lastPublishRef.time = Date.now();
  lastPublishRef.lat = position.lat;
  lastPublishRef.lng = position.lng;
  lastPublishRef.metaKey = `${meta.battery ?? ''}|${meta.network ?? ''}|${meta.displayName ?? ''}`;

  const rawSpeed = meta.speed ?? (position.speed != null ? position.speed * 3.6 : null);
  const speedKmh =
    typeof rawSpeed === 'number' && Number.isFinite(rawSpeed) ? rawSpeed : null;
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
  lastPublishRef.metaKey = null;
}

export function isVisitorOnline(visitor) {
  return visitor?.online !== false && visitor?.lat != null;
}

export async function publishOwnerPosition(locationId, position) {
  if (!locationId || !position?.lat) return;
  const payload = {
    lat: position.lat,
    lng: position.lng,
    accuracy: position.accuracy ?? null,
    altitude: position.altitude ?? null,
    updatedAt: new Date().toISOString(),
  };

  if (isFirebaseConfigured && db) {
    await setDoc(
      doc(db, 'locations', locationId, 'status', 'owner'),
      { ...payload, updatedAt: serverTimestamp() },
      { merge: true }
    );
    return;
  }

  const store = readLocalStore();
  store[`owner:${locationId}`] = payload;
  writeLocalStore(store);
  window.dispatchEvent(
    new CustomEvent(TRACK_EVENT, { detail: { locationId, owner: true, ...payload } })
  );
}

export function subscribeOwnerPosition(locationId, callback) {
  if (!locationId) return () => {};

  if (isFirebaseConfigured && db) {
    return onSnapshot(
      doc(db, 'locations', locationId, 'status', 'owner'),
      (snap) => {
        if (!snap.exists()) {
          callback(null);
          return;
        }
        const data = snap.data();
        callback({
          lat: data.lat,
          lng: data.lng,
          accuracy: data.accuracy ?? null,
          altitude: data.altitude ?? null,
          updatedAt: data.updatedAt?.toDate?.()?.toISOString?.() ?? data.updatedAt,
        });
      },
      () => callback(null)
    );
  }

  const read = () => {
    const store = readLocalTrack();
    callback(store[`owner:${locationId}`] ?? null);
  };

  const onCustom = (e) => {
    if (e.detail?.locationId === locationId && e.detail?.owner) read();
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

function readLocalStore() {
  return readLocalTrack();
}

function writeLocalStore(store) {
  writeLocalTrack(store);
}
