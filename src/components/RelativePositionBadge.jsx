import { computeRelativePosition, formatLiveDistance } from '../utils/relativePosition';

export default function RelativePositionBadge({
  visitor,
  destination,
  inRangeOnly = false,
  compact = false,
  className = '',
}) {
  const { distanceM, badges, inRange } = computeRelativePosition(visitor, destination, {
    inRangeOnly,
    radiusM: destination?.radius,
  });

  if (inRangeOnly && !inRange) return null;

  return (
    <div
      className={`rounded-xl border border-white/10 bg-black/40 px-3 py-2 backdrop-blur-md ${className}`}
    >
      {distanceM != null && (
        <p className={`font-mono font-semibold text-emerald-300 ${compact ? 'text-sm' : 'text-base'}`}>
          {formatLiveDistance(distanceM)}
        </p>
      )}
      {badges.length > 0 ? (
        <div className={`mt-1 flex flex-wrap gap-1 ${compact ? 'text-xs' : 'text-sm'}`}>
          {badges.map((b) => (
            <span
              key={`${b.axis}-${b.icon}`}
              className="inline-flex items-center gap-0.5 rounded-md bg-white/10 px-1.5 py-0.5 text-white/80"
              title={b.label}
            >
              <span>{b.icon}</span>
              {!compact && <span className="text-white/60">{b.label.replace(/^(\d+m )/, '')}</span>}
            </span>
          ))}
        </div>
      ) : inRange && distanceM != null && distanceM <= (destination?.radius ?? 500) ? (
        <p className="mt-1 text-xs text-white/50">Same level · on target</p>
      ) : null}
    </div>
  );
}
