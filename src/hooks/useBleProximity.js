import { useState, useEffect, useRef, useCallback } from 'react';
import { rssiToDistanceM, GPS_BLE_THRESHOLD_M, isBleScanSupported } from '../utils/bleDistance';

/**
 * Web Bluetooth LE scan when GPS distance ≤ 20 m (Chrome/Android experimental).
 * Requires a prior user gesture via startScan().
 */
export function useBleProximity({ gpsDistanceM, scanToken }) {
  const [reading, setReading] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState(null);
  const scanRef = useRef(null);
  const handlerRef = useRef(null);

  const shouldScan =
    gpsDistanceM != null && gpsDistanceM <= GPS_BLE_THRESHOLD_M && isBleScanSupported();

  const stopScan = useCallback(() => {
    if (handlerRef.current && navigator.bluetooth) {
      navigator.bluetooth.removeEventListener('advertisementreceived', handlerRef.current);
      handlerRef.current = null;
    }
    if (scanRef.current) {
      try {
        scanRef.current.stop();
      } catch {
        /* ignore */
      }
      scanRef.current = null;
    }
    setScanning(false);
  }, []);

  const startScan = useCallback(async () => {
    if (!shouldScan || !navigator.bluetooth?.requestLEScan) {
      setScanError('Bluetooth scan not supported in this browser.');
      return;
    }
    stopScan();
    setScanError(null);
    try {
      const scan = await navigator.bluetooth.requestLEScan({
        acceptAllAdvertisements: true,
        keepRepeatedDevices: true,
      });
      scanRef.current = scan;

      const handler = (event) => {
        const rssi = event.rssi;
        if (rssi == null) return;
        const name = event.device?.name || '';
        const tokenMatch = scanToken && name.toUpperCase().includes(String(scanToken).slice(0, 4));
        if (tokenMatch || rssi > -75) {
          setReading({
            rssi,
            distanceM: rssiToDistanceM(rssi),
            deviceName: name || 'Nearby device',
          });
        }
      };

      handlerRef.current = handler;
      navigator.bluetooth.addEventListener('advertisementreceived', handler);
      setScanning(true);
    } catch (err) {
      setScanError(err.message || 'Could not start Bluetooth scan');
      stopScan();
    }
  }, [shouldScan, scanToken, stopScan]);

  useEffect(() => {
    if (!shouldScan) {
      stopScan();
      setReading(null);
    }
  }, [shouldScan, stopScan]);

  useEffect(() => () => stopScan(), [stopScan]);

  return {
    reading,
    scanning,
    scanError,
    shouldScan,
    bleSupported: isBleScanSupported(),
    startScan,
    stopScan,
  };
}
