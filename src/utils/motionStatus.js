export function getMotionStatus(speedKmh) {
  if (speedKmh == null || Number.isNaN(speedKmh) || speedKmh < 0.8) {
    return { label: 'Standing still', emoji: '🧍' };
  }
  if (speedKmh < 6) {
    return { label: 'Walking', emoji: '🚶' };
  }
  if (speedKmh < 15) {
    return { label: 'Running / Cycling', emoji: '🏃' };
  }
  if (speedKmh < 45) {
    return { label: 'In a bus', emoji: '🚌' };
  }
  return { label: 'In a car', emoji: '🚗' };
}
