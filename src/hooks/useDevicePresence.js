import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Tab visibility presence: online when tab visible, offline when hidden/closed.
 */
export function useDevicePresence(enabled = true) {
  const [presence, setPresence] = useState('offline');
  const presenceRef = useRef('offline');

  const applyPresence = useCallback((next) => {
    if (presenceRef.current === next) return;
    presenceRef.current = next;
    setPresence(next);
  }, []);

  useEffect(() => {
    if (!enabled) {
      applyPresence('offline');
      return;
    }

    const sync = () => {
      applyPresence(document.visibilityState === 'visible' ? 'online' : 'offline');
    };

    sync();
    document.addEventListener('visibilitychange', sync);
    window.addEventListener('pagehide', () => applyPresence('offline'));
    window.addEventListener('beforeunload', () => applyPresence('offline'));

    return () => {
      document.removeEventListener('visibilitychange', sync);
      applyPresence('offline');
    };
  }, [enabled, applyPresence]);

  return presence;
}

/** Call callback every interval while tab is visible (heartbeat). */
export function usePresenceHeartbeat(enabled, presence, intervalMs, callback) {
  useEffect(() => {
    if (!enabled || presence !== 'online') return;
    callback();
    const id = window.setInterval(callback, intervalMs);
    return () => clearInterval(id);
  }, [enabled, presence, intervalMs, callback]);
}
