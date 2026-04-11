import { NextRequest, NextResponse } from 'next/server';

import { generateItineraryFromLiveData } from '@/services/itinerary';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const itinerary = await generateItineraryFromLiveData(body);

    return NextResponse.json({
      success: true,
      itinerary,
      source: 'kimi-live',
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate itinerary' },
      { status: 500 }
    );
  }
}
