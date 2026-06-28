import { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getLocation } from '../services/locations';
import { haversineDistance } from '../utils/haversine';
import { computeProgress } from '../utils/helpers';
import { useGeolocation } from '../hooks/useGeolocation';
import { useDeviceInfo } from '../hooks/useDeviceInfo';
import GlassCard from '../components/GlassCard';
import CoverageCard from '../components/CoverageCard';
import ProgressBar from '../components/ProgressBar';
import VisitorDeviceStats from '../components/VisitorDeviceStats';
import ArrivalInstructions from '../components/ArrivalInstructions';
import { publishVisitorPosition, resetPublishThrottle } from '../services/visitorTracking';
import { getVisitorDisplayName, setVisitorDisplayName } from '../utils/deviceId';

export default function Visitor() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const [destination, setDestination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [tracking, setTracking] = useState(false);
  const [distanceKm, setDistanceKm] = useState(null);
  const [visitorName, setVisitorNameState] = useState(getVisitorDisplayName());
  const initialDistanceRef = useRef(null);

  const {
    position,
    error: geoError,
    loading: geoLoading,
    speed,
    lastUpdate,
    requestPermission,
  } = useGeolocation(tracking);

  const { battery, network } = useDeviceInfo();

  useEffect(() => {
    const encodedPayload = searchParams.get('d');
    getLocation(id, encodedPayload)
      .then((loc) => {
        if (!loc) setNotFound(true);
        else setDestination(loc);
      })
      .catch((err) => setLoadError(err.message || 'Unable to load destination'))
      .finally(() => setLoading(false));
  }, [id, searchParams]);

  useEffect(() => {
    if (!position || !destination) return;
    const dist = haversineDistance(position.lat, position.lng, destination.lat, destination.lng);
    setDistanceKm(dist);
    if (initialDistanceRef.current == null) {
      initialDistanceRef.current = dist * 1000;
    }
  }, [position, destination]);

  useEffect(() => {
    if (!tracking || !position || !id) return;
    publishVisitorPosition(id, position, {
      displayName: visitorName,
      speed,
      battery,
      network,
    }).catch(() => {});
  }, [tracking, position, id, visitorName, speed, battery, network]);

  useEffect(() => {
    if (tracking) resetPublishThrottle();
  }, [tracking]);

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

  const distanceM = distanceKm != null ? distanceKm * 1000 : null;
  const inCoverage = distanceM != null && distanceM <= destination.radius;
  const arrived = inCoverage;
  const progress = computeProgress(initialDistanceRef.current, distanceM ?? 0);

  if (tracking && arrived && !geoLoading && position) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-4 py-8">
        <ArrivalInstructions
          locationId={id}
          destination={destination}
          visitorPosition={position}
        />
      </div>
    );
  }

  return (
    <div className="page-shell">
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
                  speedKmh={speed}
                />

                {initialDistanceRef.current != null && initialDistanceRef.current > destination.radius && (
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
                    Hidden steps unlock when you reach the destination.
                  </p>
                </GlassCard>

                <VisitorDeviceStats
                  speed={speed}
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
