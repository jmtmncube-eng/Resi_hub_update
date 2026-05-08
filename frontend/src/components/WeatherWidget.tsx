import { useEffect, useState } from 'react';
import { Loader2, MapPin } from 'lucide-react';

/**
 * Live weather + temperature for the user's location.
 *
 * - Uses navigator.geolocation once on mount (silent fallback to Cape Town
 *   if denied/unsupported — we never block the dashboard on a permission
 *   prompt).
 * - Polls Open-Meteo (https://open-meteo.com/) every 15 minutes. No API
 *   key required, generous free tier, accurate to the WMO weather-code
 *   spec.
 * - Reverse-geocodes the coordinates via OpenStreetMap Nominatim only on
 *   the first fetch so we can show the city name; cached after that.
 *
 * Renders a compact pill: ☀️ 22°C · Cape Town
 */

interface CurrentWeather {
  temperature_2m: number;
  weather_code:   number;
  wind_speed_10m: number;
  is_day:         number;
}

const FALLBACK_LOCATION = { lat: -33.9249, lon: 18.4241, label: 'Cape Town' };
const REFRESH_MS = 15 * 60 * 1000;

const WX_CACHE_KEY = 'resihub.wx.cache.v1';
interface WxCache {
  coords: { lat: number; lon: number; label?: string };
  fetchedAt: number;
  data: CurrentWeather;
}

export function WeatherWidget() {
  const [coords,   setCoords]   = useState<{ lat: number; lon: number; label?: string } | null>(null);
  const [data,     setData]     = useState<CurrentWeather | null>(null);
  const [error,    setError]    = useState<string | null>(null);

  // ── 1. Resolve location once ───────────────────────────────────
  useEffect(() => {
    // Try cached first (instant render on revisit)
    try {
      const raw = localStorage.getItem(WX_CACHE_KEY);
      if (raw) {
        const cached = JSON.parse(raw) as WxCache;
        if (Date.now() - cached.fetchedAt < REFRESH_MS) {
          setCoords(cached.coords);
          setData(cached.data);
        }
      }
    } catch { /* ignore corrupted cache */ }

    if (!navigator.geolocation) {
      setCoords(FALLBACK_LOCATION);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const next = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        const label = await reverseGeocode(next.lat, next.lon).catch(() => undefined);
        setCoords({ ...next, label });
      },
      () => setCoords(FALLBACK_LOCATION),  // permission denied / timeout / unsupported
      { timeout: 5000, maximumAge: 60 * 60 * 1000 },
    );
  }, []);

  // ── 2. Fetch weather every 15 min ──────────────────────────────
  useEffect(() => {
    if (!coords) return;
    let cancelled = false;

    async function fetchWeather(c: { lat: number; lon: number; label?: string }) {
      try {
        const url = `https://api.open-meteo.com/v1/forecast`
                  + `?latitude=${c.lat}&longitude=${c.lon}`
                  + `&current=temperature_2m,weather_code,wind_speed_10m,is_day`
                  + `&timezone=auto`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (cancelled) return;
        const next = json.current as CurrentWeather;
        setData(next);
        setError(null);
        try {
          localStorage.setItem(WX_CACHE_KEY, JSON.stringify({
            coords: c, fetchedAt: Date.now(), data: next,
          } satisfies WxCache));
        } catch { /* ignore quota errors */ }
      } catch (err) {
        if (!cancelled) setError((err as Error).message || 'unknown');
      }
    }

    fetchWeather(coords);
    const id = setInterval(() => fetchWeather(coords), REFRESH_MS);
    return () => { cancelled = true; clearInterval(id); };
  }, [coords]);

  // ── Render ─────────────────────────────────────────────────────
  if (!coords || (!data && !error)) {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        fontFamily: "'IBM Plex Mono', monospace", fontSize: 10,
        color: 'var(--text3)',
      }}>
        <Loader2 size={9} className="animate-spin" /> weather…
      </span>
    );
  }

  if (error || !data) {
    return (
      <span style={{
        fontFamily: "'IBM Plex Mono', monospace", fontSize: 10,
        color: 'var(--text4)',
      }}>
        weather unavailable
      </span>
    );
  }

  const { emoji, label } = describeWeather(data.weather_code, data.is_day === 1);
  const cityLabel = coords.label ?? FALLBACK_LOCATION.label;

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      fontFamily: "'IBM Plex Mono', monospace",
      fontSize: 11, color: 'var(--text2)',
    }}
    title={`${label} · feels ${Math.round(data.temperature_2m)}°C · wind ${Math.round(data.wind_speed_10m)} km/h`}
    >
      <span style={{ fontSize: 13 }}>{emoji}</span>
      <span style={{ fontWeight: 600, color: 'var(--text)' }}>
        {Math.round(data.temperature_2m)}°
      </span>
      <span style={{ color: 'var(--text3)' }}>·</span>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: 'var(--text3)' }}>
        <MapPin size={9} />
        {cityLabel}
      </span>
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────

/** Map a WMO weather code to an emoji + plain-language label.
 *  Codes per https://open-meteo.com/en/docs (search "WMO Weather"). */
function describeWeather(code: number, isDay: boolean): { emoji: string; label: string } {
  if (code === 0)                           return { emoji: isDay ? '☀️' : '🌙', label: 'Clear' };
  if (code === 1 || code === 2)             return { emoji: isDay ? '🌤' : '☁️', label: 'Partly cloudy' };
  if (code === 3)                           return { emoji: '☁️',                label: 'Overcast' };
  if (code === 45 || code === 48)           return { emoji: '🌫',                label: 'Foggy' };
  if (code >= 51 && code <= 55)             return { emoji: '🌦',                label: 'Drizzle' };
  if (code === 56 || code === 57)           return { emoji: '🌧',                label: 'Freezing drizzle' };
  if (code >= 61 && code <= 65)             return { emoji: '🌧',                label: 'Rain' };
  if (code === 66 || code === 67)           return { emoji: '🌧',                label: 'Freezing rain' };
  if (code >= 71 && code <= 77)             return { emoji: '🌨',                label: 'Snow' };
  if (code >= 80 && code <= 82)             return { emoji: '🌦',                label: 'Showers' };
  if (code === 85 || code === 86)           return { emoji: '🌨',                label: 'Snow showers' };
  if (code === 95)                          return { emoji: '⛈',                label: 'Thunderstorm' };
  if (code === 96 || code === 99)           return { emoji: '⛈',                label: 'Thunderstorm w/ hail' };
  return { emoji: '🌡', label: 'Weather' };
}

/** Free reverse geocode via OpenStreetMap Nominatim. ~1 req/s rate limit;
 *  we cache the result so this only fires once per session. */
async function reverseGeocode(lat: number, lon: number): Promise<string | undefined> {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10&addressdetails=1`,
    { headers: { 'Accept': 'application/json' } },
  );
  if (!res.ok) return undefined;
  const json = await res.json() as { address?: { city?: string; town?: string; village?: string; suburb?: string; county?: string } };
  const a = json.address ?? {};
  return a.city ?? a.town ?? a.village ?? a.suburb ?? a.county;
}
