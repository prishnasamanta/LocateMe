import { useEffect, useState } from 'react';
import GlassCard from './GlassCard';
import LiveDistanceMeter from './LiveDistanceMeter';
import { subscribeVisitorPosition } from '../services/visitorTracking';

export default function OwnerLiveTracker({ locationId, destination, shareUrl, onCopy, copied }) {
  const [visitorPos, setVisitorPos] = useState(null);

  useEffect(() => {
    return subscribeVisitorPosition(locationId, setVisitorPos);
  }, [locationId]);

  return (
    <div className="space-y-4">
      <LiveDistanceMeter
        title="Live visitor tracking"
        subtitle={`📍 ${destination.name}`}
        destination={destination}
        remotePosition={visitorPos}
        waitingMessage="Waiting for visitor location…"
        emptyMessage="Share the link or QR — updates live as they move."
      />

      <GlassCard>
        <p className="mb-2 text-xs font-medium uppercase tracking-widest text-white/50">
          Share link
        </p>
        <div className="flex items-center gap-2 rounded-xl bg-black/30 p-3">
          <code className="flex-1 truncate text-sm text-indigo-300">{shareUrl}</code>
          <button
            type="button"
            onClick={onCopy}
            className="shrink-0 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </GlassCard>
    </div>
  );
}
