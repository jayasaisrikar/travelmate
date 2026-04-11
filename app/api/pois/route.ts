import { NextRequest, NextResponse } from 'next/server';

import { derivePoiTypes, fetchPointsOfInterest, resolveDestination } from '@/services/places';

export async function GET(request: NextRequest) {
  try {
    const lat = request.nextUrl.searchParams.get('lat');
    const lon = request.nextUrl.searchParams.get('lon');
    const destination = request.nextUrl.searchParams.get('destination');
    const radiusParam = request.nextUrl.searchParams.get('radius');
    const typesParam = request.nextUrl.searchParams.get('types');

    let latitude: number;
    let longitude: number;
    let resolvedDestinationName = destination?.trim() ?? '';

    if (lat && lon) {
      latitude = Number.parseFloat(lat);
      longitude = Number.parseFloat(lon);
    } else if (destination) {
      const resolvedDestination = await resolveDestination(destination);
      latitude = resolvedDestination.latitude;
      longitude = resolvedDestination.longitude;
      resolvedDestinationName = resolvedDestination.name;
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

    const radius = radiusParam ? Number.parseInt(radiusParam, 10) : 8000;
    const types = typesParam
      ? typesParam
          .split(',')
          .map((type) => type.trim())
          .filter(Boolean)
      : derivePoiTypes([]);

    const pois = await fetchPointsOfInterest({
      latitude,
      longitude,
      radius,
      types,
      limit: 60,
    });

    return NextResponse.json({
      success: true,
      destination: resolvedDestinationName || null,
      location: { latitude, longitude },
      radius,
      types,
      count: pois.length,
      pois,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch POIs' },
      { status: 500 }
    );
  }
}
