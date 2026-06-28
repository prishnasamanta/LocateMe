import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import LiveMap from '../components/LiveMap';
import GlassCard from '../components/GlassCard';
import QRCodeDisplay from '../components/QRCode';
import OwnerVisitorAlert from '../components/OwnerVisitorAlert';
import OwnerLiveTracker from '../components/OwnerLiveTracker';
import LiveDistanceMeter from '../components/LiveDistanceMeter';
import AccountDevicesPanel from '../components/AccountDevicesPanel';
import GoogleSignInButton from '../components/GoogleSignInButton';
import { useCurrentLocation, useGeolocation } from '../hooks/useGeolocation';
import { useAuth } from '../hooks/useAuth';
import { saveLocation } from '../services/locations';
import { getShareUrl } from '../utils/idGenerator';
import { isFirebaseConfigured } from '../firebase/config';
import { getDeviceId, getDeviceLabel, setDeviceLabel } from '../utils/deviceId';
import {
  publishAccountDevicePosition,
  subscribeAccountDevices,
  saveAccountDestination,
  resetAccountPublishThrottle,
  isDeviceStale,
} from '../services/accountDevices';

const RADIUS_OPTIONS = [
  { label: '50m', value: 50 },
  { label: '100m', value: 100 },
  { label: '250m', value: 250 },
  { label: '500m', value: 500 },
  { label: '1 km', value: 1000 },
  { label: '5 km', value: 5000 },
];

const EXPIRATION_OPTIONS = [
  { label: 'Never', value: 'never' },
  { label: '1 Hour', value: '1h' },
  { label: '1 Day', value: '1d' },
  { label: '1 Week', value: '1w' },
];

const NAME_PRESETS = ['Library', 'Home', 'Secret Spot', 'Treasure', 'Meeting Point'];

export default function Owner() {
  const [lat, setLat] = useState(22.5726);
  const [lng, setLng] = useState(88.3639);
  const [radius, setRadius] = useState(500);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState('public');
  const [expiration, setExpiration] = useState('never');
  const [saving, setSaving] = useState(false);
  const [shareUrl, setShareUrl] = useState(null);
  const [shareId, setShareId] = useState(null);
  const [savedDestination, setSavedDestination] = useState(null);
  const [altitude, setAltitude] = useState(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [tracking, setTracking] = useState(false);
  const [devices, setDevices] = useState([]);
  const [deviceLabel, setDeviceLabelState] = useState(getDeviceLabel());

  const deviceId = getDeviceId();
  const { user, loading: authLoading, signInWithGoogle, logout } = useAuth();
  const { position: gpsPosition, fetchLocation, loading: gpsLoading, error: gpsError } =
    useCurrentLocation();
  const { position, error: geoError, loading: geoLoading, requestPermission } =
    useGeolocation(tracking);

  useEffect(() => {
    if (!user?.uid) return;
    return subscribeAccountDevices(user.uid, setDevices);
  }, [user?.uid]);

  useEffect(() => {
    if (!tracking || !position || !user?.uid) return;
    publishAccountDevicePosition(user.uid, deviceId, position).catch(() => {});
  }, [tracking, position, user?.uid, deviceId]);

  useEffect(() => {
    if (tracking) resetAccountPublishThrottle();
  }, [tracking]);

  useEffect(() => {
    if (gpsPosition) {
      setLat(gpsPosition.lat);
      setLng(gpsPosition.lng);
      if (gpsPosition.altitude != null) setAltitude(gpsPosition.altitude);
    }
  }, [gpsPosition]);

  useEffect(() => {
    if (gpsError) setError(gpsError);
  }, [gpsError]);

  const remoteDevices = devices.filter((d) => d.deviceId !== deviceId && !isDeviceStale(d));

  const handleMapClick = ({ lat: newLat, lng: newLng }) => {
    setLat(newLat);
    setLng(newLng);
  };

  const handleGenerate = async () => {
    if (!name.trim()) {
      setError('Please enter a name for this destination');
      return;
    }
    if (!user?.uid) return;

    setSaving(true);
    setError(null);
    try {
      const dest = {
        name: name.trim(),
        description: description.trim(),
        lat,
        lng,
        radius,
        altitude,
        visibility,
        expiration,
        ownerUid: user.uid,
        ownerEmail: user.email,
      };

      const result = await saveLocation(dest);
      await saveAccountDestination(user.uid, {
        name: dest.name,
        lat,
        lng,
        radius,
        altitude,
        setByDeviceId: deviceId,
        setByLabel: deviceLabel,
      });

      const url = getShareUrl(result.id, result.encodedPayload);
      setShareId(result.id);
      setShareUrl(url);
      setSavedDestination({ lat, lng, radius, altitude, name: name.trim() });
    } catch (err) {
      setError(err.message || 'Failed to save location');
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isFirebaseConfigured) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 text-center">
        <h1 className="text-xl font-bold text-white">Firebase required</h1>
        <p className="mt-2 text-white/60">
          Add VITE_FIREBASE_* variables to your .env or Render dashboard, then redeploy.
        </p>
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
          <span className="text-4xl">🔐</span>
          <h1 className="mt-3 text-2xl font-bold text-white">Owner sign in</h1>
          <p className="mt-2 text-sm text-white/60">
            Sign in with Google to create destinations and see all devices on your account live.
          </p>
          <div className="mt-6">
            <GoogleSignInButton
              loading={authBusy}
              onClick={async () => {
                setAuthBusy(true);
                try {
                  await signInWithGoogle();
                } catch (err) {
                  setError(err.message || 'Sign in failed');
                } finally {
                  setAuthBusy(false);
                }
              }}
            />
          </div>
          {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
          <p className="mt-6 text-xs text-white/40">
            On the second phone, open{' '}
            <Link to="/join" className="text-indigo-400">
              /join
            </Link>{' '}
            with the same Google account.
          </p>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <header className="mb-6 flex items-start justify-between gap-3">
        <div>
          <Link to="/" className="text-sm text-indigo-400 hover:text-indigo-300">
            ← LocateMe
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-white">Owner dashboard</h1>
          <p className="mt-1 text-sm text-emerald-400">{user.email}</p>
        </div>
        <button
          type="button"
          onClick={logout}
          className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/60 hover:bg-white/5"
        >
          Sign out
        </button>
      </header>

      <AccountDevicesPanel
        devices={devices}
        currentDeviceId={deviceId}
        userEmail={user.email}
      />

      <GlassCard className="mt-4">
        <label className="mb-1 block text-xs font-medium uppercase tracking-widest text-white/50">
          This device name
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
          <p className="text-sm text-white/60">Register this phone on your Google account.</p>
          <button
            type="button"
            onClick={() => {
              requestPermission();
              setTracking(true);
            }}
            className="mt-4 w-full rounded-xl bg-white/10 py-3 text-sm font-semibold text-white hover:bg-white/15"
          >
            Allow location on this device
          </button>
          {geoError && <p className="mt-2 text-sm text-red-400">{geoError}</p>}
        </GlassCard>
      ) : geoLoading && !position ? (
        <GlassCard className="mt-4 text-center">
          <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
        </GlassCard>
      ) : null}

      {shareUrl ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6 space-y-6">
          {remoteDevices.map((device) => (
            <LiveDistanceMeter
              key={device.deviceId}
              title="Google account device"
              subtitle={`📱 ${device.label || 'Connected device'}`}
              destination={savedDestination}
              remotePosition={device}
              waitingMessage="Waiting for GPS…"
              emptyMessage=""
            />
          ))}

          <OwnerLiveTracker
            locationId={shareId}
            destination={savedDestination}
            shareUrl={shareUrl}
            onCopy={handleCopy}
            copied={copied}
          />

          <OwnerVisitorAlert locationId={shareId} />

          <QRCodeDisplay url={shareUrl} name={name} />

          <button
            type="button"
            onClick={() => {
              setShareUrl(null);
              setShareId(null);
              setSavedDestination(null);
            }}
            className="w-full rounded-xl border border-white/10 py-3 text-white/60 hover:bg-white/5"
          >
            Create Another
          </button>
        </motion.div>
      ) : (
        <div className="mt-6 space-y-6">
          <GlassCard>
            <p className="mb-3 text-xs font-medium uppercase tracking-widest text-white/50">
              Destination
            </p>
            <div className="mb-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-white/40">Lat</span>
                <p className="font-mono text-white">{lat.toFixed(6)}</p>
              </div>
              <div>
                <span className="text-white/40">Lng</span>
                <p className="font-mono text-white">{lng.toFixed(6)}</p>
              </div>
              <div>
                <span className="text-white/40">Radius</span>
                <p className="text-white">{radius >= 1000 ? `${radius / 1000} km` : `${radius} m`}</p>
              </div>
            </div>

            <LiveMap
              destination={{ lat, lng }}
              radiusMeters={radius}
              onMapClick={handleMapClick}
              height="280px"
            />

            <button
              type="button"
              onClick={fetchLocation}
              disabled={gpsLoading}
              className="mt-4 w-full rounded-xl bg-white/10 py-2.5 text-sm font-medium text-white hover:bg-white/15 disabled:opacity-50"
            >
              {gpsLoading ? 'Getting location…' : '📍 Use My Location'}
            </button>
          </GlassCard>

          <GlassCard>
            <label className="mb-2 block text-xs font-medium uppercase tracking-widest text-white/50">
              Radius
            </label>
            <div className="flex flex-wrap gap-2">
              {RADIUS_OPTIONS.map(({ label, value }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRadius(value)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                    radius === value ? 'bg-indigo-600 text-white' : 'bg-white/10 text-white/70'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </GlassCard>

          <GlassCard>
            <label className="mb-2 block text-xs font-medium uppercase tracking-widest text-white/50">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Library, Home"
              className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white placeholder:text-white/30"
            />
            <div className="mt-2 flex flex-wrap gap-2">
              {NAME_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setName(preset)}
                  className="rounded-lg bg-white/5 px-2.5 py-1 text-xs text-white/60 hover:bg-white/10"
                >
                  {preset}
                </button>
              ))}
            </div>

            <label className="mb-2 mt-4 block text-xs font-medium uppercase tracking-widest text-white/50">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Meet me here!"
              rows={2}
              className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white placeholder:text-white/30"
            />

            <label className="mb-2 mt-4 block text-xs font-medium uppercase tracking-widest text-white/50">
              Expiration
            </label>
            <div className="flex flex-wrap gap-2">
              {EXPIRATION_OPTIONS.map(({ label, value }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setExpiration(value)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                    expiration === value ? 'bg-indigo-600 text-white' : 'bg-white/10 text-white/70'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </GlassCard>

          {error && (
            <p className="rounded-xl bg-red-500/20 px-4 py-3 text-sm text-red-300">{error}</p>
          )}

          <button
            type="button"
            onClick={handleGenerate}
            disabled={saving}
            className="w-full rounded-2xl bg-indigo-600 py-4 text-lg font-semibold text-white shadow-lg shadow-indigo-500/30 hover:bg-indigo-500 disabled:opacity-50"
          >
            {saving ? 'Generating…' : 'Generate & start tracking'}
          </button>

          <p className="text-center text-xs text-white/40">
            Second phone:{' '}
            <Link to="/join" className="text-indigo-400">
              /join
            </Link>{' '}
            — same Google account, allow location
          </p>
        </div>
      )}
    </div>
  );
}
