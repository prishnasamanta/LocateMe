import { motion } from 'framer-motion';
import { bearingToDirection } from '../utils/bearing';
import GlassCard from './GlassCard';

export default function ETA({ distanceKm, bearingDeg }) {
  const etas = {
    walk: Math.round((distanceKm / 5) * 60),
    cycle: Math.round((distanceKm / 15) * 60),
    drive: Math.round((distanceKm / 40) * 60),
  };

  const formatMin = (m) => (m < 1 ? '< 1 min' : `${m} min`);

  return (
    <GlassCard>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-white/50">Direction</p>
          <p className="text-xl font-semibold text-white">
            {bearingDeg != null ? bearingToDirection(bearingDeg) : '—'}
          </p>
        </div>
        <motion.div
          animate={{ rotate: bearingDeg ?? 0 }}
          transition={{ type: 'spring', stiffness: 80 }}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-500/20 text-2xl"
        >
          ↑
        </motion.div>
      </div>

      <p className="mb-2 text-xs font-medium uppercase tracking-widest text-white/50">ETA</p>
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: '🚶', label: 'Walk', min: etas.walk },
          { icon: '🚴', label: 'Cycle', min: etas.cycle },
          { icon: '🚗', label: 'Drive', min: etas.drive },
        ].map(({ icon, label, min }) => (
          <div key={label} className="rounded-xl bg-white/5 p-3 text-center">
            <span className="text-xl">{icon}</span>
            <p className="mt-1 text-xs text-white/50">{label}</p>
            <p className="text-sm font-semibold text-white">{formatMin(min)}</p>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}
