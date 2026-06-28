import { motion } from 'framer-motion';
import GlassCard from './GlassCard';
import { getProximityStatus } from '../utils/helpers';
import { formatLiveDistance, getVerticalHint } from '../utils/relativePosition';
import { getMotionStatus } from '../utils/motionStatus';

export default function CoverageCard({
  distanceM,
  radiusM,
  inCoverage,
  visitorPosition,
  destination,
  speedKmh,
}) {
  const status = getProximityStatus(distanceM ?? Infinity, radiusM);
  const motion = getMotionStatus(speedKmh);
  const vertical =
    inCoverage && visitorPosition && destination
      ? getVerticalHint(visitorPosition, destination, 'visitor')
      : null;

  return (
    <GlassCard glow={inCoverage}>
      <p className="field-label">{inCoverage ? 'Distance' : 'Status'}</p>

      {inCoverage ? (
        <div className="text-center">
          <motion.p
            key={distanceM}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-mono text-5xl font-bold text-emerald-400"
          >
            {formatLiveDistance(distanceM)}
          </motion.p>
          {vertical && (
            <p className="mt-3 text-lg font-semibold text-indigo-300">
              {vertical.icon} {vertical.text}
            </p>
          )}
          <p className="mt-2 text-sm text-white/50">Inside coverage zone</p>
        </div>
      ) : (
        <div className="text-center">
          <p className={`text-4xl font-bold ${status.color}`}>
            {status.emoji} {status.label}
          </p>
          <p className="mt-2 text-sm text-white/50">
            Exact distance unlocks inside the {radiusM >= 1000 ? `${radiusM / 1000} km` : `${radiusM} m`} coverage zone
          </p>
        </div>
      )}

      <div className={`mt-4 flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 ${status.bg}`}>
        <span className="text-xl">{motion.emoji}</span>
        <span className={`font-medium ${status.color}`}>{motion.label}</span>
      </div>
    </GlassCard>
  );
}
