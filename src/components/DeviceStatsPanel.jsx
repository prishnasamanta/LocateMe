import { motion } from 'framer-motion';
import GlassCard from './GlassCard';
import { getMotionStatus } from '../utils/motionStatus';
import { formatRelativeTime } from '../utils/helpers';

export default function DeviceStatsPanel({
  position,
  speed,
  lastUpdate,
  battery,
  network,
  title = 'Device info',
}) {
  const speedKmh = typeof speed === 'number' && Number.isFinite(speed) ? speed : null;
  const motionStatus = getMotionStatus(speedKmh);

  const items = [
    {
      label: 'Status',
      value: `${motionStatus.emoji} ${motionStatus.label}`,
    },
    {
      label: 'Speed',
      value: speedKmh != null ? `${speedKmh.toFixed(1)} km/h` : '—',
    },
    {
      label: 'Accuracy',
      value: position?.accuracy != null ? `±${Math.round(position.accuracy)} m` : '—',
    },
    {
      label: 'Altitude',
      value: position?.altitude != null ? `${Math.round(position.altitude)} m` : '—',
    },
    {
      label: 'Battery',
      value: battery != null ? `${battery}%` : '—',
    },
    {
      label: 'Network',
      value: network ?? '—',
    },
    {
      label: 'Updated',
      value: lastUpdate ? formatRelativeTime(lastUpdate) : '—',
      span: 2,
    },
  ];

  return (
    <GlassCard>
      <p className="field-label mb-3">{title}</p>
      <div className="grid grid-cols-2 gap-3">
        {items.map(({ label, value, span }) => (
          <div key={label} className={span === 2 ? 'col-span-2' : ''}>
            <p className="text-xs text-white/40">{label}</p>
            <motion.p
              key={String(value)}
              initial={{ opacity: 0.6 }}
              animate={{ opacity: 1 }}
              className="text-sm font-semibold text-white"
            >
              {value}
            </motion.p>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}
