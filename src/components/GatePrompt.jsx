import GlassCard from './GlassCard';

export default function GatePrompt({ onConfirm, onDecline }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <GlassCard glow className="w-full max-w-sm text-center">
        <span className="text-4xl">🚪</span>
        <h2 className="mt-4 text-xl font-bold text-white">Did you enter the gate?</h2>
        <p className="mt-2 text-sm text-white/60">
          Confirm only when you are inside the property. Then step-by-step directions will appear.
        </p>
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onDecline}
            className="flex-1 rounded-xl border border-white/10 py-3 text-sm font-semibold text-white/70 hover:bg-white/5"
          >
            Not yet
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white hover:bg-indigo-500"
          >
            Yes, I&apos;m in
          </button>
        </div>
      </GlassCard>
    </div>
  );
}
