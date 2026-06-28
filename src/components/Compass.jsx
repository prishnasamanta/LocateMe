import { motion } from 'framer-motion';
import GlassCard from './GlassCard';

const LABELS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

export default function Compass({ bearingDeg, deviceHeading }) {
  const rotation = deviceHeading != null ? -deviceHeading : 0;
  const arrowRotation = bearingDeg != null ? bearingDeg - (deviceHeading ?? 0) : 0;

  return (
    <GlassCard className="flex flex-col items-center">
      <p className="mb-4 text-xs font-medium uppercase tracking-widest text-white/50">Compass</p>
      <div className="relative h-48 w-48">
        <motion.div
          className="absolute inset-0 rounded-full border border-white/10 bg-white/5"
          animate={{ rotate: rotation }}
          transition={{ type: 'spring', stiffness: 60, damping: 15 }}
        >
          {LABELS.map((label, i) => {
            const angle = i * 45;
            const isCardinal = i % 2 === 0;
            return (
              <span
                key={label}
                className={`absolute left-1/2 top-2 -translate-x-1/2 origin-[center_88px] ${
                  isCardinal ? 'text-sm font-bold text-white' : 'text-xs text-white/40'
                }`}
                style={{ transform: `translateX(-50%) rotate(${angle}deg) translateY(0)` }}
              >
                <span style={{ display: 'inline-block', transform: `rotate(${-angle}deg)` }}>
                  {label.length === 1 ? label : label[0]}
                </span>
              </span>
            );
          })}
        </motion.div>

        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          animate={{ rotate: arrowRotation }}
          transition={{ type: 'spring', stiffness: 60, damping: 15 }}
        >
          <div className="flex flex-col items-center">
            <div className="h-16 w-1 rounded-full bg-gradient-to-t from-indigo-500 to-indigo-300" />
            <span className="mt-1 text-xs text-indigo-300">Dest</span>
          </div>
        </motion.div>

        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-3 w-3 rounded-full bg-white shadow-lg shadow-white/50" />
        </div>
      </div>
    </GlassCard>
  );
}
