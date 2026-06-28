import { motion } from 'framer-motion';

export default function GlassCard({ children, className = '', glow = false }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl ${
        glow ? 'shadow-[0_0_40px_rgba(99,102,241,0.15)]' : 'shadow-lg shadow-black/20'
      } ${className}`}
    >
      {children}
    </motion.div>
  );
}
