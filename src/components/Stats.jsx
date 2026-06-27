import { motion } from 'framer-motion';
import GlassCard from './GlassCard';

export default function Stats({ position, speed, lastUpdate, battery, network }) {
  const formatRelative = (date) => {
    if (!date) return '—';
    const s = Math.floor((Date.now() - date.getTime()) / 1000);
    if (s < 5) return 'Just now';
    if (s < 60) return `${s}s ago`;
    return `${Math.floor(s / 60)}m ago`;
  };

  const items = [
    {
      label: 'Speed',
      value: speed != null ? `${speed.toFixed(1)} km/h` : '—',
    },
    {
      label: 'Accuracy',
      value: position?.accuracy != null ? `±${Math.round(position.accuracy)}m` : '—',
    },
    {
      label: 'Altitude',
      value: position?.altitude != null ? `${Math.round(position.altitude)}m` : '—',
    },
    {
      label: 'Heading',
      value: position?.heading != null ? `${Math.round(position.heading)}°` : '—',
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
      value: formatRelative(lastUpdate),
      span: 2,
    },
  ];

  return (
    <GlassCard>
      <p className="mb-3 text-xs font-medium uppercase tracking-widest text-white/50">
        Device Info
      </p>
      <div className="grid grid-cols-2 gap-3">
        {items.map(({ label, value, span }) => (
          <div key={label} className={span === 2 ? 'col-span-2' : ''}>
            <p className="text-xs text-white/40">{label}</p>
            <motion.p
              key={value}
              initial={{ opacity: 0.5 }}
              animate={{ opacity: 1 }}
              className="text-sm font-medium text-white"
            >
              {value}
            </motion.p>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}
