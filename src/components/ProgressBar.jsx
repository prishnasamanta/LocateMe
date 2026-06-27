import { motion } from 'framer-motion';
import GlassCard from './GlassCard';

export default function ProgressBar({ progress, initialDistanceM, currentDistanceM }) {
  return (
    <GlassCard>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="text-white/50">Progress</span>
        <span className="font-semibold text-indigo-400">{Math.round(progress)}%</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-white/10">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-400"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ type: 'spring', stiffness: 60, damping: 20 }}
        />
      </div>
      {initialDistanceM > 0 && (
        <p className="mt-2 text-xs text-white/40">
          Started {Math.round(initialDistanceM)}m away · Now {Math.round(currentDistanceM)}m
        </p>
      )}
    </GlassCard>
  );
}
