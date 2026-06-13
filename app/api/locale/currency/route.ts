import { NextRequest, NextResponse } from 'next/server';

import { currencyForCountryCode } from '@/services/currency';
import { resolveDestination } from '@/services/places';

// Resolves a coordinate (from the browser's geolocation) to the traveler's home
// currency. Used by onboarding to localise the budget after the user grants
// location access. Always returns a currency so callers can degrade to USD.
export async function GET(request: NextRequest) {
  const lat = Number.parseFloat(request.nextUrl.searchParams.get('lat') ?? '');
  const lon = Number.parseFloat(request.nextUrl.searchParams.get('lon') ?? '');

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return NextResponse.json({ error: 'Valid lat and lon are required' }, { status: 400 });
  }

  try {
    const destination = await resolveDestination('home location', { latitude: lat, longitude: lon });
    return NextResponse.json({
      countryCode: destination.countryCode ?? null,
      currency: currencyForCountryCode(destination.countryCode),
    });
  } catch {
    return NextResponse.json({ countryCode: null, currency: 'USD' });
  }
}
