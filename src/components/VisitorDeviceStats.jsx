import { motion as Motion } from 'framer-motion';
import GlassCard from './GlassCard';
import { getMotionStatus } from '../utils/motionStatus';
import { formatRelativeTime } from '../utils/helpers';

export default function VisitorDeviceStats({ speed, lastUpdate, battery, network }) {
  const speedKmh = typeof speed === 'number' && Number.isFinite(speed) ? speed : null;
  const motionStatus = getMotionStatus(speedKmh);

  return (
    <GlassCard>
      <p className="field-label mb-3">Your device</p>

      <div className="mb-4 flex items-center gap-3 rounded-xl bg-indigo-500/10 px-4 py-3 ring-1 ring-indigo-500/20">
        <span className="text-3xl">{motionStatus.emoji}</span>
        <div>
          <p className="text-xs uppercase tracking-widest text-white/40">Status</p>
          <p className="text-lg font-semibold text-white">{motionStatus.label}</p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-xs text-white/40">Speed</p>
          <p className="font-mono text-lg font-bold text-white">
            {speedKmh != null ? `${speedKmh.toFixed(1)} km/h` : '—'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-black/20 px-3 py-2.5">
          <p className="text-xs text-white/40">Battery</p>
          <Motion.p key={battery} className="text-sm font-semibold text-white">
            {battery != null ? `${battery}%` : '—'}
          </Motion.p>
        </div>
        <div className="rounded-xl bg-black/20 px-3 py-2.5">
          <p className="text-xs text-white/40">Network</p>
          <Motion.p key={network} className="text-sm font-semibold text-white">
            {network ?? '—'}
          </Motion.p>
        </div>
        <div className="col-span-2 rounded-xl bg-black/20 px-3 py-2.5">
          <p className="text-xs text-white/40">Last update</p>
          <p className="text-sm font-semibold text-white">
            {lastUpdate ? formatRelativeTime(lastUpdate) : '—'}
          </p>
        </div>
      </div>
    </GlassCard>
  );
}
