import { useState, useEffect } from 'react';

export function useDeviceOrientation(enabled = true) {
  const [heading, setHeading] = useState(null);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    const handleOrientation = (event) => {
      let compass = null;
      if (event.webkitCompassHeading != null) {
        compass = event.webkitCompassHeading;
      } else if (event.alpha != null) {
        compass = 360 - event.alpha;
      }
      if (compass != null) {
        setHeading((compass + 360) % 360);
        setSupported(true);
      }
    };

    if (typeof DeviceOrientationEvent !== 'undefined') {
      if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission()
          .then((state) => {
            if (state === 'granted') {
              window.addEventListener('deviceorientation', handleOrientation);
            }
          })
          .catch(() => {});
      } else {
        window.addEventListener('deviceorientation', handleOrientation);
        setSupported(true);
      }
    }

    return () => window.removeEventListener('deviceorientation', handleOrientation);
  }, [enabled]);

  return { heading, supported };
}
