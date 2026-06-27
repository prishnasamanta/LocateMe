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
