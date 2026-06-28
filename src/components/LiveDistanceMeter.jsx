import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import GlassCard from './GlassCard';
import LiveMap from './LiveMap';
import RelativePositionBadge from './RelativePositionBadge';
import { computeRelativePosition, formatLiveDistance } from '../utils/relativePosition';
import { formatRelativeTime } from '../utils/helpers';

function parseUpdatedAt(iso) {
  if (!iso) return null;
  return typeof iso === 'string' ? new Date(iso) : iso;
}

export default function LiveDistanceMeter({
  title,
  subtitle,
  destination,
  remotePosition,
  waitingMessage = 'Waiting for location…',
  emptyMessage = 'No location yet',
}) {
  const [pulse, setPulse] = useState(false);
  const prevDistanceRef = useRef(null);

  const relative = remotePosition
    ? computeRelativePosition(remotePosition, destination, { radiusM: destination.radius })
    : { distanceM: null, badges: [], inRange: false };

  const { distanceM, inRange } = relative;
  const updatedAt = parseUpdatedAt(remotePosition?.updatedAt);

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

  return (
    <GlassCard glow className="relative overflow-hidden">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-white/50">{title}</p>
          {subtitle && <h2 className="mt-1 text-lg font-bold text-white">{subtitle}</h2>}
        </div>
        {remotePosition && (
          <RelativePositionBadge
            visitor={remotePosition}
            destination={destination}
            compact={inRange}
            className="shrink-0"
          />
        )}
      </div>

      <motion.div
        animate={pulse ? { scale: [1, 1.02, 1] } : { scale: 1 }}
        transition={{ duration: 0.35 }}
        className="mt-6 text-center"
      >
        {remotePosition ? (
          <>
            <p
              className={`font-mono text-5xl font-bold tracking-tight ${
                inRange ? 'text-emerald-400' : 'text-white'
              }`}
            >
              {formatLiveDistance(distanceM)}
            </p>
            <p className="mt-2 text-sm text-white/50">
              {inRange ? 'Inside destination radius' : 'Distance to destination'}
            </p>
            {remotePosition.accuracy != null && (
              <p className="mt-1 text-xs text-white/40">
                GPS ±{Math.round(remotePosition.accuracy)}m
                {updatedAt ? ` · ${formatRelativeTime(updatedAt)}` : ''}
              </p>
            )}
          </>
        ) : (
          <>
            <div className="mx-auto h-10 w-10 animate-pulse rounded-full border-2 border-indigo-400/50 border-t-indigo-400" />
            <p className="mt-4 text-white/70">{waitingMessage}</p>
            <p className="mt-1 text-xs text-white/40">{emptyMessage}</p>
          </>
        )}
      </motion.div>

      {remotePosition && relative.badges.length > 0 && (
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {relative.badges.map((b) => (
            <span
              key={`${b.axis}-${b.icon}`}
              className="rounded-lg bg-white/10 px-3 py-1.5 text-sm text-white/80"
            >
              {b.icon} {b.label}
            </span>
          ))}
        </div>
      )}

      {remotePosition && (
        <div className="mt-5">
          <LiveMap
            destination={{ lat: destination.lat, lng: destination.lng }}
            userPosition={remotePosition}
            radiusMeters={destination.radius}
            interactive={false}
            height="220px"
          />
        </div>
      )}
    </GlassCard>
  );
}
