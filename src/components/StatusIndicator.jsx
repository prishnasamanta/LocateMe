import { motion } from 'framer-motion';
import GlassCard from './GlassCard';
import { getProximityStatus } from '../utils/helpers';
import { formatDistanceMeters } from '../utils/haversine';

export default function StatusIndicator({ distanceMeters, radiusMeters }) {
  const status = getProximityStatus(distanceMeters, radiusMeters);

  return (
    <GlassCard className={status.bg}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-white/50">Status</p>
          <p className={`text-lg font-semibold ${status.color}`}>
            {status.emoji} {status.label}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-white/50">Distance</p>
          <p className="text-lg font-bold text-white">{formatDistanceMeters(distanceMeters)}</p>
        </div>
      </div>
    </GlassCard>
  );
}
