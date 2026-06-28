import GlassCard from './GlassCard';
import { isVisitorOnline } from '../services/visitorTracking';

export default function LinkVisitorPanel({ visitor }) {
  if (!visitor) return null;

  const online = isVisitorOnline(visitor);
  const motion = visitor.motionStatus;

  return (
    <GlassCard glow className="device-hub">
      <p className="field-label">Connected via link</p>
      <ul className="mt-3 space-y-2">
        <li className="flex items-center justify-between rounded-xl bg-black/25 px-4 py-3 ring-1 ring-white/5">
          <div className="flex items-center gap-3">
            <span
              className={`h-2.5 w-2.5 rounded-full ${online ? 'bg-emerald-400 animate-pulse-soft' : 'bg-white/20'}`}
            />
            <div>
              <p className="font-medium text-white">{visitor.displayName || 'Visitor'}</p>
              <p className="text-xs text-white/40">
                Link visitor
                {motion ? ` · ${motion.emoji} ${motion.label}` : ''}
                {visitor.network ? ` · ${visitor.network}` : ''}
              </p>
            </div>
          </div>
          <span className={`text-xs font-semibold ${online ? 'text-emerald-400' : 'text-white/30'}`}>
            {online ? 'live' : 'offline'}
          </span>
        </li>
      </ul>
    </GlassCard>
  );
}
