/**
 * Compact URL-safe encoding so share links work across devices without a backend.
 */

function toBase64Url(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(encoded) {
  const padded = encoded + '='.repeat((4 - (encoded.length % 4)) % 4);
  const binary = atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function encodeLocationPayload(location) {
  const compact = {
    n: location.name,
    d: location.description || '',
    la: location.lat,
    ln: location.lng,
    r: location.radius ?? 500,
    a: location.altitude ?? undefined,
    e: location.expires || undefined,
  };
  return toBase64Url(JSON.stringify(compact));
}

export function decodeLocationPayload(encoded, id) {
  if (!encoded) return null;
  try {
    const data = JSON.parse(fromBase64Url(encoded));
    if (typeof data.la !== 'number' || typeof data.ln !== 'number') return null;
    return {
      id,
      name: data.n || 'Destination',
      description: data.d || '',
      lat: data.la,
      lng: data.ln,
      radius: data.r ?? 500,
      altitude: data.a ?? null,
      visibility: 'public',
      expires: data.e ?? null,
      createdAt: new Date().toISOString(),
      owner: 'anonymous',
    };
  } catch {
    return null;
  }
}
