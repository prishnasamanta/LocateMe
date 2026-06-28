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

const lastPublishRef = { time: 0, lat: null, lng: null };

function shouldPublish(position, minIntervalMs = 800, minMoveM = 1) {
  if (!position) return false;
  const now = Date.now();
  if (lastPublishRef.lat == null) return true;
  const movedM =
    haversineDistance(lastPublishRef.lat, lastPublishRef.lng, position.lat, position.lng) * 1000;
  if (movedM >= minMoveM) return true;
  return now - lastPublishRef.time >= minIntervalMs;
}

export async function publishAccountDevicePosition(uid, deviceId, position) {
  if (!isFirebaseConfigured || !db || !uid || !deviceId || !position) return;
  if (!shouldPublish(position)) return;

  lastPublishRef.time = Date.now();
  lastPublishRef.lat = position.lat;
  lastPublishRef.lng = position.lng;

  await setDoc(
    doc(db, 'users', uid, 'devices', deviceId),
    {
      deviceId,
      label: getDeviceLabel(),
      lat: position.lat,
      lng: position.lng,
      altitude: position.altitude ?? null,
      accuracy: position.accuracy ?? null,
      speed: position.speed ?? null,
      heading: position.heading ?? null,
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
      const devices = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          updatedAt: data.updatedAt?.toDate?.()?.toISOString?.() ?? data.updatedAt ?? null,
        };
      });
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
}

export function isDeviceStale(device, maxAgeMs = 120000) {
  if (!device?.updatedAt) return true;
  const t = new Date(device.updatedAt).getTime();
  return Date.now() - t > maxAgeMs;
}
