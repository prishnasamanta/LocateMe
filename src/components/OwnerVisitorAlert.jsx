import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import GlassCard from './GlassCard';
import { subscribeVisitorStatus } from '../services/visitorNotifications';

function formatTime(isoOrTimestamp) {
  if (!isoOrTimestamp) return '';
  const date =
    typeof isoOrTimestamp === 'string'
      ? new Date(isoOrTimestamp)
      : isoOrTimestamp.toDate?.() ?? new Date(isoOrTimestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function OwnerVisitorAlert({ locationId }) {
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    return subscribeVisitorStatus(locationId, setAlert);
  }, [locationId]);

  return (
    <AnimatePresence>
      {alert && (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
        >
          <GlassCard
            glow
            className="border border-emerald-500/30 bg-emerald-500/10 text-center"
          >
            <span className="text-4xl">🔔</span>
            <h3 className="mt-2 text-xl font-bold text-emerald-300">Visitor is waiting!</h3>
            <p className="mt-1 text-white/70">
              {alert.message || 'Your visitor has completed all steps and is waiting.'}
            </p>
            {alert.completedAt && (
              <p className="mt-2 text-xs text-white/40">
                Received at {formatTime(alert.completedAt)}
              </p>
            )}
          </GlassCard>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
