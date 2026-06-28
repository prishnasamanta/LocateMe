import { doc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../firebase/config';

const LOCAL_NOTIFY_KEY = 'locateme_visitor_notify';
const NOTIFY_EVENT = 'locateme-visitor-notify';

function readLocalNotify() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_NOTIFY_KEY) || '{}');
  } catch {
    return {};
  }
}

function writeLocalNotify(store) {
  localStorage.setItem(LOCAL_NOTIFY_KEY, JSON.stringify(store));
}

export async function notifyVisitorCompleted(locationId) {
  const payload = {
    completed: true,
    completedAt: new Date().toISOString(),
    message: 'Visitor has completed all steps and is waiting.',
  };

  if (isFirebaseConfigured && db) {
    await setDoc(
      doc(db, 'locations', locationId, 'status', 'visitor'),
      { ...payload, completedAt: serverTimestamp() },
      { merge: true }
    );
    return;
  }

  const store = readLocalNotify();
  store[locationId] = payload;
  writeLocalNotify(store);
  window.dispatchEvent(new CustomEvent(NOTIFY_EVENT, { detail: { locationId, ...payload } }));
}

export function subscribeVisitorStatus(locationId, callback) {
  if (!locationId) return () => {};

  if (isFirebaseConfigured && db) {
    return onSnapshot(
      doc(db, 'locations', locationId, 'status', 'visitor'),
      (snap) => callback(snap.exists() && snap.data()?.completed ? snap.data() : null),
      () => callback(null)
    );
  }

  const read = () => {
    const store = readLocalNotify();
    const data = store[locationId];
    callback(data?.completed ? data : null);
  };

  const onCustom = (e) => {
    if (e.detail?.locationId === locationId) read();
  };

  window.addEventListener(NOTIFY_EVENT, onCustom);
  window.addEventListener('storage', read);
  const interval = setInterval(read, 2000);
  read();

  return () => {
    window.removeEventListener(NOTIFY_EVENT, onCustom);
    window.removeEventListener('storage', read);
    clearInterval(interval);
  };
}
