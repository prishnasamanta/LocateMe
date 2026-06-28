import { useState, useEffect } from 'react';

export function useRoute(from, to) {
  const [route, setRoute] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!from || !to) return;

    let cancelled = false;
    setLoading(true);

    const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;

    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled || data.code !== 'Ok') return;
        const routeData = data.routes[0];
        const coords = routeData.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
        setRoute({
          coordinates: coords,
          distance: routeData.distance,
          duration: routeData.duration,
        });
      })
      .catch(() => setRoute(null))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [from?.lat, from?.lng, to?.lat, to?.lng]);

  return { route, loading };
}

export function useDeviceInfo() {
  const [battery, setBattery] = useState(null);
  const [network, setNetwork] = useState(null);

  useEffect(() => {
    let batteryApi = null;
    let batteryHandler = null;
    let conn = null;
    let connHandler = null;
    let pollId = null;

    const readBattery = async () => {
      try {
        if (navigator.getBattery) {
          batteryApi = await navigator.getBattery();
          batteryHandler = () => setBattery(Math.round(batteryApi.level * 100));
          batteryHandler();
          batteryApi.addEventListener('levelchange', batteryHandler);
          return;
        }
      } catch {
        /* unsupported */
      }
      setBattery(null);
    };

    conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (conn) {
      connHandler = () => {
        setNetwork(conn.effectiveType?.toUpperCase() ?? conn.type ?? 'Unknown');
      };
      connHandler();
      conn.addEventListener('change', connHandler);
    }

    readBattery();
    pollId = window.setInterval(readBattery, 15000);

    return () => {
      if (pollId) clearInterval(pollId);
      if (batteryApi && batteryHandler) {
        batteryApi.removeEventListener('levelchange', batteryHandler);
      }
      if (conn && connHandler) {
        conn.removeEventListener('change', connHandler);
      }
    };
  }, []);

  return { battery, network };
}
