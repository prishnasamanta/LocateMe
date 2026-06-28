import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import GlassCard from '../components/GlassCard';
import { isDeviceStale } from '../services/accountDevices';

export default function AccountDevicesPanel({ devices, currentDeviceId, userEmail }) {
  const online = devices.filter((d) => !isDeviceStale(d));
  const remoteOnline = online.filter((d) => d.deviceId !== currentDeviceId);

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
          ? 'No other device online yet — open /join on the second phone.'
          : `${remoteOnline.length} connected device${remoteOnline.length > 1 ? 's' : ''} live`}
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
                className="flex items-center justify-between rounded-xl bg-black/25 px-4 py-3 ring-1 ring-white/5"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${stale ? 'bg-white/20' : 'bg-emerald-400 animate-pulse-soft'}`}
                  />
                  <div>
                    <p className="font-medium text-white">
                      {d.label || 'Device'}
                      {isSelf && <span className="ml-2 text-xs text-indigo-400">this phone</span>}
                    </p>
                    <p className="text-xs text-white/40">
                      {d.viaJoin ? 'Connected via /join' : 'Google account device'}
                      {!stale && d.accuracy != null ? ` · ±${Math.round(d.accuracy)}m` : ''}
                    </p>
                  </div>
                </div>
                <span className={`text-xs font-semibold ${stale ? 'text-white/30' : 'text-emerald-400'}`}>
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
