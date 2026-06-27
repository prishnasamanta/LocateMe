import GlassCard from './GlassCard';

export default function WeatherCard({ weather, sunTimes, loading }) {
  if (loading) {
    return (
      <GlassCard>
        <p className="text-sm text-white/50">Loading weather…</p>
      </GlassCard>
    );
  }

  if (!weather) return null;

  return (
    <GlassCard>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-white/50">
            Destination Weather
          </p>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-3xl">{weather.icon}</span>
            <div>
              <p className="text-2xl font-bold text-white">{weather.temp}°C</p>
              <p className="text-sm text-white/60">{weather.description}</p>
            </div>
          </div>
        </div>
        {sunTimes && (
          <div className="text-right text-sm">
            <div className="mb-2">
              <p className="text-white/40">Sunrise</p>
              <p className="font-medium text-amber-300">{sunTimes.sunrise}</p>
            </div>
            <div>
              <p className="text-white/40">Sunset</p>
              <p className="font-medium text-orange-400">{sunTimes.sunset}</p>
            </div>
          </div>
        )}
      </div>
    </GlassCard>
  );
}
