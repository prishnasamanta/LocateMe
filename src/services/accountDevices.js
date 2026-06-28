import {
  collection,
  doc,
  setDoc,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../firebase/config';
import { haversineDistance } from '../utils/haversine';
import { getDeviceLabel } from '../utils/deviceId';
import { getMotionStatus } from '../utils/motionStatus';

const HEARTBEAT_STALE_MS = 35000;
const lastPublishRef = { time: 0, lat: null, lng: null, metaKey: null };

function parseTimestamp(value) {
  if (!value) return null;
  if (typeof value === 'string') return value;
  return value?.toDate?.()?.toISOString?.() ?? null;
}

function shouldPublish(position, meta = {}, minIntervalMs = 800, minMoveM = 1) {
  if (!position) return Boolean(meta.presence);
  const now = Date.now();
  const metaKey = `${meta.presence}|${meta.battery}|${meta.network}|${meta.trackingMode}`;
  if (lastPublishRef.lat == null) return true;
  const movedM =
    haversineDistance(lastPublishRef.lat, lastPublishRef.lng, position.lat, position.lng) * 1000;
  if (movedM >= minMoveM) return true;
  if (metaKey !== lastPublishRef.metaKey) return true;
  return now - lastPublishRef.time >= minIntervalMs;
}

function normalizeDevice(data) {
  const heartbeatAt = parseTimestamp(data.heartbeatAt ?? data.updatedAt);
  const stale = heartbeatAt
    ? Date.now() - new Date(heartbeatAt).getTime() > HEARTBEAT_STALE_MS
    : true;
  const presence = data.presence ?? (stale ? 'offline' : 'online');
  const speedKmh =
    typeof data.speedKmh === 'number'
      ? data.speedKmh
      : typeof data.speed === 'number' && data.speed < 25
        ? data.speed * 3.6
        : typeof data.speed === 'number'
          ? data.speed
          : null;

  return {
    ...data,
    speedKmh,
    motionStatus: data.motionStatus ?? getMotionStatus(speedKmh),
    heartbeatAt,
    updatedAt: heartbeatAt,
    presence,
    online: presence === 'online' && !stale,
  };
}

export async function publishAccountDevicePosition(uid, deviceId, position, options = {}) {
  if (!isFirebaseConfigured || !db || !uid || !deviceId) return;
  if (!position && !options.presence) return;

  const meta = {
    presence: options.presence ?? 'online',
    battery: options.battery ?? null,
    network: options.network ?? null,
    trackingMode: options.trackingMode ?? 'gps',
  };

  if (position && !shouldPublish(position, meta)) return;

  if (position) {
    lastPublishRef.time = Date.now();
    lastPublishRef.lat = position.lat;
    lastPublishRef.lng = position.lng;
    lastPublishRef.metaKey = `${meta.presence}|${meta.battery}|${meta.network}|${meta.trackingMode}`;
  }

  const speedRaw = position?.speed;
  const speedKmh =
    typeof options.speedKmh === 'number'
      ? options.speedKmh
      : typeof speedRaw === 'number' && speedRaw < 25
        ? speedRaw * 3.6
        : speedRaw ?? null;

  await setDoc(
    doc(db, 'users', uid, 'devices', deviceId),
    {
      deviceId,
      label: options.label ?? getDeviceLabel(),
      lat: position?.lat ?? null,
      lng: position?.lng ?? null,
      altitude: position?.altitude ?? null,
      accuracy: position?.accuracy ?? null,
      speed: speedKmh,
      speedKmh,
      heading: position?.heading ?? null,
      battery: meta.battery,
      network: meta.network,
      presence: meta.presence,
      trackingMode: meta.trackingMode,
      motionStatus: getMotionStatus(speedKmh),
      viaJoin: options.viaJoin ?? false,
      heartbeatAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function setAccountDevicePresence(uid, deviceId, presence, meta = {}) {
  if (!isFirebaseConfigured || !db || !uid || !deviceId) return;
  await setDoc(
    doc(db, 'users', uid, 'devices', deviceId),
    {
      deviceId,
      label: meta.label ?? getDeviceLabel(),
      presence,
      battery: meta.battery ?? null,
      network: meta.network ?? null,
      heartbeatAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export function subscribeAccountDevices(uid, callback) {
  if (!isFirebaseConfigured || !db || !uid) {
    callback([]);
    return () => {};
  }

  return onSnapshot(
    collection(db, 'users', uid, 'devices'),
    (snap) => {
      const devices = snap.docs.map((d) => normalizeDevice({ id: d.id, ...d.data() }));
      callback(devices);
    },
    () => callback([])
  );
}

export async function saveAccountDestination(uid, destination) {
  if (!isFirebaseConfigured || !db || !uid) {
    throw new Error('Firebase is required for Google account tracking');
  }

  await setDoc(
    doc(db, 'users', uid, 'destination', 'active'),
    {
      ...destination,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export function subscribeAccountDestination(uid, callback) {
  if (!isFirebaseConfigured || !db || !uid) {
    callback(null);
    return () => {};
  }

  return onSnapshot(
    doc(db, 'users', uid, 'destination', 'active'),
    (snap) => {
      if (!snap.exists()) {
        callback(null);
        return;
      }
      const data = snap.data();
      callback({
        ...data,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString?.() ?? data.updatedAt ?? null,
      });
    },
    () => callback(null)
  );
}

export function resetAccountPublishThrottle() {
  lastPublishRef.time = 0;
  lastPublishRef.lat = null;
  lastPublishRef.lng = null;
  lastPublishRef.metaKey = null;
}

export function isDeviceOnline(device, maxAgeMs = HEARTBEAT_STALE_MS) {
  if (device?.presence === 'offline') return false;
  const ts = device?.heartbeatAt ?? device?.updatedAt;
  if (!ts) return false;
  return Date.now() - new Date(ts).getTime() <= maxAgeMs;
}

/** @deprecated use isDeviceOnline */
export function isDeviceStale(device, maxAgeMs = HEARTBEAT_STALE_MS) {
  return !isDeviceOnline(device, maxAgeMs);
}

export function getDevicePresence(device) {
  return device?.presence ?? (isDeviceOnline(device) ? 'online' : 'offline');
}
