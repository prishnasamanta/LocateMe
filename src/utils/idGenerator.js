const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateShortId(length = 6) {
  let id = '';
  for (let i = 0; i < length; i++) {
    id += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return id;
}

export function normalizeShareId(id) {
  if (!id || typeof id !== 'string') return id;
  return id.toUpperCase();
}

export function getShareUrl(id, encodedPayload) {
  const base = import.meta.env.VITE_APP_URL || window.location.origin;
  if (encodedPayload) {
    return `${base}/l/${id}?d=${encodeURIComponent(encodedPayload)}`;
  }
  return `${base}/l/${id}`;
}
