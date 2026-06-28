import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function Home() {
  return (
    <div className="page-shell flex flex-col items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-lg text-center"
      >
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/20 ring-1 ring-indigo-500/40">
          <span className="text-3xl">📍</span>
        </div>

        <h1 className="bg-gradient-to-r from-white via-indigo-200 to-violet-300 bg-clip-text text-5xl font-bold tracking-tight text-transparent">
          LocateMe
        </h1>
        <p className="page-subtitle mt-4 text-base">
          Google device hub for owners. QR & code pairing for visitors. Live GPS on every move.
        </p>

        <div className="mt-10 flex flex-col gap-3">
          <Link to="/create" className="btn-primary py-4 text-lg">
            Owner — Create destination
          </Link>
          <Link to="/join" className="btn-secondary py-4 text-lg">
            Second device — Join & pair
          </Link>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-4 text-left sm:grid-cols-3">
          {[
            { icon: '🔐', title: 'Google hub', desc: 'All devices on your Gmail' },
            { icon: '📷', title: 'QR or code', desc: 'Pair any second phone' },
            { icon: '📡', title: 'Live GPS', desc: 'Updates as you move' },
          ].map(({ icon, title, desc }) => (
            <div
              key={title}
              className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl"
            >
              <span className="text-2xl">{icon}</span>
              <p className="mt-2 font-semibold text-white">{title}</p>
              <p className="text-sm text-white/50">{desc}</p>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
