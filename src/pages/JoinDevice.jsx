import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import GlassCard from '../components/GlassCard';
import GoogleSignInButton from '../components/GoogleSignInButton';
import RelativePositionBadge from '../components/RelativePositionBadge';
import { useAuth } from '../hooks/useAuth';
import { useGeolocation } from '../hooks/useGeolocation';
import { isFirebaseConfigured } from '../firebase/config';
import { getDeviceId, getDeviceLabel, setDeviceLabel } from '../utils/deviceId';
import {
  publishAccountDevicePosition,
  subscribeAccountDestination,
  resetAccountPublishThrottle,
} from '../services/accountDevices';
import { formatLiveDistance } from '../utils/relativePosition';
import { haversineDistance } from '../utils/haversine';

export default function JoinDevice() {
  const { user, loading: authLoading, signInWithGoogle } = useAuth();
  const [authBusy, setAuthBusy] = useState(false);
  const [tracking, setTracking] = useState(false);
  const [destination, setDestination] = useState(null);
  const [deviceLabel, setDeviceLabelState] = useState(getDeviceLabel());

  const deviceId = getDeviceId();
  const { position, error: geoError, loading: geoLoading, requestPermission } =
    useGeolocation(tracking);

  useEffect(() => {
    if (!user?.uid) return;
    return subscribeAccountDestination(user.uid, setDestination);
  }, [user?.uid]);

  useEffect(() => {
    if (!tracking || !position || !user?.uid) return;
    publishAccountDevicePosition(user.uid, deviceId, position).catch(() => {});
  }, [tracking, position, user?.uid, deviceId]);

  useEffect(() => {
    if (tracking) resetAccountPublishThrottle();
  }, [tracking]);

  const distanceM =
    position && destination
      ? haversineDistance(position.lat, position.lng, destination.lat, destination.lng) * 1000
      : null;
  const inRange = distanceM != null && distanceM <= (destination?.radius ?? 500);

  if (!isFirebaseConfigured) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 text-center">
        <p className="text-white/70">Firebase is not configured on this deployment.</p>
        <Link to="/" className="mt-4 inline-block text-indigo-400">
          ← Home
        </Link>
      </div>
    );
  }

  if (authLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-12">
        <Link to="/" className="text-sm text-indigo-400 hover:text-indigo-300">
          ← LocateMe
        </Link>
        <GlassCard glow className="mt-6 text-center">
          <span className="text-4xl">📱</span>
          <h1 className="mt-3 text-2xl font-bold text-white">Connect this device</h1>
          <p className="mt-2 text-sm text-white/60">
            Sign in with the <strong className="text-white">same Google account</strong> as the
            owner. Your live location will appear on their dashboard.
          </p>
          <div className="mt-6">
            <GoogleSignInButton
              loading={authBusy}
              onClick={async () => {
                setAuthBusy(true);
                try {
                  await signInWithGoogle();
                } finally {
                  setAuthBusy(false);
                }
              }}
            />
          </div>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <Link to="/" className="text-sm text-indigo-400 hover:text-indigo-300">
        ← LocateMe
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-white">Connected device</h1>
      <p className="text-sm text-white/50">{user.email}</p>

      <GlassCard className="mt-6">
        <label className="mb-1 block text-xs font-medium uppercase tracking-widest text-white/50">
          Device name
        </label>
        <input
          type="text"
          value={deviceLabel}
          onChange={(e) => setDeviceLabelState(e.target.value)}
          onBlur={() => setDeviceLabel(deviceLabel)}
          className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2.5 text-white"
        />
      </GlassCard>

      {!tracking ? (
        <GlassCard className="mt-4 text-center">
          <span className="text-4xl">📡</span>
          <h2 className="mt-3 text-lg font-semibold text-white">Share live location</h2>
          <p className="mt-2 text-sm text-white/60">
            The owner will see your GPS on their dashboard as you move.
          </p>
          <button
            type="button"
            onClick={() => {
              requestPermission();
              setTracking(true);
            }}
            className="mt-6 w-full rounded-2xl bg-indigo-600 py-4 font-semibold text-white hover:bg-indigo-500"
          >
            Allow location
          </button>
          {geoError && <p className="mt-3 text-sm text-red-400">{geoError}</p>}
        </GlassCard>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 space-y-4">
          <GlassCard glow className="text-center">
            <span className="text-3xl">✅</span>
            <p className="mt-2 font-semibold text-emerald-400">Location sharing active</p>
            <p className="mt-1 text-sm text-white/50">Owner can see you on their dashboard.</p>
          </GlassCard>

          {geoLoading && !position ? (
            <GlassCard className="text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
            </GlassCard>
          ) : destination && position ? (
            <GlassCard>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-widest text-white/50">Destination</p>
                  <p className="font-bold text-white">{destination.name}</p>
                </div>
                <RelativePositionBadge
                  visitor={position}
                  destination={destination}
                  compact={inRange}
                />
              </div>
              <p
                className={`mt-4 text-center font-mono text-4xl font-bold ${
                  inRange ? 'text-emerald-400' : 'text-white'
                }`}
              >
                {formatLiveDistance(distanceM)}
              </p>
            </GlassCard>
          ) : (
            <GlassCard className="text-center text-sm text-white/50">
              Waiting for owner to set a destination…
            </GlassCard>
          )}
        </motion.div>
      )}
    </div>
  );
}
