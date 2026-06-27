import { motion, AnimatePresence } from 'framer-motion';
import { formatDistance } from '../utils/haversine';
import GlassCard from './GlassCard';

export default function DistanceCard({ distanceKm, previousDistanceKm, arrived }) {
  const decreasing = previousDistanceKm != null && distanceKm < previousDistanceKm;

  return (
    <GlassCard glow={arrived}>
      <p className="text-xs font-medium uppercase tracking-widest text-white/50">Distance</p>
      <AnimatePresence mode="popLayout">
        <motion.div
          key={distanceKm?.toFixed(3)}
          initial={{ opacity: 0, y: decreasing ? -8 : 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: decreasing ? 8 : -8 }}
          transition={{ duration: 0.3 }}
          className="mt-1"
        >
          {arrived ? (
            <div className="text-center">
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="text-5xl"
              >
                🎉
              </motion.span>
              <p className="mt-2 text-2xl font-bold text-emerald-400">You&apos;ve Arrived!</p>
              <p className="text-lg text-white/70">{formatDistance(distanceKm)}</p>
            </div>
          ) : (
            <p className="text-5xl font-bold tabular-nums tracking-tight text-white">
              {formatDistance(distanceKm)}
            </p>
          )}
        </motion.div>
      </AnimatePresence>
    </GlassCard>
  );
}
