import { NextRequest, NextResponse } from 'next/server';

import { resolveDestination } from '@/services/places';
import { fetchWeatherSnapshot } from '@/services/weather';

export async function GET(request: NextRequest) {
  try {
    const lat = request.nextUrl.searchParams.get('lat');
    const lon = request.nextUrl.searchParams.get('lon');
    const destination = request.nextUrl.searchParams.get('destination');

    let latitude: number;
    let longitude: number;

    if (lat && lon) {
      latitude = Number.parseFloat(lat);
      longitude = Number.parseFloat(lon);
    } else if (destination) {
      const resolvedDestination = await resolveDestination(destination);
      latitude = resolvedDestination.latitude;
      longitude = resolvedDestination.longitude;
    } else {
      return NextResponse.json(
        { error: 'Provide either lat/lon or destination' },
        { status: 400 }
      );
    }

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return NextResponse.json(
        { error: 'Latitude and longitude must be valid numbers' },
        { status: 400 }
      );
    }

    const weather = await fetchWeatherSnapshot(latitude, longitude);

    return NextResponse.json({
      temp: weather.temperature,
      feels_like: weather.feelsLike,
      description: weather.description,
      icon: weather.icon,
      humidity: weather.humidity,
      wind_speed: weather.windSpeed,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch weather' },
      { status: 500 }
    );
  }
}
