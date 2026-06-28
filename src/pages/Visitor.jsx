import { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getLocation } from '../services/locations';
import { computeProgress } from '../utils/helpers';
import {
  computeTrackingDistance,
  smoothPosition,
  normalizeSpeedKmh,
} from '../utils/trackingDistance';
import { useGeolocation } from '../hooks/useGeolocation';
import { useDeviceInfo } from '../hooks/useDeviceInfo';
import { useVisitorRing } from '../hooks/useVisitorRing';
import GlassCard from '../components/GlassCard';
import CoverageCard from '../components/CoverageCard';
import ProgressBar from '../components/ProgressBar';
import DeviceStatsPanel from '../components/DeviceStatsPanel';
import ArrivalInstructions from '../components/ArrivalInstructions';
import GatePrompt from '../components/GatePrompt';
import {
  publishVisitorPosition,
  subscribeOwnerPosition,
  resetPublishThrottle,
} from '../services/visitorTracking';
import { getVisitorDisplayName, setVisitorDisplayName } from '../utils/deviceId';

export default function Visitor() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const routeLocation = useLocation();
  const encodedPayload = searchParams.get('d');
  const [destination, setDestination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [tracking, setTracking] = useState(Boolean(routeLocation.state?.autoTrack));
  const [ownerPosition, setOwnerPosition] = useState(null);
  const [gateConfirmed, setGateConfirmed] = useState(false);
  const [showGatePrompt, setShowGatePrompt] = useState(false);
  const [visitorName, setVisitorNameState] = useState(getVisitorDisplayName());
  const initialDistanceRef = useRef(null);
  const smoothedRef = useRef(null);

  const {
    position: rawPosition,
    error: geoError,
    loading: geoLoading,
    speed,
    lastUpdate,
    requestPermission,
  } = useGeolocation(tracking);

  const { battery, network } = useDeviceInfo();
  useVisitorRing(id, tracking);

  const speedKmh = normalizeSpeedKmh(rawPosition, speed);
  const position = rawPosition
    ? smoothPosition(smoothedRef.current, rawPosition, speedKmh)
    : null;

  useEffect(() => {
    smoothedRef.current = position;
  }, [position]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    setLoadError(null);

    getLocation(id, encodedPayload)
      .then((loc) => {
        if (cancelled) return;
        if (!loc) setNotFound(true);
        else setDestination(loc);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err.message || 'Unable to load destination');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, encodedPayload]);

  useEffect(() => {
    if (routeLocation.state?.autoTrack) requestPermission();
  }, [routeLocation.state?.autoTrack, requestPermission]);

  useEffect(() => {
    if (!id) return;
    return subscribeOwnerPosition(id, setOwnerPosition);
  }, [id]);

  const trackingResult =
    position && destination
      ? computeTrackingDistance(position, destination, {
          ownerPosition,
          radiusM: destination.radius,
        })
      : { distanceM: null, inCoverage: false, accuracyM: null, source: 'none' };

  const { distanceM, inCoverage, accuracyM, source: distanceSource } = trackingResult;

  useEffect(() => {
    if (distanceM == null) return;
    if (initialDistanceRef.current == null) {
      initialDistanceRef.current = distanceM;
    }
  }, [distanceM]);

  useEffect(() => {
    if (!tracking || !position || !id) return;
    publishVisitorPosition(id, position, {
      displayName: visitorName,
      speed: speedKmh,
      battery,
      network,
    }).catch(() => {});
  }, [tracking, position, id, visitorName, speedKmh, battery, network]);

  useEffect(() => {
    if (tracking) resetPublishThrottle();
  }, [tracking]);

  useEffect(() => {
    if (inCoverage && !gateConfirmed && !showGatePrompt && tracking && position) {
      setShowGatePrompt(true);
    }
  }, [inCoverage, gateConfirmed, showGatePrompt, tracking, position]);

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  if (loadError || notFound) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
        <span className="text-5xl">{loadError ? '⚠️' : '🔍'}</span>
        <h1 className="mt-4 text-2xl font-bold text-white">
          {loadError ? 'Unable to Load' : 'Link Not Found'}
        </h1>
        <p className="mt-2 text-white/60">
          {loadError ||
            'Ask the owner for a fresh QR or full link with the destination code.'}
        </p>
        <Link to="/" className="mt-6 text-indigo-400 hover:text-indigo-300">
          Go Home
        </Link>
      </div>
    );
  }

  const progress = computeProgress(initialDistanceRef.current, distanceM ?? 0);

  if (tracking && inCoverage && gateConfirmed && !geoLoading && position) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-4 py-8">
        <ArrivalInstructions
          locationId={id}
          destination={destination}
          visitorPosition={position}
          distanceM={distanceM}
        />
      </div>
    );
  }

  return (
    <div className="page-shell">
      {showGatePrompt && !gateConfirmed && (
        <GatePrompt
          onConfirm={() => {
            setGateConfirmed(true);
            setShowGatePrompt(false);
          }}
          onDecline={() => setShowGatePrompt(false)}
        />
      )}

      <div className="page-container max-w-lg">
        <Link to="/" className="nav-back">
          ← LocateMe
        </Link>

        <GlassCard glow className="mt-4 mb-4">
          <p className="field-label">Destination</p>
          <h1 className="page-title text-xl">📍 {destination.name}</h1>
          {destination.description && (
            <p className="mt-1 text-sm text-white/60">{destination.description}</p>
          )}
        </GlassCard>

        <GlassCard className="mb-4">
          <label className="field-label">Your name (shown to owner)</label>
          <input
            type="text"
            value={visitorName}
            onChange={(e) => setVisitorNameState(e.target.value)}
            onBlur={() => setVisitorDisplayName(visitorName)}
            className="field-input"
            placeholder="e.g. Phone, John's iPhone"
          />
        </GlassCard>

        {!tracking ? (
          <GlassCard className="text-center">
            <span className="hero-icon">📡</span>
            <h2 className="mt-3 text-xl font-semibold text-white">Allow Location</h2>
            <p className="page-subtitle mt-2">
              We need GPS to track your distance to the destination.
            </p>
            <button
              type="button"
              onClick={() => {
                requestPermission();
                setTracking(true);
              }}
              className="btn-primary mt-6 w-full py-4 text-lg"
            >
              Allow
            </button>
            {geoError && <p className="mt-3 text-sm text-red-400">{geoError}</p>}
          </GlassCard>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            {geoLoading && !position ? (
              <GlassCard className="text-center">
                <div className="spinner mx-auto" />
                <p className="mt-3 text-white/60">Acquiring GPS signal…</p>
              </GlassCard>
            ) : (
              <>
                <CoverageCard
                  distanceM={distanceM}
                  radiusM={destination.radius}
                  inCoverage={inCoverage}
                  visitorPosition={position}
                  destination={destination}
                  speedKmh={speedKmh}
                  accuracyM={accuracyM}
                  distanceSource={distanceSource}
                />

                {initialDistanceRef.current != null &&
                  initialDistanceRef.current > destination.radius && (
                    <ProgressBar
                      progress={progress}
                      initialDistanceM={initialDistanceRef.current}
                      currentDistanceM={distanceM ?? 0}
                      showSubtitle={false}
                    />
                  )}

                <GlassCard className="text-center">
                  <span className="text-3xl">🔒</span>
                  <p className="mt-3 text-sm font-medium text-white/70">
                    {inCoverage
                      ? 'Confirm you entered the gate to unlock directions.'
                      : 'Hidden steps unlock when you reach the destination.'}
                  </p>
                  {inCoverage && !gateConfirmed && (
                    <button
                      type="button"
                      onClick={() => setShowGatePrompt(true)}
                      className="btn-secondary mt-4 w-full"
                    >
                      I entered the gate
                    </button>
                  )}
                </GlassCard>

                <DeviceStatsPanel
                  title="Your device"
                  position={position}
                  speed={speedKmh}
                  lastUpdate={lastUpdate}
                  battery={battery}
                  network={network}
                />
              </>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
