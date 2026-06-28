import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import GlassCard from '../components/GlassCard';
import GoogleSignInButton from '../components/GoogleSignInButton';
import QrUploader from '../components/QrUploader';
import AccountDevicesPanel from '../components/AccountDevicesPanel';
import { useAuth } from '../hooks/useAuth';
import { useGeolocation } from '../hooks/useGeolocation';
import { useDeviceInfo } from '../hooks/useDeviceInfo';
import { useDevicePresence, usePresenceHeartbeat } from '../hooks/useDevicePresence';
import { isFirebaseConfigured } from '../firebase/config';
import { formatAuthError } from '../utils/authErrors';
import {
  getDeviceId,
  getDeviceLabel,
  setDeviceLabel,
  setAccountRole,
} from '../utils/deviceId';
import {
  publishAccountDevicePosition,
  setAccountDevicePresence,
  subscribeAccountDevices,
  resetAccountPublishThrottle,
} from '../services/accountDevices';
import { normalizeSpeedKmh } from '../utils/trackingDistance';
import { resolveShareInput } from '../services/locations';
import { parseShareInput, buildVisitorPath } from '../utils/shareLink';
import { pairDeviceToShare } from '../services/pairing';

export default function JoinDevice() {
  const navigate = useNavigate();
  const { user, loading: authLoading, signInWithGoogle } = useAuth();
  const [authBusy, setAuthBusy] = useState(false);
  const [tracking, setTracking] = useState(false);
  const [devices, setDevices] = useState([]);
  const [deviceLabel, setDeviceLabelState] = useState(getDeviceLabel());
  const [codeInput, setCodeInput] = useState('');
  const [pairKeyInput, setPairKeyInput] = useState('');
  const [pairError, setPairError] = useState(null);
  const [pairing, setPairing] = useState(false);

  const deviceId = getDeviceId();
  const { position, error: geoError, speed, requestPermission } = useGeolocation(tracking);
  const { battery, network } = useDeviceInfo();
  const presence = useDevicePresence(tracking);

  useEffect(() => {
    if (!user?.uid) return;
    return subscribeAccountDevices(user.uid, setDevices);
  }, [user?.uid]);

  useEffect(() => {
    if (!tracking || !user?.uid) return;
    if (position) {
      publishAccountDevicePosition(user.uid, deviceId, position, {
        viaJoin: true,
        presence,
        battery,
        network,
        label: deviceLabel,
        speedKmh: normalizeSpeedKmh(position, speed),
      }).catch(() => {});
    } else {
      setAccountDevicePresence(user.uid, deviceId, presence, {
        battery,
        network,
        label: deviceLabel,
      }).catch(() => {});
    }
  }, [tracking, position, user?.uid, deviceId, presence, battery, network, speed, deviceLabel]);

  const heartbeatJoin = useCallback(() => {
    if (!tracking || !user?.uid || presence !== 'online') return;
    if (position) {
      publishAccountDevicePosition(user.uid, deviceId, position, {
        viaJoin: true,
        presence: 'online',
        battery,
        network,
        label: deviceLabel,
        speedKmh: normalizeSpeedKmh(position, speed),
      }).catch(() => {});
    } else {
      setAccountDevicePresence(user.uid, deviceId, 'online', {
        battery,
        network,
        label: deviceLabel,
      }).catch(() => {});
    }
  }, [tracking, user?.uid, presence, position, deviceId, battery, network, speed, deviceLabel]);

  usePresenceHeartbeat(tracking, presence, 10000, heartbeatJoin);

  useEffect(() => {
    if (tracking) resetAccountPublishThrottle();
  }, [tracking]);

  const pairDestination = async (raw) => {
    if (!user?.uid) {
      setPairError('Sign in with Google first.');
      return;
    }
    if (!pairKeyInput.trim()) {
      setPairError('Enter the pair key from the owner screen.');
      return;
    }

    setPairing(true);
    setPairError(null);
    try {
      const parsed = parseShareInput(raw);
      if (!parsed?.id) {
        throw new Error('Invalid code or link. Use the 6-character code or full link from the owner.');
      }

      const result = await resolveShareInput(parsed);
      if (!result) {
        throw new Error('Destination not found. Ask owner for a fresh link and pair key.');
      }

      await pairDeviceToShare(result.location.id, {
        uid: user.uid,
        deviceId,
        label: deviceLabel,
        pairKey: pairKeyInput,
        email: user.email,
        displayName: deviceLabel,
      });

      setAccountRole('joiner');

      navigate(buildVisitorPath(result.location.id, result.encodedPayload), {
        state: { autoTrack: tracking, paired: true },
      });
    } catch (err) {
      setPairError(err.message || 'Could not pair with destination');
    } finally {
      setPairing(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    pairDestination(codeInput);
  };

  if (!isFirebaseConfigured) {
    return (
      <div className="page-shell">
        <div className="page-container max-w-md">
          <Link to="/" className="nav-back">
            ← LocateMe
          </Link>
          <GlassCard glow className="mt-4 text-center">
            <p className="text-white/70">
              Google pairing requires Firebase on this deployment. Open the owner&apos;s direct link
              on this phone instead.
            </p>
            <Link to="/" className="btn-secondary mt-4 inline-block">
              Go home
            </Link>
          </GlassCard>
        </div>
      </div>
    );
  }

  if (authLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="page-shell">
        <div className="page-container max-w-md">
          <Link to="/" className="nav-back">
            ← LocateMe
          </Link>
          <GlassCard glow className="mt-4 text-center">
            <span className="hero-icon">🔐</span>
            <h1 className="page-title mt-4">Sign in to join</h1>
            <p className="page-subtitle mt-2">
              Use the same Google account as the owner. You&apos;ll see all devices on that account,
              then pair with a destination code and key.
            </p>
            <div className="mt-6">
              <GoogleSignInButton
                loading={authBusy}
                onClick={async () => {
                  setAuthBusy(true);
                  setPairError(null);
                  try {
                    await signInWithGoogle();
                  } catch (err) {
                    setPairError(formatAuthError(err));
                  } finally {
                    setAuthBusy(false);
                  }
                }}
              />
            </div>
            {pairError && <div className="alert-error mt-4 text-left text-sm">{pairError}</div>}
          </GlassCard>
        </div>
      </div>
    );
  }

  if (!tracking) {
    return (
      <div className="page-shell">
        <div className="page-container max-w-md">
          <Link to="/" className="nav-back">
            ← LocateMe
          </Link>
          <GlassCard glow className="mt-4 text-center">
            <span className="hero-icon">📱</span>
            <h1 className="page-title mt-4">Join device hub</h1>
            <p className="page-subtitle mt-2">{user.email}</p>
          </GlassCard>

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

          <GlassCard className="mt-4 text-center">
            <span className="hero-icon">📡</span>
            <h2 className="mt-3 text-lg font-semibold text-white">Allow live GPS</h2>
            <p className="page-subtitle mt-2">
              Your phone appears on the owner&apos;s device hub like Find My Device.
            </p>
            <button
              type="button"
              onClick={() => {
                requestPermission();
                setTracking(true);
              }}
              className="btn-primary mt-6 w-full"
            >
              Allow location
            </button>
            {geoError && <p className="mt-3 text-sm text-red-400">{geoError}</p>}
          </GlassCard>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <div className="page-container max-w-md">
        <Link to="/" className="nav-back">
          ← LocateMe
        </Link>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 mt-4">
          <AccountDevicesPanel
            devices={devices}
            currentDeviceId={deviceId}
            userEmail={user.email}
            title="Devices on this Google account"
            subtitle="Online phones logged into this Gmail. Pair below to track one to a destination."
          />

          <GlassCard glow>
            <h2 className="text-lg font-bold text-white">Pair to destination</h2>
            <p className="mt-1 text-sm text-white/50">
              Enter the owner&apos;s code or link, plus the 8-character pair key.
            </p>

            <form onSubmit={handleSubmit} className="mt-4 space-y-3">
              <div>
                <label className="field-label">Destination code or link</label>
                <input
                  type="text"
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value)}
                  placeholder="6-char code or https://…/l/…"
                  className="field-input font-mono"
                />
              </div>
              <div>
                <label className="field-label">Pair key</label>
                <input
                  type="text"
                  value={pairKeyInput}
                  onChange={(e) => setPairKeyInput(e.target.value.toUpperCase())}
                  placeholder="8-character key from owner"
                  className="field-input font-mono tracking-widest"
                  maxLength={8}
                />
              </div>
              <button
                type="submit"
                disabled={pairing || !codeInput.trim() || !pairKeyInput.trim()}
                className="btn-primary w-full"
              >
                {pairing ? 'Pairing…' : 'Pair & start tracking →'}
              </button>
            </form>

            <div className="my-4 flex items-center gap-3">
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-xs text-white/40">or scan QR</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>

            <QrUploader
              label="Upload QR image (then enter pair key above)"
              onScan={(data) => {
                const parsed = parseShareInput(data);
                if (parsed?.id) setCodeInput(data.trim());
              }}
            />

            {pairError && <div className="alert-error mt-4 text-sm">{pairError}</div>}
          </GlassCard>
        </motion.div>
      </div>
    </div>
  );
}
