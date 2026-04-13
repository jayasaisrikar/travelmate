import { OPEN_METEO_WEATHER_CODES } from '@/lib/constants';
import type { WeatherSnapshot } from '@/lib/travel-types';

const weatherCache = new Map<string, { expiresAt: number; result: WeatherSnapshot }>();
const WEATHER_CACHE_TTL_MS = 15 * 60 * 1000;

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}, timeoutMs = 6000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchWeatherSnapshot(latitude: number, longitude: number): Promise<WeatherSnapshot> {
  const cacheKey = `${latitude.toFixed(4)}:${longitude.toFixed(4)}`;
  const cached = weatherCache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.result;
  }

  const response = await fetchWithTimeout(
    `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m`,
    {
      next: { revalidate: 900 },
    },
    5000
  );

  if (!response.ok) {
    throw new Error(`Weather lookup failed with status ${response.status}`);
  }

  const data = (await response.json()) as {
    current?: {
      temperature_2m?: number;
      apparent_temperature?: number;
      relative_humidity_2m?: number;
      weather_code?: number;
      wind_speed_10m?: number;
    };
  };

  const current = data.current;

  if (!current || typeof current.temperature_2m !== 'number' || typeof current.wind_speed_10m !== 'number') {
    throw new Error('Weather lookup returned incomplete data');
  }

  const code = current.weather_code ?? 0;
  const mappedCode = OPEN_METEO_WEATHER_CODES[code] ?? {
    description: `Weather code ${code}`,
    icon: '01d',
  };

  const result = {
    temperature: current.temperature_2m,
    feelsLike: current.apparent_temperature ?? current.temperature_2m,
    description: mappedCode.description,
    icon: mappedCode.icon,
    humidity: current.relative_humidity_2m ?? null,
    windSpeed: current.wind_speed_10m,
  };

  weatherCache.set(cacheKey, { expiresAt: Date.now() + WEATHER_CACHE_TTL_MS, result });
  return result;
}
