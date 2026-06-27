import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import LiveMap from '../components/LiveMap';
import GlassCard from '../components/GlassCard';
import QRCodeDisplay from '../components/QRCode';
import { useCurrentLocation } from '../hooks/useGeolocation';
import { saveLocation } from '../services/locations';
import { getShareUrl } from '../utils/idGenerator';
import { isFirebaseConfigured } from '../firebase/config';

const RADIUS_OPTIONS = [
  { label: '50m', value: 50 },
  { label: '100m', value: 100 },
  { label: '250m', value: 250 },
  { label: '500m', value: 500 },
  { label: '1 km', value: 1000 },
  { label: '5 km', value: 5000 },
];

const EXPIRATION_OPTIONS = [
  { label: 'Never', value: 'never' },
  { label: '1 Hour', value: '1h' },
  { label: '1 Day', value: '1d' },
  { label: '1 Week', value: '1w' },
];

const NAME_PRESETS = ['Library', 'Home', 'Secret Spot', 'Treasure', 'Meeting Point'];

export default function Owner() {
  const [lat, setLat] = useState(22.5726);
  const [lng, setLng] = useState(88.3639);
  const [radius, setRadius] = useState(500);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState('public');
  const [expiration, setExpiration] = useState('never');
  const [saving, setSaving] = useState(false);
  const [shareUrl, setShareUrl] = useState(null);
  const [shareId, setShareId] = useState(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);

  const { position: gpsPosition, fetchLocation, loading: gpsLoading, error: gpsError } =
    useCurrentLocation();

  useEffect(() => {
    if (gpsPosition) {
      setLat(gpsPosition.lat);
      setLng(gpsPosition.lng);
    }
  }, [gpsPosition]);

  useEffect(() => {
    if (gpsError) setError(gpsError);
  }, [gpsError]);

  const handleMapClick = ({ lat: newLat, lng: newLng }) => {
    setLat(newLat);
    setLng(newLng);
  };

  const handleUseGPS = () => {
    fetchLocation();
  };

  const handleGenerate = async () => {
    if (!name.trim()) {
      setError('Please enter a name for this destination');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const result = await saveLocation({
        name: name.trim(),
        description: description.trim(),
        lat,
        lng,
        radius,
        visibility,
        expiration,
      });
      const url = getShareUrl(result.id);
      setShareId(result.id);
      setShareUrl(url);
    } catch (err) {
      setError(err.message || 'Failed to save location');
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <Link to="/" className="text-sm text-indigo-400 hover:text-indigo-300">
            ← LocateMe
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-white">Location Owner</h1>
        </div>
        {!isFirebaseConfigured && (
          <span className="rounded-full bg-amber-500/20 px-3 py-1 text-xs text-amber-300">
            Demo mode (local storage)
          </span>
        )}
      </header>

      {shareUrl ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          <GlassCard glow className="text-center">
            <span className="text-4xl">✅</span>
            <h2 className="mt-2 text-xl font-bold text-white">Link Generated!</h2>
            <p className="text-white/60">Share this link with visitors</p>

            <div className="mt-4 flex items-center gap-2 rounded-xl bg-black/30 p-3">
              <code className="flex-1 truncate text-sm text-indigo-300">{shareUrl}</code>
              <button
                onClick={handleCopy}
                className="shrink-0 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>

            <Link
              to={`/l/${shareId}`}
              className="mt-4 inline-block text-sm text-indigo-400 hover:text-indigo-300"
            >
              Preview visitor page →
            </Link>
          </GlassCard>

          <QRCodeDisplay url={shareUrl} name={name} />

          <button
            onClick={() => {
              setShareUrl(null);
              setShareId(null);
            }}
            className="w-full rounded-xl border border-white/10 py-3 text-white/60 hover:bg-white/5"
          >
            Create Another
          </button>
        </motion.div>
      ) : (
        <div className="space-y-6">
          <GlassCard>
            <p className="mb-3 text-xs font-medium uppercase tracking-widest text-white/50">
              Current Target
            </p>
            <div className="mb-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-white/40">Lat</span>
                <p className="font-mono text-white">{lat.toFixed(6)}</p>
              </div>
              <div>
                <span className="text-white/40">Lng</span>
                <p className="font-mono text-white">{lng.toFixed(6)}</p>
              </div>
              <div>
                <span className="text-white/40">Radius</span>
                <p className="text-white">{radius >= 1000 ? `${radius / 1000} km` : `${radius} m`}</p>
              </div>
            </div>

            <LiveMap
              destination={{ lat, lng }}
              radiusMeters={radius}
              onMapClick={handleMapClick}
              height="280px"
            />

            <div className="mt-4 flex gap-3">
              <button
                onClick={handleUseGPS}
                disabled={gpsLoading}
                className="flex-1 rounded-xl bg-white/10 py-2.5 text-sm font-medium text-white hover:bg-white/15 disabled:opacity-50"
              >
                {gpsLoading ? 'Getting location…' : '📍 Use My Location'}
              </button>
            </div>
          </GlassCard>

          <GlassCard>
            <label className="mb-2 block text-xs font-medium uppercase tracking-widest text-white/50">
              Radius
            </label>
            <div className="flex flex-wrap gap-2">
              {RADIUS_OPTIONS.map(({ label, value }) => (
                <button
                  key={value}
                  onClick={() => setRadius(value)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                    radius === value
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white/10 text-white/70 hover:bg-white/15'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </GlassCard>

          <GlassCard>
            <label className="mb-2 block text-xs font-medium uppercase tracking-widest text-white/50">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Library, Home, Meeting Point"
              className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white placeholder:text-white/30"
            />
            <div className="mt-2 flex flex-wrap gap-2">
              {NAME_PRESETS.map((preset) => (
                <button
                  key={preset}
                  onClick={() => setName(preset)}
                  className="rounded-lg bg-white/5 px-2.5 py-1 text-xs text-white/60 hover:bg-white/10"
                >
                  {preset}
                </button>
              ))}
            </div>

            <label className="mb-2 mt-4 block text-xs font-medium uppercase tracking-widest text-white/50">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Meet me here!"
              rows={2}
              className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white placeholder:text-white/30"
            />

            <label className="mb-2 mt-4 block text-xs font-medium uppercase tracking-widest text-white/50">
              Visibility
            </label>
            <div className="flex gap-3">
              {['public', 'private'].map((v) => (
                <button
                  key={v}
                  onClick={() => setVisibility(v)}
                  className={`flex-1 rounded-xl py-2.5 text-sm font-medium capitalize ${
                    visibility === v
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white/10 text-white/70'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>

            <label className="mb-2 mt-4 block text-xs font-medium uppercase tracking-widest text-white/50">
              Expiration
            </label>
            <div className="flex flex-wrap gap-2">
              {EXPIRATION_OPTIONS.map(({ label, value }) => (
                <button
                  key={value}
                  onClick={() => setExpiration(value)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                    expiration === value
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white/10 text-white/70 hover:bg-white/15'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </GlassCard>

          {error && (
            <p className="rounded-xl bg-red-500/20 px-4 py-3 text-sm text-red-300">{error}</p>
          )}

          <button
            onClick={handleGenerate}
            disabled={saving}
            className="w-full rounded-2xl bg-indigo-600 py-4 text-lg font-semibold text-white shadow-lg shadow-indigo-500/30 hover:bg-indigo-500 disabled:opacity-50"
          >
            {saving ? 'Generating…' : 'Generate Share Link'}
          </button>
        </div>
      )}
    </div>
  );
}
