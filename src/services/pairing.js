import {
  collection,
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../firebase/config';
import { normalizeShareId } from '../utils/idGenerator';
import { normalizePairKey } from '../utils/pairKey';

const LOCAL_PAIRS_KEY = 'locateme_device_pairs';
const LOCAL_PAIR_KEYS_KEY = 'locateme_pair_keys';

function readLocalPairs() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_PAIRS_KEY) || '{}');
  } catch {
    return {};
  }
}

function writeLocalPairs(data) {
  localStorage.setItem(LOCAL_PAIRS_KEY, JSON.stringify(data));
}

function readLocalPairKeys() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_PAIR_KEYS_KEY) || '{}');
  } catch {
    return {};
  }
}

export function storeLocalPairKey(shareId, pairKey) {
  const keys = readLocalPairKeys();
  keys[normalizeShareId(shareId)] = normalizePairKey(pairKey);
  localStorage.setItem(LOCAL_PAIR_KEYS_KEY, JSON.stringify(keys));
}

export async function fetchPairKey(shareId) {
  const id = normalizeShareId(shareId);
  if (isFirebaseConfigured && db) {
    try {
      const snap = await getDoc(doc(db, 'shareCodes', id));
      if (snap.exists()) return snap.data()?.pairKey ?? null;
    } catch {
      /* fall through */
    }
  }
  return readLocalPairKeys()[id] ?? null;
}

export async function verifyPairKey(shareId, pairKey) {
  const expected = await fetchPairKey(shareId);
  if (!expected) return false;
  return expected === normalizePairKey(pairKey);
}

export async function pairDeviceToShare(
  shareId,
  { uid, deviceId, label, pairKey, email, displayName }
) {
  const id = normalizeShareId(shareId);
  const normalizedKey = normalizePairKey(pairKey);
  if (!isValidPairRequest(normalizedKey)) {
    throw new Error('Enter the 8-character pair key from the owner.');
  }
  if (!(await verifyPairKey(id, normalizedKey))) {
    throw new Error('Invalid pair key. Ask the owner for the current key.');
  }

  const record = {
    shareId: id,
    uid: uid ?? null,
    deviceId,
    label: label || 'Device',
    email: email ?? null,
    displayName: displayName ?? label ?? 'Device',
    pairedAt: new Date().toISOString(),
  };

  if (isFirebaseConfigured && db) {
    await setDoc(doc(db, 'locations', id, 'pairs', deviceId), {
      ...record,
      pairedAt: serverTimestamp(),
    });
    if (uid) {
      await setDoc(
        doc(db, 'users', uid, 'devices', deviceId),
        { pairedShareId: id, viaJoin: true, role: 'joiner' },
        { merge: true }
      );
    }
    return record;
  }

  const store = readLocalPairs();
  if (!store[id]) store[id] = {};
  store[id][deviceId] = record;
  writeLocalPairs(store);
  return record;
}

function isValidPairRequest(key) {
  return key.length >= 6;
}

export function subscribePairedDevices(shareId, callback) {
  const id = normalizeShareId(shareId);
  if (!id) {
    callback([]);
    return () => {};
  }

  if (isFirebaseConfigured && db) {
    return onSnapshot(
      collection(db, 'locations', id, 'pairs'),
      (snap) => {
        const pairs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        callback(pairs);
      },
      () => callback([])
    );
  }

  const read = () => {
    const store = readLocalPairs();
    const pairs = Object.entries(store[id] ?? {}).map(([deviceId, data]) => ({
      id: deviceId,
      ...data,
    }));
    callback(pairs);
  };

  const interval = setInterval(read, 1500);
  read();
  return () => clearInterval(interval);
}

export function getPairedDeviceIds(pairs) {
  return (pairs ?? []).map((p) => p.deviceId ?? p.id).filter(Boolean);
}
