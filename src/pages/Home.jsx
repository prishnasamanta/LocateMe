import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function Home() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-lg text-center"
      >
        <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/20 ring-1 ring-indigo-500/30">
          <span className="text-3xl">📍</span>
        </div>

        <h1 className="bg-gradient-to-r from-white via-indigo-200 to-indigo-400 bg-clip-text text-5xl font-bold tracking-tight text-transparent">
          LocateMe
        </h1>
        <p className="mt-4 text-lg text-white/60">
          Owner signs in with Google, sets a destination, and tracks connected devices live.
        </p>

        <div className="mt-10 flex flex-col gap-3">
          <Link
            to="/create"
            className="rounded-2xl bg-indigo-600 px-8 py-4 text-lg font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:bg-indigo-500"
          >
            Owner — Sign in & create
          </Link>
          <Link
            to="/join"
            className="rounded-2xl border border-white/10 bg-white/5 px-8 py-4 text-lg font-semibold text-white/80 transition hover:bg-white/10"
          >
            Second device — Connect & share location
          </Link>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-4 text-left sm:grid-cols-3">
          {[
            { icon: '🔐', title: 'Google sign-in', desc: 'Same account on both phones' },
            { icon: '📡', title: 'Live GPS', desc: 'Updates as devices move' },
            { icon: '🔗', title: 'Share link', desc: 'QR for anyone else too' },
          ].map(({ icon, title, desc }) => (
            <div
              key={title}
              className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl"
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
