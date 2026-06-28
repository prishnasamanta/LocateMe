import { useEffect, useRef } from 'react';
import { subscribeVisitorRing } from '../services/visitorRing';

function createRingAudio() {
  let ctx = null;
  let intervalId = null;
  let osc = null;
  let gain = null;

  const start = () => {
    if (intervalId) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    gain = ctx.createGain();
    gain.gain.value = 0.35;
    gain.connect(ctx.destination);

    const playBeep = () => {
      if (!ctx) return;
      osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = 880;
      osc.connect(gain);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    };

    playBeep();
    intervalId = window.setInterval(playBeep, 900);
  };

  const stop = () => {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
    if (osc) {
      try {
        osc.stop();
      } catch {
        /* already stopped */
      }
      osc = null;
    }
    if (ctx) {
      ctx.close().catch(() => {});
      ctx = null;
    }
    gain = null;
  };

  return { start, stop };
}

export function useVisitorRing(locationId, enabled) {
  const audioRef = useRef(null);
  const lastRingIdRef = useRef(null);

  useEffect(() => {
    if (!enabled || !locationId) return;

    if (!audioRef.current) {
      audioRef.current = createRingAudio();
    }

    const unsub = subscribeVisitorRing(locationId, ({ active, ringId }) => {
      const audio = audioRef.current;
      if (!audio) return;

      if (active && ringId && ringId !== lastRingIdRef.current) {
        lastRingIdRef.current = ringId;
        audio.start();
      } else if (!active) {
        lastRingIdRef.current = null;
        audio.stop();
      }
    });

    const onUnload = () => audioRef.current?.stop();
    window.addEventListener('pagehide', onUnload);

    return () => {
      unsub();
      window.removeEventListener('pagehide', onUnload);
      audioRef.current?.stop();
    };
  }, [locationId, enabled]);
}
