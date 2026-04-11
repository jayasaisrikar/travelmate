import { NextRequest, NextResponse } from 'next/server';

import { createTripSuggestion, getTripShareByToken } from '@/services/trip-sharing';

function normalizeField(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const { share, error: shareError } = await getTripShareByToken(token);

    if (shareError) {
      return NextResponse.json({ error: shareError.message }, { status: 500 });
    }

    if (!share) {
      return NextResponse.json({ error: 'Share link not found' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const guestName = normalizeField(body?.guestName) || null;
    const guestEmail = normalizeField(body?.guestEmail) || null;
    const message = normalizeField(body?.message);

    if (!message) {
      return NextResponse.json({ error: 'Suggestion message is required' }, { status: 400 });
    }

    if (message.length > 1200) {
      return NextResponse.json(
        { error: 'Suggestion message must be 1200 characters or less' },
        { status: 400 }
      );
    }

    const { suggestion, error } = await createTripSuggestion({
      share,
      tripId: share.trip_id,
      guestName,
      guestEmail,
      message,
    });

    if (error || !suggestion) {
      return NextResponse.json(
        { error: error?.message || 'Failed to submit suggestion' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, suggestion }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to submit suggestion' },
      { status: 500 }
    );
  }
}
