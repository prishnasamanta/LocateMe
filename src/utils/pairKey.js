const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generatePairKey(length = 8) {
  let key = '';
  for (let i = 0; i < length; i++) {
    key += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return key;
}

export function normalizePairKey(key) {
  if (!key || typeof key !== 'string') return '';
  return key.trim().toUpperCase().replace(/\s+/g, '');
}

export function isValidPairKeyFormat(key) {
  const normalized = normalizePairKey(key);
  return normalized.length >= 6 && /^[A-Z0-9]+$/.test(normalized);
}
