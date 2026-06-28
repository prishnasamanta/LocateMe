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
import { formatAuthError } from '../utils/authErrors';
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
  const [ownerMode, setOwnerMode] = useState(null);
  const [lat, setLat] = useState(22.5726);
  const [lng, setLng] = useState(88.3639);
  const [radius, setRadius] = useState(500);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
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

  const isGoogleMode = ownerMode === 'google';

  useEffect(() => {
    if (!isGoogleMode || !user?.uid) return;
    return subscribeAccountDevices(user.uid, setDevices);
  }, [isGoogleMode, user?.uid]);

  useEffect(() => {
    if (!isGoogleMode || !tracking || !position || !user?.uid) return;
    publishAccountDevicePosition(user.uid, deviceId, position, { viaJoin: false }).catch(() => {});
  }, [isGoogleMode, tracking, position, user?.uid, deviceId]);

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
        expiration,
        ownerUid: user?.uid ?? null,
        ownerEmail: user?.email ?? null,
      };

      const result = await saveLocation(dest);

      if (isGoogleMode && user?.uid) {
        await saveAccountDestination(user.uid, {
          name: dest.name,
          lat,
          lng,
          radius,
          altitude,
          setByDeviceId: deviceId,
          setByLabel: deviceLabel,
        });
      }

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

  if (!ownerMode) {
    return (
      <div className="page-shell">
        <div className="page-container max-w-lg">
          <Link to="/" className="nav-back">← LocateMe</Link>
          <GlassCard glow className="mt-6 text-center">
            <span className="hero-icon">📍</span>
            <h1 className="page-title mt-4">How do you want to start?</h1>
            <p className="page-subtitle mt-2">
              Connect Google for a Find-Hub style device list, or set a location manually.
            </p>
            <div className="mt-8 space-y-3">
              <button
                type="button"
                onClick={() => {
                  if (!isFirebaseConfigured) {
                    setError('Google hub requires Firebase env vars on this deployment.');
                    setOwnerMode('google');
                  } else {
                    setOwnerMode('google');
                  }
                }}
                className="btn-primary w-full"
              >
                🔐 Connect Google account
              </button>
              <button
                type="button"
                onClick={() => setOwnerMode('manual')}
                className="btn-secondary w-full"
              >
                🗺️ Set location manually
              </button>
            </div>
          </GlassCard>
        </div>
      </div>
    );
  }

  if (isGoogleMode && authLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  if (isGoogleMode && !user) {
    return (
      <div className="page-shell">
        <div className="page-container max-w-md">
          <button type="button" onClick={() => setOwnerMode(null)} className="nav-back">
            ← Back
          </button>
          <GlassCard glow className="mt-6 text-center">
            <span className="hero-icon">🔐</span>
            <h1 className="page-title mt-4">Sign in with Google</h1>
            <p className="page-subtitle mt-2">
              Your device hub will list every phone logged into this Gmail, plus devices that join
              via /join.
            </p>
            <div className="mt-6">
              <GoogleSignInButton
                loading={authBusy}
                onClick={async () => {
                  setAuthBusy(true);
                  setError(null);
                  try {
                    await signInWithGoogle();
                  } catch (err) {
                    setError(formatAuthError(err));
                  } finally {
                    setAuthBusy(false);
                  }
                }}
              />
            </div>
            {error && (
              <div className="alert-error mt-4 text-left text-sm">
                <p>{error}</p>
                {error.includes('Authorized domains') && (
                  <p className="mt-2 text-xs text-white/50">
                    Also add <code className="text-indigo-300">localhost</code> for local dev.
                  </p>
                )}
              </div>
            )}
          </GlassCard>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <div className="page-container max-w-2xl">
        <header className="mb-6 flex items-start justify-between gap-3">
          <div>
            <button type="button" onClick={() => setOwnerMode(null)} className="nav-back">
              ← Back
            </button>
            <h1 className="page-title mt-2">
              {isGoogleMode ? 'Owner hub' : 'Manual destination'}
            </h1>
            {isGoogleMode && user && (
              <p className="mt-1 text-sm text-emerald-400">{user.email}</p>
            )}
          </div>
          {isGoogleMode && user && (
            <button type="button" onClick={logout} className="btn-ghost text-xs">
              Sign out
            </button>
          )}
        </header>

        {isGoogleMode && user && (
          <>
            <AccountDevicesPanel
              devices={devices}
              currentDeviceId={deviceId}
              userEmail={user.email}
            />
            <GlassCard className="mt-4">
              <label className="field-label">This device name</label>
              <input
                type="text"
                value={deviceLabel}
                onChange={(e) => setDeviceLabelState(e.target.value)}
                onBlur={() => setDeviceLabel(deviceLabel)}
                className="field-input"
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
                  className="btn-secondary mt-4 w-full"
                >
                  Allow location on this device
                </button>
                {geoError && <p className="mt-2 text-sm text-red-400">{geoError}</p>}
              </GlassCard>
            ) : null}
          </>
        )}

        {shareUrl ? (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mt-6 space-y-6">
            <GlassCard glow className="text-center">
              <p className="field-label">Destination code</p>
              <p className="code-display">{shareId}</p>
              <p className="mt-2 text-xs text-white/50">
                Visitor enters this on /join, or scans the QR below
              </p>
            </GlassCard>

            {isGoogleMode &&
              remoteDevices.map((device) => (
                <LiveDistanceMeter
                  key={device.deviceId}
                  title={device.viaJoin ? 'Joined device' : 'Google device'}
                  subtitle={`📱 ${device.label || 'Device'}`}
                  destination={savedDestination}
                  remotePosition={device}
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
              className="btn-secondary w-full"
            >
              Create another
            </button>
          </motion.div>
        ) : (
          <div className="mt-6 space-y-6">
            <GlassCard>
              <p className="field-label mb-3">Pick destination</p>
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
                className="btn-secondary mt-4 w-full"
              >
                {gpsLoading ? 'Getting location…' : '📍 Use my location'}
              </button>
            </GlassCard>

            <GlassCard>
              <p className="field-label mb-2">Radius</p>
              <div className="chip-row">
                {RADIUS_OPTIONS.map(({ label, value }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRadius(value)}
                    className={radius === value ? 'chip chip-active' : 'chip'}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </GlassCard>

            <GlassCard>
              <label className="field-label">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Library, Home"
                className="field-input"
              />
              <div className="chip-row mt-2">
                {NAME_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setName(preset)}
                    className="chip chip-sm"
                  >
                    {preset}
                  </button>
                ))}
              </div>

              <label className="field-label mt-4">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Meet me here!"
                rows={2}
                className="field-input"
              />

              <p className="field-label mt-4 mb-2">Expiration</p>
              <div className="chip-row">
                {EXPIRATION_OPTIONS.map(({ label, value }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setExpiration(value)}
                    className={expiration === value ? 'chip chip-active' : 'chip'}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </GlassCard>

            {error && <div className="alert-error">{error}</div>}

            <button type="button" onClick={handleGenerate} disabled={saving} className="btn-primary w-full py-4 text-lg">
              {saving ? 'Generating…' : 'Generate QR & code'}
            </button>

            <p className="text-center text-xs text-white/40">
              Second phone → <Link to="/join" className="text-indigo-400">/join</Link> → sign in → enter code or scan QR
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
