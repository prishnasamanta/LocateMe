const SPEEDS = {
  walk: 5,
  cycle: 15,
  drive: 40,
};

export function estimateETA(distanceKm, mode = 'walk') {
  const speed = SPEEDS[mode] ?? SPEEDS.walk;
  const hours = distanceKm / speed;
  const minutes = Math.round(hours * 60);
  if (minutes < 1) return '< 1 min';
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m} min` : `${h}h`;
  }
  return `${minutes} min`;
}

export function estimateAllETAs(distanceKm) {
  return {
    walk: estimateETA(distanceKm, 'walk'),
    cycle: estimateETA(distanceKm, 'cycle'),
    drive: estimateETA(distanceKm, 'drive'),
  };
}

export function computeSpeed(prevPos, currPos, deltaMs) {
  if (!prevPos || !currPos || deltaMs <= 0) return null;
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(currPos.lat - prevPos.lat);
  const dLng = toRad(currPos.lng - prevPos.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(prevPos.lat)) *
      Math.cos(toRad(currPos.lat)) *
      Math.sin(dLng / 2) ** 2;
  const distKm = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const hours = deltaMs / 3600000;
  return hours > 0 ? distKm / hours : null;
}
