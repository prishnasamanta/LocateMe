import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import GlassCard from './GlassCard';
import LiveMap from './LiveMap';
import { computeRelativePosition, formatLiveDistance, getVerticalHint } from '../utils/relativePosition';
import { getMotionStatus } from '../utils/motionStatus';
import { formatRelativeTime } from '../utils/helpers';

function parseUpdatedAt(iso) {
  if (!iso) return null;
  return typeof iso === 'string' ? new Date(iso) : iso;
}

export default function OwnerLiveTracker({ destination, visitorPos }) {
  const [pulse, setPulse] = useState(false);
  const prevDistanceRef = useRef(null);

  const relative = visitorPos
    ? computeRelativePosition(visitorPos, destination, { radiusM: destination.radius })
    : { distanceM: null, inRange: false };

  const { distanceM, inRange } = relative;
  const updatedAt = parseUpdatedAt(visitorPos?.updatedAt);
  const motion = visitorPos?.motionStatus ?? getMotionStatus(visitorPos?.speed);
  const vertical =
    inRange && visitorPos ? getVerticalHint(visitorPos, destination, 'owner') : null;

  useEffect(() => {
    if (distanceM == null) return;
    if (prevDistanceRef.current != null && Math.abs(prevDistanceRef.current - distanceM) >= 1) {
      setPulse(true);
      const t = setTimeout(() => setPulse(false), 400);
      prevDistanceRef.current = distanceM;
      return () => clearTimeout(t);
    }
    prevDistanceRef.current = distanceM;
  }, [distanceM]);

  if (!visitorPos) {
    return (
      <GlassCard className="text-center">
        <div className="mx-auto h-10 w-10 animate-pulse rounded-full border-2 border-indigo-400/50 border-t-indigo-400" />
        <p className="mt-4 text-white/70">Waiting for visitor to connect…</p>
        <p className="mt-1 text-xs text-white/40">Share the link or QR code</p>
      </GlassCard>
    );
  }

  return (
    <GlassCard glow>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="field-label">Live visitor</p>
          <p className="font-semibold text-white">{visitorPos.displayName || 'Visitor'}</p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${visitorPos.online !== false ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-white/40'}`}>
          {visitorPos.online !== false ? 'online' : 'offline'}
        </span>
      </div>

      <motion.div
        animate={pulse ? { scale: [1, 1.02, 1] } : { scale: 1 }}
        className="mt-4 text-center"
      >
        <p className="font-mono text-5xl font-bold text-white">{formatLiveDistance(distanceM)}</p>
        {inRange && vertical && (
          <p className="mt-2 text-lg font-semibold text-indigo-300">
            {vertical.icon} {vertical.text}
          </p>
        )}
      </motion.div>

      <div className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-white/5 px-4 py-2.5">
        <span className="text-xl">{motion.emoji}</span>
        <span className="font-medium text-white/80">{motion.label}</span>
        {visitorPos.speed != null && (
          <span className="text-sm text-white/40">· {visitorPos.speed.toFixed(1)} km/h</span>
        )}
      </div>

      <div className="mt-4">
        <LiveMap
          destination={{ lat: destination.lat, lng: destination.lng }}
          userPosition={visitorPos}
          radiusMeters={destination.radius}
          interactive={false}
          height="240px"
        />
      </div>

      {updatedAt && (
        <p className="mt-2 text-center text-xs text-white/40">
          Updated {formatRelativeTime(updatedAt)}
          {visitorPos.battery != null ? ` · 🔋 ${visitorPos.battery}%` : ''}
          {visitorPos.network ? ` · ${visitorPos.network}` : ''}
        </p>
      )}
    </GlassCard>
  );
}
