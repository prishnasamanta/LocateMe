import GlassCard from './GlassCard';
import { isDeviceOnline, getDevicePresence } from '../services/accountDevices';
import { getTrackingModeLabel, getPresenceLabel } from '../utils/bleDistance';

export default function AccountDevicesPanel({ devices, currentDeviceId, userEmail }) {
  const remoteOnline = devices.filter(
    (d) => d.deviceId !== currentDeviceId && isDeviceOnline(d)
  );

  return (
    <GlassCard glow className="device-hub">
      <div className="flex items-center gap-2">
        <span className="text-2xl">🛰️</span>
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-white/50">Device hub</p>
          <p className="text-sm text-white/70">{userEmail}</p>
        </div>
      </div>
      <p className="mt-3 text-sm text-white/50">
        {remoteOnline.length === 0
          ? 'No other device online — tab must stay open on the second phone.'
          : `${remoteOnline.length} connected device${remoteOnline.length > 1 ? 's' : ''} online`}
      </p>

      {devices.length === 0 ? (
        <p className="mt-4 text-center text-sm text-white/40">
          Allow location below to register this device.
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {devices.map((d) => {
            const online = isDeviceOnline(d);
            const isSelf = d.deviceId === currentDeviceId;
            const presenceInfo = getPresenceLabel(getDevicePresence(d));
            const mode = getTrackingModeLabel(d.trackingMode ?? 'gps');
            return (
              <li
                key={d.deviceId}
                className="flex items-center justify-between rounded-xl bg-black/25 px-4 py-3 ring-1 ring-white/5"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${online ? 'bg-emerald-400 animate-pulse-soft' : 'bg-white/20'}`}
                  />
                  <div>
                    <p className="font-medium text-white">
                      {d.label || 'Device'}
                      {isSelf && <span className="ml-2 text-xs text-indigo-400">this phone</span>}
                    </p>
                    <p className="text-xs text-white/40">
                      {presenceInfo.label}
                      {d.viaJoin ? ' · via /join' : ' · Google account'}
                      {d.motionStatus ? ` · ${d.motionStatus.emoji} ${d.motionStatus.label}` : ''}
                      {d.battery != null ? ` · 🔋 ${d.battery}%` : ''}
                    </p>
                    <p className="text-xs text-white/30">{mode.label}</p>
                  </div>
                </div>
                <span
                  className={`text-xs font-semibold ${online ? 'text-emerald-400' : 'text-white/30'}`}
                >
                  {online ? 'online' : 'offline'}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </GlassCard>
  );
}
