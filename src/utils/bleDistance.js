/** BLE RSSI → approximate distance (path-loss model). */
export function rssiToDistanceM(rssi, txPower = -59, pathLossN = 2.5) {
  if (rssi == null || !Number.isFinite(rssi)) return null;
  const meters = 10 ** ((txPower - rssi) / (10 * pathLossN));
  return Math.max(0.3, Math.min(meters, 50));
}

export const GPS_BLE_THRESHOLD_M = 20;

export function getTrackingModeLabel(source) {
  switch (source) {
    case 'ble':
      return { label: 'Bluetooth · Close range', emoji: '📶', short: 'BLE' };
    case 'nearby-gps':
      return { label: 'GPS · Nearby (<20 m)', emoji: '📍', short: 'Nearby GPS' };
    case 'devices':
      return { label: 'Live device GPS', emoji: '🛰️', short: 'Device GPS' };
    case 'destination':
      return { label: 'GPS · Far range', emoji: '🌍', short: 'GPS' };
    default:
      return { label: 'Waiting for signal', emoji: '⏳', short: '—' };
  }
}

export function getPresenceLabel(presence) {
  switch (presence) {
    case 'online':
      return { label: 'Online', emoji: '🟢', color: 'text-emerald-400' };
    case 'offline':
      return { label: 'Offline', emoji: '⚫', color: 'text-white/40' };
    default:
      return { label: 'Unknown', emoji: '⚪', color: 'text-white/30' };
  }
}

export function isBleScanSupported() {
  return typeof navigator !== 'undefined' && Boolean(navigator.bluetooth?.requestLEScan);
}
