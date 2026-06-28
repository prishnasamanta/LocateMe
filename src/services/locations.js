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
import { encodeLocationPayload, decodeLocationPayload } from '../utils/locationPayload';

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
    altitude: data.altitude ?? null,
    visibility: data.visibility ?? 'public',
    expires: data.expires ?? null,
    createdAt: data.createdAt ?? new Date().toISOString(),
    owner: data.owner ?? 'anonymous',
  };
}

async function fetchShareCodePayload(id) {
  if (!isFirebaseConfigured || !db) return null;
  try {
    const snap = await getDoc(doc(db, 'shareCodes', id));
    if (!snap.exists()) return null;
    return snap.data()?.d ?? null;
  } catch {
    return null;
  }
}

export async function getLocation(id, encodedPayload) {
  let payload = encodedPayload;
  if (!payload) {
    payload = await fetchShareCodePayload(id);
  }

  const fromEmbedded = decodeLocationPayload(payload, id);
  if (fromEmbedded && !isExpired(fromEmbedded)) return fromEmbedded;

  if (isFirebaseConfigured && db) {
    try {
      const snap = await getDoc(doc(db, 'locations', id));
      if (!snap.exists()) return fromEmbedded && !isExpired(fromEmbedded) ? fromEmbedded : null;
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
    } catch {
      return fromEmbedded && !isExpired(fromEmbedded) ? fromEmbedded : null;
    }
  }

  const store = readLocalStore();
  const data = store[id];
  if (!data) return fromEmbedded && !isExpired(fromEmbedded) ? fromEmbedded : null;
  const location = normalizeLocation(data, id);
  return isExpired(location) ? null : location;
}

export async function resolveShareInput(parsed) {
  if (!parsed?.id) return null;
  let payload = parsed.encodedPayload;
  if (!payload) payload = await fetchShareCodePayload(parsed.id);
  const location = await getLocation(parsed.id, payload);
  if (!location) return null;
  return { location, encodedPayload: payload };
}

export async function saveLocation(locationData) {
  const id = generateShortId();
  const expires = computeExpiresAt(locationData.expiration);
  const { expiration, ownerUid, ownerEmail, ...rest } = locationData;
  const payload = {
    ...rest,
    expires,
    createdAt: new Date().toISOString(),
    owner: ownerEmail || ownerUid || 'anonymous',
    ownerUid: ownerUid ?? null,
    ownerEmail: ownerEmail ?? null,
  };

  const location = { id, ...payload };
  const encodedPayload = encodeLocationPayload(location);

  if (isFirebaseConfigured && db) {
    try {
      await setDoc(doc(db, 'locations', id), {
        ...payload,
        createdAt: serverTimestamp(),
        expires: expires ? Timestamp.fromDate(new Date(expires)) : null,
      });
      await setDoc(doc(db, 'shareCodes', id), {
        d: encodedPayload,
        createdAt: serverTimestamp(),
      });
    } catch {
      const store = readLocalStore();
      store[id] = payload;
      writeLocalStore(store);
    }
  } else {
    const store = readLocalStore();
    store[id] = payload;
    writeLocalStore(store);
  }

  return { ...location, encodedPayload };
}

export async function locationExists(id) {
  const loc = await getLocation(id);
  return loc !== null;
}

export { collection };
