import { doc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../firebase/config';

const RING_EVENT = 'locateme-visitor-ring';
const LOCAL_RING_KEY = 'locateme_visitor_ring';

function readLocalRing() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_RING_KEY) || '{}');
  } catch {
    return {};
  }
}

function writeLocalRing(store) {
  localStorage.setItem(LOCAL_RING_KEY, JSON.stringify(store));
}

export async function startVisitorRing(locationId) {
  if (!locationId) return;
  const ringId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const payload = { active: true, ringId, startedAt: new Date().toISOString() };

  if (isFirebaseConfigured && db) {
    await setDoc(
      doc(db, 'locations', locationId, 'status', 'ring'),
      { ...payload, startedAt: serverTimestamp() },
      { merge: true }
    );
    return ringId;
  }

  const store = readLocalRing();
  store[locationId] = payload;
  writeLocalRing(store);
  window.dispatchEvent(new CustomEvent(RING_EVENT, { detail: { locationId, ...payload } }));
  return ringId;
}

export async function stopVisitorRing(locationId) {
  if (!locationId) return;
  const payload = { active: false, ringId: null };

  if (isFirebaseConfigured && db) {
    await setDoc(doc(db, 'locations', locationId, 'status', 'ring'), payload, { merge: true });
    return;
  }

  const store = readLocalRing();
  store[locationId] = payload;
  writeLocalRing(store);
  window.dispatchEvent(new CustomEvent(RING_EVENT, { detail: { locationId, ...payload } }));
}

export function subscribeVisitorRing(locationId, callback) {
  if (!locationId) return () => {};

  if (isFirebaseConfigured && db) {
    return onSnapshot(
      doc(db, 'locations', locationId, 'status', 'ring'),
      (snap) => {
        if (!snap.exists()) {
          callback({ active: false, ringId: null });
          return;
        }
        const data = snap.data();
        callback({
          active: Boolean(data.active),
          ringId: data.ringId ?? null,
        });
      },
      () => callback({ active: false, ringId: null })
    );
  }

  const read = () => {
    const store = readLocalRing();
    callback(store[locationId] ?? { active: false, ringId: null });
  };

  const onCustom = (e) => {
    if (e.detail?.locationId === locationId) read();
  };

  window.addEventListener(RING_EVENT, onCustom);
  window.addEventListener('storage', read);
  const interval = setInterval(read, 1000);
  read();

  return () => {
    window.removeEventListener(RING_EVENT, onCustom);
    window.removeEventListener('storage', read);
    clearInterval(interval);
  };
}
