import {
  collection,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../firebase/config';
import { generateShortId } from '../utils/idGenerator';

const LOCAL_KEY = 'locateme_locations';

function readLocalStore() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) || '{}');
  } catch {
    return {};
  }
}

function writeLocalStore(data) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(data));
}

function computeExpiresAt(expiration) {
  if (!expiration || expiration === 'never') return null;
  const now = Date.now();
  const offsets = {
    '1h': 60 * 60 * 1000,
    '1d': 24 * 60 * 60 * 1000,
    '1w': 7 * 24 * 60 * 60 * 1000,
  };
  const ms = offsets[expiration];
  return ms ? new Date(now + ms).toISOString() : null;
}

function isExpired(location) {
  if (!location.expires) return false;
  return new Date(location.expires) < new Date();
}

function normalizeLocation(data, id) {
  return {
    id,
    name: data.name || 'Destination',
    description: data.description || '',
    lat: data.lat,
    lng: data.lng,
    radius: data.radius ?? 500,
    visibility: data.visibility ?? 'public',
    expires: data.expires ?? null,
    createdAt: data.createdAt ?? new Date().toISOString(),
    owner: data.owner ?? 'anonymous',
  };
}

export async function saveLocation(locationData) {
  const id = generateShortId();
  const expires = computeExpiresAt(locationData.expiration);
  const payload = {
    ...locationData,
    expires,
    createdAt: new Date().toISOString(),
    owner: 'anonymous',
  };
  delete payload.expiration;

  if (isFirebaseConfigured && db) {
    await setDoc(doc(db, 'locations', id), {
      ...payload,
      createdAt: serverTimestamp(),
      expires: expires ? Timestamp.fromDate(new Date(expires)) : null,
    });
  } else {
    const store = readLocalStore();
    store[id] = payload;
    writeLocalStore(store);
  }

  return { id, ...payload };
}

export async function getLocation(id) {
  if (isFirebaseConfigured && db) {
    const snap = await getDoc(doc(db, 'locations', id));
    if (!snap.exists()) return null;
    const data = snap.data();
    const expires = data.expires?.toDate?.()?.toISOString?.() ?? data.expires ?? null;
    const location = normalizeLocation(
      {
        ...data,
        expires,
        createdAt: data.createdAt?.toDate?.()?.toISOString?.() ?? data.createdAt,
      },
      id
    );
    return isExpired(location) ? null : location;
  }

  const store = readLocalStore();
  const data = store[id];
  if (!data) return null;
  const location = normalizeLocation(data, id);
  return isExpired(location) ? null : location;
}

export async function locationExists(id) {
  const loc = await getLocation(id);
  return loc !== null;
}

export { collection };
