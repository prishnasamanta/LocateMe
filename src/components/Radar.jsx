import { motion } from 'framer-motion';
import GlassCard from './GlassCard';

export default function Radar({ distanceKm, maxDistanceKm = 5 }) {
  const normalized = Math.min(distanceKm / maxDistanceKm, 1);
  const pulseScale = 1 + (1 - normalized) * 0.5;

  return (
    <GlassCard className="flex items-center justify-center overflow-hidden">
      <div className="relative h-40 w-40">
        {[0.25, 0.5, 0.75, 1].map((scale) => (
          <div
            key={scale}
            className="absolute inset-0 rounded-full border border-emerald-500/20"
            style={{ transform: `scale(${scale})` }}
          />
        ))}

        <motion.div
          className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.8)]"
          animate={{ scale: [1, pulseScale, 1] }}
          transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
        />

        <motion.div
          className="absolute left-1/2 top-1/2 origin-bottom"
          style={{
            width: 2,
            height: '50%',
            marginLeft: -1,
            background: 'linear-gradient(to top, transparent, rgba(99,102,241,0.6))',
          }}
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 4, ease: 'linear' }}
        />

        <div
          className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-400 shadow-[0_0_12px_rgba(248,113,113,0.8)]"
          style={{
            transform: `translate(calc(-50% + ${Math.sin(normalized * Math.PI) * 30}px), calc(-50% + ${-Math.cos(normalized * Math.PI) * 30}px))`,
          }}
        />
      </div>
    </GlassCard>
  );
}
