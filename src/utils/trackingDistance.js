import { haversineDistance } from './haversine';
import { GPS_BLE_THRESHOLD_M } from './bleDistance';

/**
 * Find My Device-style switching:
 * > 20 m → GPS to destination/owner
 * ≤ 20 m → nearby GPS (device pair) or BLE RSSI when available
 */
export function computeTrackingDistance(
  visitor,
  destination,
  { ownerPosition, radiusM = 500, bleDistanceM = null, gpsDistanceM = null } = {}
) {
  if (visitor?.lat == null || visitor?.lng == null || destination?.lat == null) {
    return { distanceM: null, source: 'none', accuracyM: null, inCoverage: false, pinDistM: null };
  }

  const pinDistM =
    haversineDistance(visitor.lat, visitor.lng, destination.lat, destination.lng) * 1000;
  const visitorAcc = visitor.accuracy ?? null;
  const inCoverage = pinDistM <= radiusM;

  let deviceDistM = null;
  let ownerAcc = null;
  if (ownerPosition?.lat != null) {
    deviceDistM =
      haversineDistance(visitor.lat, visitor.lng, ownerPosition.lat, ownerPosition.lng) * 1000;
    ownerAcc = ownerPosition.accuracy ?? null;
  }

  const referenceGpsM = deviceDistM ?? pinDistM;

  if (
    bleDistanceM != null &&
    referenceGpsM <= GPS_BLE_THRESHOLD_M &&
    Number.isFinite(bleDistanceM)
  ) {
    return {
      distanceM: Math.round(bleDistanceM),
      source: 'ble',
      accuracyM: 2,
      inCoverage,
      pinDistM: Math.round(pinDistM),
    };
  }

  if (deviceDistM != null && deviceDistM <= GPS_BLE_THRESHOLD_M) {
    const accuracyM =
      visitorAcc != null && ownerAcc != null
        ? Math.round((visitorAcc + ownerAcc) / 2)
        : visitorAcc ?? ownerAcc ?? null;
    return {
      distanceM: Math.round(deviceDistM),
      source: 'nearby-gps',
      accuracyM,
      inCoverage,
      pinDistM: Math.round(pinDistM),
    };
  }

  if (
    deviceDistM != null &&
    (deviceDistM <= 300 || (inCoverage && deviceDistM <= pinDistM + 30))
  ) {
    const accuracyM =
      visitorAcc != null && ownerAcc != null
        ? Math.round((visitorAcc + ownerAcc) / 2)
        : visitorAcc ?? ownerAcc ?? null;
    return {
      distanceM: Math.round(deviceDistM),
      source: 'devices',
      accuracyM,
      inCoverage,
      pinDistM: Math.round(pinDistM),
    };
  }

  return {
    distanceM: Math.round(pinDistM),
    source: 'destination',
    accuracyM: visitorAcc != null ? Math.round(visitorAcc) : null,
    inCoverage,
    pinDistM: Math.round(pinDistM),
  };
}

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
