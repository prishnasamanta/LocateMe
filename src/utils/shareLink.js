/**
 * Parse owner share input: full URL, path, or short destination code.
 */
export function parseShareInput(raw) {
  const text = raw.trim();
  if (!text) return null;

  if (text.includes('/l/') || text.includes('?d=')) {
    try {
      const url = text.startsWith('http') ? new URL(text) : new URL(text, window.location.origin);
      const match = url.pathname.match(/\/l\/([^/]+)/);
      if (!match) return null;
      return { id: match[1], encodedPayload: url.searchParams.get('d') };
    } catch {
      /* fall through */
    }
  }

  const pathMatch = text.match(/\/l\/([A-Z0-9]+)(?:\?d=([^&\s]+))?/i);
  if (pathMatch) {
    return {
      id: pathMatch[1].toUpperCase(),
      encodedPayload: pathMatch[2] ? decodeURIComponent(pathMatch[2]) : null,
    };
  }

  if (/^[A-Z0-9]{6}$/i.test(text)) {
    return { id: text.toUpperCase(), encodedPayload: null };
  }

  return null;
}

export function buildVisitorPath(id, encodedPayload) {
  if (encodedPayload) {
    return {
      pathname: `/l/${id}`,
      search: `?d=${encodeURIComponent(encodedPayload)}`,
    };
  }
  return { pathname: `/l/${id}` };
}
