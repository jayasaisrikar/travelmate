import { NextRequest, NextResponse } from 'next/server';

import { searchDestinations } from '@/services/places';

export async function GET(request: NextRequest) {
  try {
    const query = request.nextUrl.searchParams.get('query')?.trim();

    if (!query || query.length < 2) {
      return NextResponse.json(
        { error: 'Query must be at least 2 characters long' },
        { status: 400 }
      );
    }

    const results = await searchDestinations(query);

    if (results.length === 0) {
      return NextResponse.json(
        { error: `No destinations found for "${query}"`, results: [] },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      query,
      results,
      count: results.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to search destinations';
    const temporaryFailure =
      message.includes('status 429') ||
      message.includes('status 500') ||
      message.includes('status 502') ||
      message.includes('status 503') ||
      message.includes('aborted') ||
      message.includes('fetch failed');

    return NextResponse.json(
      {
        error: temporaryFailure
          ? 'Destination search is temporarily unavailable. Please try again in a moment.'
          : message,
        results: [],
      },
      { status: temporaryFailure ? 503 : 500 }
    );
  }
}
