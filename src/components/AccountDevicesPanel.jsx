import GlassCard from './GlassCard';
import { isDeviceStale } from '../services/accountDevices';

export default function AccountDevicesPanel({ devices, currentDeviceId, userEmail }) {
  const online = devices.filter((d) => !isDeviceStale(d));
  const remoteOnline = online.filter((d) => d.deviceId !== currentDeviceId);

  return (
    <GlassCard glow>
      <p className="text-xs font-medium uppercase tracking-widest text-white/50">
        Devices on {userEmail}
      </p>
      <p className="mt-1 text-sm text-white/60">
        {remoteOnline.length === 0
          ? 'No other device online — open /join on the second phone with the same Google account.'
          : `${remoteOnline.length} other device${remoteOnline.length > 1 ? 's' : ''} connected`}
      </p>

      {devices.length === 0 ? (
        <p className="mt-4 text-center text-sm text-white/40">
          Allow location below to register this device.
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {devices.map((d) => {
            const stale = isDeviceStale(d);
            const isSelf = d.deviceId === currentDeviceId;
            return (
              <li
                key={d.deviceId}
                className="flex items-center justify-between rounded-xl bg-black/20 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className={`h-2.5 w-2.5 rounded-full ${stale ? 'bg-white/20' : 'bg-emerald-400'}`} />
                  <div>
                    <p className="font-medium text-white">
                      {d.label || 'Device'}
                      {isSelf && <span className="ml-2 text-xs text-indigo-400">this phone</span>}
                    </p>
                    {!stale && d.accuracy != null && (
                      <p className="text-xs text-white/40">GPS ±{Math.round(d.accuracy)}m</p>
                    )}
                  </div>
                </div>
                <span className={`text-xs font-medium ${stale ? 'text-white/30' : 'text-emerald-400'}`}>
                  {stale ? 'offline' : 'live'}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </GlassCard>
  );
}
