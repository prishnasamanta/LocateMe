import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import GlassCard from '../components/GlassCard';
import GoogleSignInButton from '../components/GoogleSignInButton';
import QrUploader from '../components/QrUploader';
import { useAuth } from '../hooks/useAuth';
import { useGeolocation } from '../hooks/useGeolocation';
import { isFirebaseConfigured } from '../firebase/config';
import { formatAuthError } from '../utils/authErrors';
import { getDeviceId, getDeviceLabel, setDeviceLabel } from '../utils/deviceId';
import {
  publishAccountDevicePosition,
  resetAccountPublishThrottle,
} from '../services/accountDevices';
import { resolveShareInput } from '../services/locations';
import { parseShareInput, buildVisitorPath } from '../utils/shareLink';

export default function JoinDevice() {
  const navigate = useNavigate();
  const { user, loading: authLoading, signInWithGoogle } = useAuth();
  const [mode, setMode] = useState('code');
  const [authBusy, setAuthBusy] = useState(false);
  const [tracking, setTracking] = useState(false);
  const [deviceLabel, setDeviceLabelState] = useState(getDeviceLabel());
  const [codeInput, setCodeInput] = useState('');
  const [pairError, setPairError] = useState(null);
  const [pairing, setPairing] = useState(false);

  const deviceId = getDeviceId();
  const { position, error: geoError, loading: geoLoading, requestPermission } =
    useGeolocation(tracking);

  useEffect(() => {
    if (!tracking || !position || !user?.uid) return;
    publishAccountDevicePosition(user.uid, deviceId, position, { viaJoin: true }).catch(() => {});
  }, [tracking, position, user?.uid, deviceId]);

  useEffect(() => {
    if (tracking) resetAccountPublishThrottle();
  }, [tracking]);

  const pairDestination = async (raw, { locationGranted = false } = {}) => {
    setPairing(true);
    setPairError(null);
    try {
      const parsed = parseShareInput(raw);
      if (!parsed?.id) {
        throw new Error('Invalid code or link. Use the 6-character code, full link, or QR.');
      }

      const result = await resolveShareInput(parsed);
      if (!result) {
        throw new Error('Destination not found. Ask owner for a fresh QR or full link.');
      }

      navigate(buildVisitorPath(result.location.id, result.encodedPayload), {
        state: { autoTrack: locationGranted },
      });
    } catch (err) {
      setPairError(err.message || 'Could not load destination');
    } finally {
      setPairing(false);
    }
  };

  const handleCodeSubmit = (e) => {
    e.preventDefault();
    pairDestination(codeInput, { locationGranted: tracking });
  };

  if (authLoading && mode === 'google') {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  if (mode === 'code') {
    return (
      <div className="page-shell">
        <div className="page-container max-w-md">
          <Link to="/" className="nav-back">
            ← LocateMe
          </Link>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <GlassCard glow className="mt-4 text-center">
              <span className="hero-icon">🔗</span>
              <h1 className="page-title mt-4">Join destination</h1>
              <p className="page-subtitle mt-2">
                Enter the owner&apos;s 6-character code, paste the link, or upload their QR.
              </p>
            </GlassCard>

            <GlassCard className="mt-4">
              <form onSubmit={handleCodeSubmit}>
                <label className="field-label">Destination code or link</label>
                <input
                  type="text"
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                  placeholder="e.g. 9QWKNB or full link"
                  className="field-input font-mono uppercase tracking-widest"
                />
                <button
                  type="submit"
                  disabled={pairing || !codeInput.trim()}
                  className="btn-primary mt-3 w-full"
                >
                  {pairing ? 'Loading…' : 'Connect →'}
                </button>
              </form>

              <div className="my-4 flex items-center gap-3">
                <div className="h-px flex-1 bg-white/10" />
                <span className="text-xs text-white/40">or</span>
                <div className="h-px flex-1 bg-white/10" />
              </div>

              <QrUploader label="Upload QR screenshot" onScan={(data) => pairDestination(data)} />

              {pairError && <div className="alert-error mt-4 text-sm">{pairError}</div>}
            </GlassCard>

            {isFirebaseConfigured && (
              <button
                type="button"
                onClick={() => setMode('google')}
                className="btn-secondary mt-4 w-full"
              >
                Register this phone on Google hub instead
              </button>
            )}
          </motion.div>
        </div>
      </div>
    );
  }

  if (mode === 'google' && !user) {
    return (
      <div className="page-shell">
        <div className="page-container max-w-md">
          <button type="button" onClick={() => setMode('code')} className="nav-back">
            ← Back
          </button>
          <GlassCard glow className="mt-6 text-center">
            <span className="hero-icon">📱</span>
            <h1 className="page-title mt-4">Connect this device</h1>
            <p className="page-subtitle mt-2">
              Sign in with Google so the owner hub remembers this phone.
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

  if (mode === 'google' && user && !tracking) {
    return (
      <div className="page-shell">
        <div className="page-container max-w-md">
          <button type="button" onClick={() => setMode('code')} className="nav-back">
            ← Back
          </button>
          <GlassCard className="mt-4">
            <label className="field-label">Device name</label>
            <input
              type="text"
              value={deviceLabel}
              onChange={(e) => setDeviceLabelState(e.target.value)}
              onBlur={() => setDeviceLabel(deviceLabel)}
              className="field-input"
            />
          </GlassCard>
          <GlassCard glow className="mt-4 text-center">
            <span className="hero-icon">📡</span>
            <h2 className="mt-3 text-lg font-semibold text-white">Share live GPS</h2>
            <p className="page-subtitle mt-2">Owner will see this device on their hub.</p>
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
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <GlassCard glow className="mt-4 text-center">
            <span className="text-3xl">✅</span>
            <p className="mt-2 font-semibold text-emerald-400">Device connected</p>
            <p className="text-sm text-white/50">{user?.email}</p>
          </GlassCard>

          <GlassCard className="mt-4">
            <h2 className="text-lg font-bold text-white">Enter destination</h2>
            <p className="mt-1 text-sm text-white/50">
              Paste the link, enter the 6-character code, or upload the owner&apos;s QR.
            </p>

            <form onSubmit={handleCodeSubmit} className="mt-4">
              <label className="field-label">Destination code or link</label>
              <input
                type="text"
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                placeholder="e.g. PQZ3NS or full link"
                className="field-input font-mono uppercase tracking-widest"
              />
              <button type="submit" disabled={pairing || !codeInput.trim()} className="btn-primary mt-3 w-full">
                {pairing ? 'Loading…' : 'Go to destination →'}
              </button>
            </form>

            <div className="my-4 flex items-center gap-3">
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-xs text-white/40">or</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>

            <QrUploader label="Upload QR screenshot" onScan={(data) => pairDestination(data, { locationGranted: true })} />

            {pairError && <div className="alert-error mt-4 text-sm">{pairError}</div>}
          </GlassCard>

          {geoLoading && !position && (
            <GlassCard className="mt-4 text-center">
              <div className="spinner mx-auto" />
            </GlassCard>
          )}
        </motion.div>
      </div>
    </div>
  );
}
