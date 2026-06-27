import { useState, useEffect } from 'react';

export function useWeather(lat, lng) {
  const [weather, setWeather] = useState(null);
  const [sunTimes, setSunTimes] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (lat == null || lng == null) return;

    let cancelled = false;
    setLoading(true);

    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code&daily=sunrise,sunset&timezone=auto`;
    const sunUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=sunrise,sunset&timezone=auto`;

    Promise.all([
      fetch(weatherUrl).then((r) => r.json()),
      fetch(sunUrl).then((r) => r.json()),
    ])
      .then(([weatherData, sunData]) => {
        if (cancelled) return;
        const code = weatherData.current?.weather_code ?? 0;
        setWeather({
          temp: Math.round(weatherData.current?.temperature_2m ?? 0),
          description: weatherCodeToText(code),
          icon: weatherCodeToIcon(code),
        });
        const sunrise = sunData.daily?.sunrise?.[0];
        const sunset = sunData.daily?.sunset?.[0];
        setSunTimes({
          sunrise: formatTime(sunrise),
          sunset: formatTime(sunset),
        });
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [lat, lng]);

  return { weather, sunTimes, loading };
}

function formatTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function weatherCodeToText(code) {
  const map = {
    0: 'Clear',
    1: 'Mainly Clear',
    2: 'Partly Cloudy',
    3: 'Cloudy',
    45: 'Foggy',
    48: 'Foggy',
    51: 'Drizzle',
    61: 'Rain',
    63: 'Rain',
    65: 'Heavy Rain',
    71: 'Snow',
    80: 'Showers',
    95: 'Thunderstorm',
  };
  return map[code] ?? 'Cloudy';
}

function weatherCodeToIcon(code) {
  if (code === 0 || code === 1) return '☀️';
  if (code <= 3) return '⛅';
  if (code >= 61 && code <= 67) return '🌧️';
  if (code >= 71) return '❄️';
  if (code >= 95) return '⛈️';
  return '☁️';
}
