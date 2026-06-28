import { haversineDistance } from './haversine';

const METERS_PER_DEG_LAT = 111320;

function metersLngPerDegree(lat) {
  return METERS_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180);
}

/**
 * Horizontal + vertical offset of visitor relative to destination (map north = up).
 */
export function computeRelativePosition(
  visitor,
  destination,
  { minOffsetM = 3, minAltitudeM = 2, inRangeOnly = false, radiusM = 500 } = {}
) {
  if (!visitor?.lat || !destination?.lat) {
    return { distanceM: null, badges: [], sameHeight: true, inRange: false };
  }

  const distanceM = haversineDistance(visitor.lat, visitor.lng, destination.lat, destination.lng) * 1000;
  const inRange = distanceM <= (radiusM ?? destination.radius ?? 500);

  if (inRangeOnly && !inRange) {
    return { distanceM, badges: [], sameHeight: true, inRange };
  }

  const dLatM = (visitor.lat - destination.lat) * METERS_PER_DEG_LAT;
  const dLngM = (visitor.lng - destination.lng) * metersLngPerDegree(destination.lat);

  const badges = [];

  if (dLatM > minOffsetM) {
    badges.push({ axis: 'ns', icon: '↑', label: `${Math.round(Math.abs(dLatM))}m north` });
  } else if (dLatM < -minOffsetM) {
    badges.push({ axis: 'ns', icon: '↓', label: `${Math.round(Math.abs(dLatM))}m south` });
  }

  if (dLngM > minOffsetM) {
    badges.push({ axis: 'ew', icon: '→', label: `${Math.round(Math.abs(dLngM))}m east` });
  } else if (dLngM < -minOffsetM) {
    badges.push({ axis: 'ew', icon: '←', label: `${Math.round(Math.abs(dLngM))}m west` });
  }

  let sameHeight = true;
  const visitorAlt = visitor.altitude;
  const destAlt = destination.altitude;

  if (visitorAlt != null && destAlt != null && Number.isFinite(visitorAlt) && Number.isFinite(destAlt)) {
    const altDiff = visitorAlt - destAlt;
    if (Math.abs(altDiff) > minAltitudeM) {
      sameHeight = false;
      badges.push({
        axis: 'alt',
        icon: altDiff > 0 ? '⬆' : '⬇',
        label: altDiff > 0 ? `${Math.round(altDiff)}m above` : `${Math.round(Math.abs(altDiff))}m below`,
      });
    }
  }

  return { distanceM, badges, sameHeight, inRange };
}

export function formatLiveDistance(distanceM) {
  if (distanceM == null) return '—';
  if (distanceM < 1000) return `${Math.round(distanceM)} m`;
  if (distanceM < 10000) return `${(distanceM / 1000).toFixed(2)} km`;
  return `${(distanceM / 1000).toFixed(1)} km`;
}

/** Vertical hint for visitor (instruction) or owner (mirror position). */
export function getVerticalHint(visitor, destination, perspective = 'visitor') {
  const visitorAlt = visitor?.altitude;
  const destAlt = destination?.altitude;
  if (
    visitorAlt == null ||
    destAlt == null ||
    !Number.isFinite(visitorAlt) ||
    !Number.isFinite(destAlt)
  ) {
    return null;
  }

  const diff = visitorAlt - destAlt;
  if (Math.abs(diff) <= 2) return null;

  if (perspective === 'owner') {
    return diff < 0
      ? { icon: '⬇', text: `${Math.round(Math.abs(diff))}m below you` }
      : { icon: '⬆', text: `${Math.round(diff)}m above you` };
  }

  return diff < 0
    ? { icon: '⬆', text: 'Go upwards' }
    : { icon: '⬇', text: 'Go downwards' };
}
