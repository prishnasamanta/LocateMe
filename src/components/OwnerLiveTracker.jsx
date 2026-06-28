import { useEffect, useState, useRef } from 'react';
import { motion as Motion } from 'framer-motion';
import GlassCard from './GlassCard';
import LiveMap from './LiveMap';
import DeviceStatsPanel from './DeviceStatsPanel';
import { computeTrackingDistance } from '../utils/trackingDistance';
import { formatLiveDistance, getVerticalHint } from '../utils/relativePosition';
import { formatArrivalSentence } from '../utils/arrivalHint';
import { getMotionStatus } from '../utils/motionStatus';
import { getTrackingModeLabel, getPresenceLabel } from '../utils/bleDistance';
import { isVisitorOnline, getVisitorPresence } from '../services/visitorTracking';
import { formatRelativeTime } from '../utils/helpers';
import { startVisitorRing, stopVisitorRing, subscribeVisitorRing } from '../services/visitorRing';

function parseUpdatedAt(iso) {
  if (!iso) return null;
  return typeof iso === 'string' ? new Date(iso) : iso;
}

export default function OwnerLiveTracker({ destination, visitorPos, ownerPosition, locationId }) {
  const [pulse, setPulse] = useState(false);
  const [ringing, setRinging] = useState(false);
  const [ringBusy, setRingBusy] = useState(false);
  const prevDistanceRef = useRef(null);

  useEffect(() => {
    if (!locationId) return;
    return subscribeVisitorRing(locationId, (state) => setRinging(Boolean(state.active)));
  }, [locationId]);

  const tracking = computeTrackingDistance(visitorPos, destination, {
    ownerPosition,
    radiusM: destination?.radius ?? 500,
    bleDistanceM: visitorPos?.bleDistanceM ?? null,
  });

  const { distanceM, inCoverage, source, accuracyM } = tracking;
  const modeInfo = getTrackingModeLabel(source);
  const updatedAt = parseUpdatedAt(visitorPos?.updatedAt ?? visitorPos?.heartbeatAt);
  const speedKmh =
    typeof visitorPos?.speed === 'number' && Number.isFinite(visitorPos.speed)
      ? visitorPos.speed
      : null;
  const motionStatus = visitorPos?.motionStatus?.label
    ? visitorPos.motionStatus
    : getMotionStatus(speedKmh);
  const vertical =
    inCoverage && visitorPos ? getVerticalHint(visitorPos, destination, 'owner') : null;
  const hintSentence =
    inCoverage && visitorPos
      ? formatArrivalSentence(distanceM, visitorPos, destination, 'owner')
      : null;
  const visitorOnline = isVisitorOnline(visitorPos);
  const presenceInfo = getPresenceLabel(getVisitorPresence(visitorPos));

  useEffect(() => {
    if (distanceM == null) return;
    if (prevDistanceRef.current != null && Math.abs(prevDistanceRef.current - distanceM) >= 1) {
      setPulse(true);
      const t = setTimeout(() => setPulse(false), 400);
      prevDistanceRef.current = distanceM;
      return () => clearTimeout(t);
    }
    prevDistanceRef.current = distanceM;
  }, [distanceM]);

  const toggleRing = async () => {
    if (!locationId || ringBusy) return;
    setRingBusy(true);
    try {
      if (ringing) await stopVisitorRing(locationId);
      else await startVisitorRing(locationId);
    } finally {
      setRingBusy(false);
    }
  };

  if (!visitorPos?.lat || visitorPos?.lng == null) {
    return (
      <GlassCard className="text-center">
        <div className="mx-auto h-10 w-10 animate-pulse rounded-full border-2 border-indigo-400/50 border-t-indigo-400" />
        <p className="mt-4 text-white/70">Waiting for visitor to connect…</p>
        <p className="mt-1 text-xs text-white/40">Share the link or QR code</p>
      </GlassCard>
    );
  }

  const mapVisitorPos =
    visitorPos.lat != null && visitorPos.lng != null ? visitorPos : null;

  return (
    <GlassCard glow>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="field-label">Live visitor</p>
          <p className="font-semibold text-white">{visitorPos.displayName || 'Visitor'}</p>
          <p className="text-xs text-white/40">{presenceInfo.label}</p>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${visitorOnline ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-white/40'}`}
        >
          {visitorOnline ? 'online' : 'offline'}
        </span>
      </div>

      <Motion.div
        animate={pulse ? { scale: [1, 1.02, 1] } : { scale: 1 }}
        className="mt-4 text-center"
      >
        <p className="font-mono text-5xl font-bold text-white">{formatLiveDistance(distanceM)}</p>
        {inCoverage && hintSentence && (
          <p className="mt-2 text-lg font-semibold text-indigo-300">{hintSentence}</p>
        )}
        {!inCoverage && vertical && (
          <p className="mt-2 text-lg font-semibold text-indigo-300">
            {vertical.icon} {vertical.text}
          </p>
        )}
        <p className="mt-2 text-xs text-white/40">
          {modeInfo.emoji} {modeInfo.label}
          {accuracyM != null ? ` · ±${accuracyM} m` : ''}
        </p>
      </Motion.div>

      <div className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-white/5 px-4 py-2.5">
        <span className="text-xl">{motionStatus.emoji}</span>
        <span className="font-medium text-white/80">{motionStatus.label}</span>
        {speedKmh != null && (
          <span className="text-sm text-white/40">· {speedKmh.toFixed(1)} km/h</span>
        )}
      </div>

      <button
        type="button"
        onClick={toggleRing}
        disabled={ringBusy}
        className={`mt-4 w-full rounded-xl py-3.5 text-sm font-semibold transition ${
          ringing
            ? 'bg-red-500/20 text-red-300 ring-1 ring-red-500/40'
            : 'bg-amber-500/15 text-amber-200 ring-1 ring-amber-500/30 hover:bg-amber-500/25'
        }`}
      >
        {ringBusy ? '…' : ringing ? '🔕 Stop ring on visitor phone' : '🔔 Ring visitor phone'}
      </button>

      {destination?.lat != null && destination?.lng != null && (
        <div className="mt-4">
          <LiveMap
            destination={{ lat: destination.lat, lng: destination.lng }}
            userPosition={mapVisitorPos}
            radiusMeters={destination.radius ?? 500}
            interactive={false}
            height="240px"
          />
        </div>
      )}

      <div className="mt-4">
        <DeviceStatsPanel
          title="Visitor device"
          position={visitorPos}
          speed={speedKmh}
          lastUpdate={updatedAt}
          battery={visitorPos.battery}
          network={visitorPos.network}
          presence={getVisitorPresence(visitorPos)}
          trackingMode={visitorPos.trackingMode ?? source}
          bleRssi={visitorPos.bleRssi}
        />
      </div>
    </GlassCard>
  );
}
