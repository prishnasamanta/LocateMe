import { doc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../firebase/config';
import { haversineDistance } from '../utils/haversine';
import { getMotionStatus } from '../utils/motionStatus';

const LOCAL_TRACK_KEY = 'locateme_visitor_track';
const TRACK_EVENT = 'locateme-visitor-track';
const HEARTBEAT_STALE_MS = 35000;

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

function parseTimestamp(value) {
  if (!value) return null;
  if (typeof value === 'string') return value;
  return value?.toDate?.()?.toISOString?.() ?? null;
}

function normalizeTrack(data) {
  if (!data) return null;

  const heartbeatAt = parseTimestamp(data.heartbeatAt ?? data.updatedAt);
  const stale = heartbeatAt
    ? Date.now() - new Date(heartbeatAt).getTime() > HEARTBEAT_STALE_MS
    : true;
  const presence = data.presence ?? (stale ? 'offline' : 'online');
  const online = presence === 'online' && !stale && data.lat != null;

  const speedKmh =
    typeof data.speed === 'number' && Number.isFinite(data.speed) ? data.speed : null;
  const motion =
    data.motionStatus?.label && data.motionStatus?.emoji
      ? data.motionStatus
      : getMotionStatus(speedKmh);

  if (data.lat == null || data.lng == null) {
    if (!online) {
      return {
        lat: null,
        lng: null,
        presence,
        online: false,
        displayName: data.displayName ?? 'Visitor',
        updatedAt: heartbeatAt,
        heartbeatAt,
      };
    }
    return null;
  }

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
    trackingMode: data.trackingMode ?? 'destination',
    bleRssi: data.bleRssi ?? null,
    bleDistanceM: data.bleDistanceM ?? null,
    presence,
    online,
    updatedAt: heartbeatAt,
    heartbeatAt,
  };
}

const lastPublishRef = { time: 0, lat: null, lng: null, metaKey: null };

export function shouldPublishPosition(
  position,
  meta = {},
  { minIntervalMs = 800, minMoveM = 1, metaIntervalMs = 4000, force = false } = {}
) {
  if (force) return true;
  if (!position) return Boolean(meta.presence);
  const now = Date.now();
  const metaKey = `${meta.presence ?? ''}|${meta.battery ?? ''}|${meta.network ?? ''}|${meta.displayName ?? ''}|${meta.trackingMode ?? ''}`;
  if (lastPublishRef.lat == null) return true;
  const movedM =
    haversineDistance(lastPublishRef.lat, lastPublishRef.lng, position.lat, position.lng) * 1000;
  if (movedM >= minMoveM) return true;
  if (metaKey !== lastPublishRef.metaKey) return true;
  if (now - lastPublishRef.time >= metaIntervalMs) return true;
  return now - lastPublishRef.time >= minIntervalMs;
}

async function writeLiveStatus(locationId, payload) {
  if (isFirebaseConfigured && db) {
    await setDoc(
      doc(db, 'locations', locationId, 'status', 'live'),
      { ...payload, heartbeatAt: serverTimestamp(), updatedAt: serverTimestamp() },
      { merge: true }
    );
    return;
  }

  const store = readLocalTrack();
  store[locationId] = payload;
  writeLocalTrack(store);
  window.dispatchEvent(new CustomEvent(TRACK_EVENT, { detail: { locationId, ...payload } }));
}

export async function setVisitorPresence(locationId, presence, meta = {}) {
  if (!locationId) return;

  const now = new Date().toISOString();
  const payload = {
    presence,
    displayName: meta.displayName ?? 'Visitor',
    battery: meta.battery ?? null,
    network: meta.network ?? null,
    heartbeatAt: now,
    updatedAt: now,
  };

  if (presence === 'offline') {
    payload.trackingMode = 'offline';
  }

  await writeLiveStatus(locationId, payload);
}

export async function publishVisitorPosition(locationId, position, meta = {}) {
  if (!locationId) return;
  const force = Boolean(meta.force);
  if (position && !shouldPublishPosition(position, meta, { force })) return;

  if (position) {
    lastPublishRef.time = Date.now();
    lastPublishRef.lat = position.lat;
    lastPublishRef.lng = position.lng;
    lastPublishRef.metaKey = `${meta.presence ?? ''}|${meta.battery ?? ''}|${meta.network ?? ''}|${meta.displayName ?? ''}|${meta.trackingMode ?? ''}`;
  }

  const rawSpeed = meta.speed ?? (position?.speed != null ? position.speed * 3.6 : null);
  const speedKmh =
    typeof rawSpeed === 'number' && Number.isFinite(rawSpeed) ? rawSpeed : null;
  const motion = getMotionStatus(speedKmh);
  const now = new Date().toISOString();

  const payload = {
    lat: position?.lat ?? null,
    lng: position?.lng ?? null,
    altitude: position?.altitude ?? null,
    accuracy: position?.accuracy ?? null,
    speed: speedKmh,
    heading: position?.heading ?? null,
    displayName: meta.displayName ?? 'Visitor',
    motionStatus: motion,
    battery: meta.battery ?? null,
    network: meta.network ?? null,
    trackingMode: meta.trackingMode ?? 'destination',
    bleRssi: meta.bleRssi ?? null,
    bleDistanceM: meta.bleDistanceM ?? null,
    presence: meta.presence ?? 'online',
    heartbeatAt: now,
    updatedAt: now,
  };

  await writeLiveStatus(locationId, payload);
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
            heartbeatAt: parseTimestamp(data.heartbeatAt ?? data.updatedAt),
            updatedAt: parseTimestamp(data.updatedAt ?? data.heartbeatAt),
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
  return visitor?.presence === 'online' && visitor?.online !== false;
}

export function getVisitorPresence(visitor) {
  return visitor?.presence ?? (visitor?.online ? 'online' : 'offline');
}

export async function publishOwnerPosition(locationId, position, meta = {}) {
  if (!locationId || !position?.lat) return;
  const now = new Date().toISOString();
  const payload = {
    lat: position.lat,
    lng: position.lng,
    accuracy: position.accuracy ?? null,
    altitude: position.altitude ?? null,
    battery: meta.battery ?? null,
    network: meta.network ?? null,
    presence: meta.presence ?? 'online',
    heartbeatAt: now,
    updatedAt: now,
  };

  if (isFirebaseConfigured && db) {
    await setDoc(
      doc(db, 'locations', locationId, 'status', 'owner'),
      { ...payload, heartbeatAt: serverTimestamp(), updatedAt: serverTimestamp() },
      { merge: true }
    );
    return;
  }

  const store = readLocalTrack();
  store[`owner:${locationId}`] = payload;
  writeLocalTrack(store);
  window.dispatchEvent(
    new CustomEvent(TRACK_EVENT, { detail: { locationId, owner: true, ...payload } })
  );
}

export async function setOwnerPresence(locationId, presence, meta = {}) {
  if (!locationId) return;
  const now = new Date().toISOString();
  const payload = {
    presence,
    battery: meta.battery ?? null,
    network: meta.network ?? null,
    heartbeatAt: now,
    updatedAt: now,
  };

  if (isFirebaseConfigured && db) {
    await setDoc(
      doc(db, 'locations', locationId, 'status', 'owner'),
      { ...payload, heartbeatAt: serverTimestamp(), updatedAt: serverTimestamp() },
      { merge: true }
    );
    return;
  }

  const store = readLocalTrack();
  const prev = store[`owner:${locationId}`] ?? {};
  store[`owner:${locationId}`] = { ...prev, ...payload };
  writeLocalTrack(store);
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
        const heartbeatAt = parseTimestamp(data.heartbeatAt ?? data.updatedAt);
        const stale = heartbeatAt
          ? Date.now() - new Date(heartbeatAt).getTime() > HEARTBEAT_STALE_MS
          : true;
        callback({
          lat: data.lat,
          lng: data.lng,
          accuracy: data.accuracy ?? null,
          altitude: data.altitude ?? null,
          presence: data.presence ?? (stale ? 'offline' : 'online'),
          online: data.presence === 'online' && !stale,
          updatedAt: heartbeatAt,
        });
      },
      () => callback(null)
    );
  }

  const read = () => {
    const store = readLocalTrack();
    const data = store[`owner:${locationId}`];
    if (!data) {
      callback(null);
      return;
    }
    const heartbeatAt = data.heartbeatAt ?? data.updatedAt;
    const stale = heartbeatAt
      ? Date.now() - new Date(heartbeatAt).getTime() > HEARTBEAT_STALE_MS
      : true;
    callback({
      ...data,
      presence: data.presence ?? (stale ? 'offline' : 'online'),
      online: data.presence === 'online' && !stale,
    });
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
