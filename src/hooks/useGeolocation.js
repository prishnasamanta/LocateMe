import { useState, useEffect, useRef, useCallback } from 'react';
import { computeSpeed } from '../utils/eta';

export function useGeolocation(enabled = true) {
  const [position, setPosition] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [speed, setSpeed] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const prevRef = useRef(null);
  const prevTimeRef = useRef(null);
  const watchIdRef = useRef(null);

  const handlePosition = useCallback((pos) => {
    const coords = {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
      altitude: pos.coords.altitude,
      heading: pos.coords.heading,
      speed: pos.coords.speed,
    };

    const now = Date.now();
    if (prevRef.current && prevTimeRef.current) {
      const computed = computeSpeed(prevRef.current, coords, now - prevTimeRef.current);
      setSpeed(computed ?? (coords.speed != null ? coords.speed * 3.6 : null));
    } else if (coords.speed != null) {
      setSpeed(coords.speed * 3.6);
    }

    prevRef.current = coords;
    prevTimeRef.current = now;
    setPosition(coords);
    setLastUpdate(new Date());
    setLoading(false);
    setError(null);
  }, []);

  const handleError = useCallback((err) => {
    setError(err.message || 'Location access denied');
    setLoading(false);
  }, []);

  const requestPermission = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser');
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(handlePosition, handleError, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    });
  }, [handlePosition, handleError]);

  const startWatching = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported');
      return;
    }
    setLoading(true);
    watchIdRef.current = navigator.geolocation.watchPosition(handlePosition, handleError, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 1000,
    });
  }, [handlePosition, handleError]);

  const stopWatching = useCallback(() => {
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (enabled) {
      startWatching();
    }
    return () => stopWatching();
  }, [enabled, startWatching, stopWatching]);

  return {
    position,
    error,
    loading,
    speed,
    lastUpdate,
    requestPermission,
    startWatching,
    stopWatching,
  };
}

export function useCurrentLocation() {
  const [position, setPosition] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported');
      return;
    }
    setLoading(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }, []);

  return { position, loading, error, fetchLocation };
}
