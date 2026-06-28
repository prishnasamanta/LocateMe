import { useState, useRef } from 'react';

export default function LocationSearch({ onSelect }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState(null);
  const debounceRef = useRef(null);

  const runSearch = async (text) => {
    const q = text.trim();
    if (q.length < 3) {
      setResults([]);
      return;
    }
    setSearching(true);
    setError(null);
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=6`;
      const res = await fetch(url, {
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) throw new Error('Search failed');
      const data = await res.json();
      setResults(
        data.map((item) => ({
          id: item.place_id,
          label: item.display_name,
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
        }))
      );
    } catch {
      setError('Could not search locations. Try again.');
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(value), 450);
  };

  return (
    <div className="mb-4">
      <label className="field-label">Search location</label>
      <input
        type="search"
        value={query}
        onChange={handleChange}
        placeholder="Building, address, landmark…"
        className="field-input"
      />
      {searching && <p className="mt-2 text-xs text-white/40">Searching…</p>}
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
      {results.length > 0 && (
        <ul className="mt-2 max-h-44 overflow-y-auto rounded-xl border border-white/10 bg-black/30">
          {results.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => {
                  onSelect({ lat: r.lat, lng: r.lng });
                  setQuery(r.label.split(',')[0]);
                  setResults([]);
                }}
                className="w-full px-3 py-2.5 text-left text-sm text-white/80 hover:bg-white/5"
              >
                {r.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
