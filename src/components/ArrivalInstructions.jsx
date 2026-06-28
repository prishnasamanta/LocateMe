import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import GlassCard from './GlassCard';
import { notifyVisitorCompleted } from '../services/visitorNotifications';
import { formatArrivalSentence } from '../utils/arrivalHint';

const STEPS = [
  'Go straight to take the lift',
  'Take lift and press 3',
  'Get out from lift and stay on the right side facing the lift and eyes closed',
];

export default function ArrivalInstructions({
  locationId,
  destination,
  visitorPosition,
  distanceM,
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const [waiting, setWaiting] = useState(false);
  const [notifying, setNotifying] = useState(false);

  const hint = formatArrivalSentence(distanceM, visitorPosition, destination, 'visitor');
  const isLocked = waiting;
  const canGoBack = stepIndex > 0 && !isLocked;

  const handleBack = () => {
    if (canGoBack) setStepIndex((i) => i - 1);
  };

  const handleDone = async () => {
    if (isLocked) return;

    if (stepIndex < STEPS.length - 1) {
      setStepIndex((i) => i + 1);
      return;
    }

    setWaiting(true);
    setNotifying(true);
    try {
      await notifyVisitorCompleted(locationId);
    } finally {
      setNotifying(false);
    }
  };

  return (
    <div className="relative w-full max-w-md">
      <GlassCard glow className="text-center">
        {hint && (
          <p className="mb-4 rounded-xl bg-indigo-500/10 px-4 py-3 text-lg font-semibold text-indigo-200">
            {hint}
          </p>
        )}

        <p className="text-xs font-medium uppercase tracking-widest text-white/50">
          Step {waiting ? STEPS.length : stepIndex + 1} of {STEPS.length}
        </p>

        <AnimatePresence mode="wait">
          {waiting ? (
            <motion.div
              key="waiting"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mt-6"
            >
              <span className="text-5xl">⏳</span>
              <h2 className="mt-4 text-2xl font-bold text-emerald-400">Now wait</h2>
              <p className="mt-2 text-white/60">
                Stay where you are. The owner has been notified.
              </p>
            </motion.div>
          ) : (
            <motion.div
              key={stepIndex}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mt-6"
            >
              <span className="text-4xl">👣</span>
              <p className="mt-4 text-lg font-medium leading-relaxed text-white">
                {STEPS[stepIndex]}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {!waiting && (
          <div className="mt-8 flex gap-3">
            <button
              type="button"
              onClick={handleBack}
              disabled={!canGoBack}
              className="flex-1 rounded-xl border border-white/10 py-3.5 text-sm font-semibold text-white/70 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-30"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleDone}
              disabled={notifying}
              className="flex-1 rounded-xl bg-indigo-600 py-3.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-50"
            >
              {notifying ? 'Sending…' : 'Done'}
            </button>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
