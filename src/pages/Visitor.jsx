import { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getLocation } from '../services/locations';
import { haversineDistance } from '../utils/haversine';
import { bearing } from '../utils/bearing';
import { computeProgress } from '../utils/helpers';
import { useGeolocation } from '../hooks/useGeolocation';
import { useWeather } from '../hooks/useWeather';
import { useRoute, useDeviceInfo } from '../hooks/useDeviceInfo';
import LiveMap from '../components/LiveMap';
import DistanceCard from '../components/DistanceCard';
import ETA from '../components/ETA';
import ProgressBar from '../components/ProgressBar';
import StatusIndicator from '../components/StatusIndicator';
import Stats from '../components/Stats';
import WeatherCard from '../components/WeatherCard';
import GlassCard from '../components/GlassCard';
import ArrivalInstructions from '../components/ArrivalInstructions';
import { publishVisitorPosition, resetPublishThrottle } from '../services/visitorTracking';

export default function Visitor() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const [destination, setDestination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [tracking, setTracking] = useState(false);
  const [distanceKm, setDistanceKm] = useState(null);
  const [prevDistanceKm, setPrevDistanceKm] = useState(null);
  const [bearingDeg, setBearingDeg] = useState(null);
  const initialDistanceRef = useRef(null);

  const {
    position,
    error: geoError,
    loading: geoLoading,
    speed,
    lastUpdate,
    requestPermission,
  } = useGeolocation(tracking);

  const { weather, sunTimes, loading: weatherLoading } = useWeather(
    destination?.lat,
    destination?.lng
  );
  const { route } = useRoute(
    position ? { lat: position.lat, lng: position.lng } : null,
    destination ? { lat: destination.lat, lng: destination.lng } : null
  );
  const { battery, network } = useDeviceInfo();

  useEffect(() => {
    const encodedPayload = searchParams.get('d');
    getLocation(id, encodedPayload)
      .then((loc) => {
        if (!loc) {
          setNotFound(true);
        } else {
          setDestination(loc);
        }
      })
      .catch((err) => {
        setLoadError(err.message || 'Unable to load destination');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id, searchParams]);

  useEffect(() => {
    if (!position || !destination) return;

    const dist = haversineDistance(position.lat, position.lng, destination.lat, destination.lng);
    setPrevDistanceKm(distanceKm);
    setDistanceKm(dist);
    setBearingDeg(bearing(position.lat, position.lng, destination.lat, destination.lng));

    if (initialDistanceRef.current == null) {
      initialDistanceRef.current = dist * 1000;
    }
  }, [position, destination]);

  useEffect(() => {
    if (!tracking || !position || !id) return;
    publishVisitorPosition(id, position).catch(() => {});
  }, [tracking, position, id]);

  useEffect(() => {
    if (tracking) resetPublishThrottle();
  }, [tracking]);

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
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
            'This destination may have expired or doesn\u2019t exist. Ask the owner to send the full link or QR code.'}
        </p>
        <Link to="/" className="mt-6 text-indigo-400 hover:text-indigo-300">
          Go Home
        </Link>
      </div>
    );
  }

  const distanceM = distanceKm != null ? distanceKm * 1000 : null;
  const arrived = distanceM != null && distanceM <= destination.radius;
  const progress = computeProgress(initialDistanceRef.current, distanceM ?? 0);

  const openNavigation = () => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${destination.lat},${destination.lng}`;
    window.open(url, '_blank');
  };

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
    <div className="mx-auto max-w-lg px-4 py-6 pb-12">
      <header className="mb-6">
        <Link to="/" className="text-sm text-indigo-400 hover:text-indigo-300">
          ← LocateMe
        </Link>
      </header>

      <GlassCard glow className="mb-6">
        <p className="text-xs font-medium uppercase tracking-widest text-white/50">Destination</p>
        <h1 className="mt-1 text-2xl font-bold text-white">📍 {destination.name}</h1>
        {destination.description && (
          <p className="mt-1 text-white/60">{destination.description}</p>
        )}
      </GlassCard>

      {!tracking ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <GlassCard className="text-center">
            <span className="text-4xl">📡</span>
            <h2 className="mt-3 text-xl font-semibold text-white">Allow Location</h2>
            <p className="mt-2 text-sm text-white/60">
              We need your location to calculate live distance to the destination.
            </p>
            <button
              onClick={() => {
                requestPermission();
                setTracking(true);
              }}
              className="mt-6 w-full rounded-2xl bg-indigo-600 py-4 text-lg font-semibold text-white hover:bg-indigo-500"
            >
              Allow
            </button>
            {geoError && (
              <p className="mt-3 text-sm text-red-400">{geoError}</p>
            )}
          </GlassCard>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-4"
        >
          {geoLoading && !position ? (
            <GlassCard className="text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
              <p className="mt-3 text-white/60">Acquiring GPS signal…</p>
            </GlassCard>
          ) : (
            <>
              <DistanceCard
                distanceKm={distanceKm ?? 0}
                previousDistanceKm={prevDistanceKm}
                arrived={arrived}
              />

              {distanceM != null && (
                <StatusIndicator distanceMeters={distanceM} radiusMeters={destination.radius} />
              )}

              <ETA distanceKm={distanceKm ?? 0} bearingDeg={bearingDeg} />

              {initialDistanceRef.current > destination.radius && (
                <ProgressBar
                  progress={progress}
                  initialDistanceM={initialDistanceRef.current}
                  currentDistanceM={distanceM ?? 0}
                />
              )}

              <LiveMap
                destination={{ lat: destination.lat, lng: destination.lng }}
                userPosition={position}
                radiusMeters={destination.radius}
                routeCoordinates={route?.coordinates}
                interactive={false}
                height="240px"
              />

              <GlassCard className="text-center">
                <span className="text-3xl">🔒</span>
                <p className="mt-3 text-sm font-medium text-white/70">
                  It&apos;s hidden until you reach the destination.
                </p>
              </GlassCard>

              <Stats
                position={position}
                speed={speed}
                lastUpdate={lastUpdate}
                battery={battery}
                network={network}
              />

              <WeatherCard weather={weather} sunTimes={sunTimes} loading={weatherLoading} />

              <button
                onClick={openNavigation}
                className="w-full rounded-2xl bg-white/10 py-4 text-lg font-semibold text-white backdrop-blur-xl hover:bg-white/15"
              >
                Open Navigation
              </button>
            </>
          )}
        </motion.div>
      )}
    </div>
  );
}
