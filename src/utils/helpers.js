export function getProximityStatus(distanceMeters, radiusMeters) {
  if (distanceMeters <= radiusMeters) {
    return { label: 'Arrived', emoji: '🎯', color: 'text-emerald-400', bg: 'bg-emerald-500/20' };
  }
  if (distanceMeters <= 1000) {
    return { label: 'Nearby', emoji: '🟢', color: 'text-emerald-400', bg: 'bg-emerald-500/10' };
  }
  if (distanceMeters <= 5000) {
    return { label: 'Getting Close', emoji: '🟡', color: 'text-amber-400', bg: 'bg-amber-500/10' };
  }
  return { label: 'Far Away', emoji: '🔴', color: 'text-red-400', bg: 'bg-red-500/10' };
}

export function computeProgress(initialDistanceM, currentDistanceM) {
  if (!initialDistanceM || initialDistanceM <= 0) return 0;
  const progress = ((initialDistanceM - currentDistanceM) / initialDistanceM) * 100;
  return Math.min(100, Math.max(0, progress));
}

export function formatRelativeTime(date) {
  if (!date) return '—';
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '—';
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 5) return 'Just now';
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}
