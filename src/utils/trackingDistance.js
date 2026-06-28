import { haversineDistance } from './haversine';
import { GPS_BLE_THRESHOLD_M } from './bleDistance';

/**
 * Primary distance is always visitor → destination pin.
 * BLE refines only when already within the destination coverage threshold.
 */
export function computeTrackingDistance(
  visitor,
  destination,
  { radiusM = 500, bleDistanceM = null } = {}
) {
  if (visitor?.lat == null || visitor?.lng == null || destination?.lat == null) {
    return { distanceM: null, source: 'none', accuracyM: null, inCoverage: false, pinDistM: null };
  }

  const pinDistM =
    haversineDistance(visitor.lat, visitor.lng, destination.lat, destination.lng) * 1000;
  const visitorAcc = visitor.accuracy ?? null;
  const inCoverage = pinDistM <= radiusM;
  const roundedPin = Math.round(pinDistM);

  if (
    pinDistM <= GPS_BLE_THRESHOLD_M &&
    bleDistanceM != null &&
    Number.isFinite(bleDistanceM)
  ) {
    return {
      distanceM: Math.round(bleDistanceM),
      source: 'ble',
      accuracyM: 2,
      inCoverage,
      pinDistM: roundedPin,
    };
  }

  return {
    distanceM: roundedPin,
    source: 'destination',
    accuracyM: visitorAcc != null ? Math.round(visitorAcc) : null,
    inCoverage,
    pinDistM: roundedPin,
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
