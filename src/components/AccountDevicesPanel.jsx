import GlassCard from './GlassCard';
import { isDeviceOnline, getDevicePresence } from '../services/accountDevices';
import { getTrackingModeLabel, getPresenceLabel } from '../utils/bleDistance';

export default function AccountDevicesPanel({
  devices,
  currentDeviceId,
  userEmail,
  pairedDeviceIds = [],
  title = 'Device hub',
  subtitle,
  sectionUnpaired,
  sectionPaired,
}) {
  const pairedSet = new Set(pairedDeviceIds);
  const unpaired = devices.filter((d) => !pairedSet.has(d.deviceId));
  const paired = devices.filter((d) => pairedSet.has(d.deviceId));
  const remoteOnline = devices.filter(
    (d) => d.deviceId !== currentDeviceId && isDeviceOnline(d)
  );

  const renderDevice = (d) => {
    const online = isDeviceOnline(d);
    const isSelf = d.deviceId === currentDeviceId;
    const isPaired = pairedSet.has(d.deviceId);
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
              {isPaired && !isSelf && (
                <span className="ml-2 text-xs text-emerald-400">paired</span>
              )}
            </p>
            <p className="text-xs text-white/40">
              {presenceInfo.label}
              {d.viaJoin ? ' · joined via /join' : ' · owner device'}
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
  };

  return (
    <GlassCard glow className="device-hub">
      <div className="flex items-center gap-2">
        <span className="text-2xl">🛰️</span>
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-white/50">{title}</p>
          <p className="text-sm text-white/70">{userEmail}</p>
        </div>
      </div>
      <p className="mt-3 text-sm text-white/50">
        {subtitle ??
          (remoteOnline.length === 0
            ? 'No other device online — keep the app open on other phones.'
            : `${remoteOnline.length} other device${remoteOnline.length > 1 ? 's' : ''} online`)}
      </p>

      {devices.length === 0 ? (
        <p className="mt-4 text-center text-sm text-white/40">
          Allow location to register this device on your Google account.
        </p>
      ) : (
        <div className="mt-4 space-y-4">
          {paired.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-widest text-emerald-400/80">
                {sectionPaired ?? 'Paired to this destination'}
              </p>
              <ul className="space-y-2">{paired.map(renderDevice)}</ul>
            </div>
          )}
          {unpaired.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-widest text-white/40">
                {sectionUnpaired ?? 'On account — not paired yet'}
              </p>
              <ul className="space-y-2">{unpaired.map(renderDevice)}</ul>
            </div>
          )}
        </div>
      )}
    </GlassCard>
  );
}
