import { motion } from 'framer-motion';
import GlassCard from './GlassCard';
import { getMotionStatus } from '../utils/motionStatus';
import { formatRelativeTime } from '../utils/helpers';
import { getTrackingModeLabel, getPresenceLabel } from '../utils/bleDistance';

export default function DeviceStatsPanel({
  position,
  speed,
  lastUpdate,
  battery,
  network,
  presence = 'online',
  trackingMode = 'destination',
  bleRssi,
  title = 'Device info',
}) {
  const speedKmh = typeof speed === 'number' && Number.isFinite(speed) ? speed : null;
  const motionStatus = getMotionStatus(speedKmh);
  const mode = getTrackingModeLabel(trackingMode);
  const presenceInfo = getPresenceLabel(presence);

  const items = [
    {
      label: 'Connection',
      value: `${presenceInfo.emoji} ${presenceInfo.label}`,
      span: 2,
    },
    {
      label: 'Tracking',
      value: `${mode.emoji} ${mode.short}`,
    },
    {
      label: 'Activity',
      value: `${motionStatus.emoji} ${motionStatus.label}`,
    },
    {
      label: 'Speed',
      value: speedKmh != null ? `${speedKmh.toFixed(1)} km/h` : '—',
    },
    {
      label: 'GPS accuracy',
      value: position?.accuracy != null ? `±${Math.round(position.accuracy)} m` : '—',
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
      label: 'Bluetooth RSSI',
      value: bleRssi != null ? `${bleRssi} dBm` : '—',
    },
    {
      label: 'Last update',
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
