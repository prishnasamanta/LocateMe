import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Circle, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const destIcon = L.divIcon({
  className: 'custom-marker',
  html: `<div style="
    width: 24px; height: 24px;
    background: linear-gradient(135deg, #6366f1, #818cf8);
    border: 3px solid white;
    border-radius: 50%;
    box-shadow: 0 0 20px rgba(99,102,241,0.8), 0 0 40px rgba(99,102,241,0.4);
  "></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

const userIcon = L.divIcon({
  className: 'custom-marker',
  html: `<div style="
    width: 16px; height: 16px;
    background: #34d399;
    border: 2px solid white;
    border-radius: 50%;
    box-shadow: 0 0 12px rgba(52,211,153,0.8);
  "></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

function MapUpdater({ destination, userPosition }) {
  const map = useMap();
  const initialized = useRef(false);
  const hasUserCoords =
    userPosition?.lat != null &&
    userPosition?.lng != null &&
    Number.isFinite(userPosition.lat) &&
    Number.isFinite(userPosition.lng);

  useEffect(() => {
    if (!destination?.lat) return;
    const points = [[destination.lat, destination.lng]];
    if (hasUserCoords) points.push([userPosition.lat, userPosition.lng]);

    if (points.length === 1) {
      map.setView(points[0], 15);
    } else if (!initialized.current || hasUserCoords) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 16 });
      initialized.current = true;
    }
  }, [destination, userPosition, hasUserCoords, map]);

  return null;
}

export default function LiveMap({
  destination,
  userPosition,
  radiusMeters = 500,
  routeCoordinates,
  interactive = true,
  onMapClick,
  height = '320px',
}) {
  const center = destination?.lat
    ? [destination.lat, destination.lng]
    : userPosition?.lat != null
      ? [userPosition.lat, userPosition.lng]
      : [22.5726, 88.3639];

  const hasUserCoords =
    userPosition?.lat != null &&
    userPosition?.lng != null &&
    Number.isFinite(userPosition.lat) &&
    Number.isFinite(userPosition.lng);

  const handleClick = (e) => {
    if (onMapClick && interactive) {
      onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng });
    }
  };

  return (
    <div
      className="overflow-hidden rounded-2xl border border-white/10 shadow-lg shadow-black/30"
      style={{ height }}
    >
      <MapContainer
        center={center}
        zoom={15}
        style={{ height: '100%', width: '100%', background: '#1a1a2e' }}
        zoomControl={interactive}
        dragging={interactive}
        scrollWheelZoom={interactive}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        {destination && (
          <>
            <Marker position={[destination.lat, destination.lng]} icon={destIcon} />
            <Circle
              center={[destination.lat, destination.lng]}
              radius={radiusMeters}
              pathOptions={{
                color: '#6366f1',
                fillColor: '#6366f1',
                fillOpacity: 0.12,
                weight: 2,
              }}
            />
          </>
        )}

        {hasUserCoords && (
          <Marker position={[userPosition.lat, userPosition.lng]} icon={userIcon} />
        )}

        {routeCoordinates?.length > 1 && (
          <Polyline
            positions={routeCoordinates}
            pathOptions={{ color: '#818cf8', weight: 4, opacity: 0.8 }}
          />
        )}

        <MapUpdater destination={destination} userPosition={userPosition} />

        {onMapClick && (
          <MapClickHandler onClick={handleClick} />
        )}
      </MapContainer>
    </div>
  );
}

function MapClickHandler({ onClick }) {
  const map = useMap();
  useEffect(() => {
    map.on('click', onClick);
    return () => map.off('click', onClick);
  }, [map, onClick]);
  return null;
}
