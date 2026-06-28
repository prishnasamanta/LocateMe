import { normalizeShareId } from './idGenerator';

function extractPayloadFromText(text) {
  const dMatch = text.match(/[?&]d=([^&\s#]+)/i);
  if (!dMatch) return null;
  try {
    return decodeURIComponent(dMatch[1]);
  } catch {
    return dMatch[1];
  }
}

/**
 * Parse owner share input: full URL, path, or short destination code.
 */
export function parseShareInput(raw) {
  const text = raw.trim().replace(/\s+/g, '');
  if (!text) return null;

  if (text.includes('/l/') || text.includes('?d=') || text.startsWith('http')) {
    try {
      const url = text.startsWith('http') ? new URL(text) : new URL(text, window.location.origin);
      const match = url.pathname.match(/\/l\/([^/]+)/i);
      if (!match) return null;
      const encodedPayload =
        url.searchParams.get('d')?.trim() || extractPayloadFromText(text);
      return {
        id: normalizeShareId(match[1]),
        encodedPayload: encodedPayload || null,
      };
    } catch {
      /* fall through */
    }
  }

  const pathMatch = text.match(/\/l\/([A-Z0-9]+)(?:\?d=([^&\s#]+))?/i);
  if (pathMatch) {
    let payload = pathMatch[2] ?? null;
    if (payload) {
      try {
        payload = decodeURIComponent(payload);
      } catch {
        /* keep raw */
      }
    }
    return {
      id: normalizeShareId(pathMatch[1]),
      encodedPayload: payload,
    };
  }

  if (/^[A-Z0-9]{6}$/i.test(text)) {
    return { id: normalizeShareId(text), encodedPayload: null };
  }

  return null;
}

export function buildVisitorPath(id, encodedPayload) {
  const normalizedId = normalizeShareId(id);
  if (encodedPayload) {
    return {
      pathname: `/l/${normalizedId}`,
      search: `?d=${encodeURIComponent(encodedPayload)}`,
    };
  }
  return { pathname: `/l/${normalizedId}` };
}
