import { NextRequest, NextResponse } from 'next/server';

import { suggestInterestsForLocation } from '@/services/places';

// Returns interest chips curated to a specific destination, derived from the
// live POIs around its coordinates. Onboarding calls this when a place is picked
// so the suggested tags match what the destination actually offers.
export async function GET(request: NextRequest) {
  const lat = Number.parseFloat(request.nextUrl.searchParams.get('lat') ?? '');
  const lon = Number.parseFloat(request.nextUrl.searchParams.get('lon') ?? '');

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return NextResponse.json({ error: 'Valid lat and lon are required' }, { status: 400 });
  }

  try {
    const interests = await suggestInterestsForLocation({ latitude: lat, longitude: lon });
    return NextResponse.json({ interests });
  } catch {
    return NextResponse.json({ interests: [] });
  }
}
