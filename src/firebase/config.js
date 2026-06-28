import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const STORAGE_KEY = 'locateme_firebase_config';

function configFromEnv() {
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
  if (!apiKey || !projectId) return null;
  return {
    apiKey,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  };
}

function configFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.apiKey && parsed?.projectId) return parsed;
  } catch {
    /* ignore */
  }
  return null;
}

export function getStoredFirebaseConfig() {
  return configFromStorage();
}

export function saveFirebaseConfig(config) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function clearStoredFirebaseConfig() {
  localStorage.removeItem(STORAGE_KEY);
}

export function getFirebaseConfigSource() {
  if (configFromEnv()) return 'env';
  if (configFromStorage()) return 'browser';
  return null;
}

const firebaseConfig = configFromEnv() ?? configFromStorage();

export const isFirebaseConfigured = Boolean(
  firebaseConfig?.apiKey && firebaseConfig?.projectId
);

let app = null;
let db = null;
let auth = null;

if (isFirebaseConfigured) {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
}

export { app, db, auth, firebaseConfig };
