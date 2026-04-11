import { OPEN_METEO_WEATHER_CODES } from '@/lib/constants';
import type { WeatherSnapshot } from '@/lib/travel-types';

export async function fetchWeatherSnapshot(latitude: number, longitude: number): Promise<WeatherSnapshot> {
  const response = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m`,
    {
      next: { revalidate: 900 },
    }
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

  return {
    temperature: current.temperature_2m,
    feelsLike: current.apparent_temperature ?? current.temperature_2m,
    description: mappedCode.description,
    icon: mappedCode.icon,
    humidity: current.relative_humidity_2m ?? null,
    windSpeed: current.wind_speed_10m,
  };
}
