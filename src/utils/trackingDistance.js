import { haversineDistance } from './haversine';

const DEVICE_PAIR_THRESHOLD_M = 300;

/**
 * Prefer live device-to-device distance when owner GPS is available and devices are near each other.
 */
export function computeTrackingDistance(visitor, destination, { ownerPosition, radiusM = 500 } = {}) {
  if (!visitor?.lat || !destination?.lat) {
    return { distanceM: null, source: 'none', accuracyM: null, inCoverage: false };
  }

  const pinDistM =
    haversineDistance(visitor.lat, visitor.lng, destination.lat, destination.lng) * 1000;
  const visitorAcc = visitor.accuracy ?? null;

  let deviceDistM = null;
  let ownerAcc = null;
  if (ownerPosition?.lat != null) {
    deviceDistM =
      haversineDistance(visitor.lat, visitor.lng, ownerPosition.lat, ownerPosition.lng) * 1000;
    ownerAcc = ownerPosition.accuracy ?? null;
  }

  const inCoverage = pinDistM <= radiusM;
  const useDevicePair =
    deviceDistM != null &&
    (deviceDistM <= DEVICE_PAIR_THRESHOLD_M || (inCoverage && deviceDistM <= pinDistM + 30));

  if (useDevicePair) {
    const accuracyM =
      visitorAcc != null && ownerAcc != null
        ? Math.round((visitorAcc + ownerAcc) / 2)
        : visitorAcc ?? ownerAcc ?? null;
    return {
      distanceM: Math.round(deviceDistM),
      source: 'devices',
      accuracyM,
      inCoverage: deviceDistM <= radiusM || inCoverage,
    };
  }

  return {
    distanceM: Math.round(pinDistM),
    source: 'destination',
    accuracyM: visitorAcc != null ? Math.round(visitorAcc) : null,
    inCoverage,
  };
}

/** Smooth jitter when nearly stationary (reduces 40–60m bounce). */
export function smoothPosition(prev, next, speedKmh) {
  if (!next) return next;
  if (!prev || speedKmh == null || speedKmh > 2) return next;
  const alpha = 0.35;
  return {
    ...next,
    lat: prev.lat + alpha * (next.lat - prev.lat),
    lng: prev.lng + alpha * (next.lng - prev.lng),
  };
}

export function normalizeSpeedKmh(position, computedSpeed) {
  if (typeof computedSpeed === 'number' && Number.isFinite(computedSpeed)) {
    return computedSpeed;
  }
  if (position?.speed != null && Number.isFinite(position.speed)) {
    return position.speed * 3.6;
  }
  return null;
}
