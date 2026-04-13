import { randomUUID } from 'crypto';

import { NextRequest, NextResponse } from 'next/server';

import { getAuthenticatedUser } from '@/services/supabase-auth';
import {
  normalizeImportedBookingConfirmation,
  parseBookingConfirmationEmail,
} from '@/services/booking-confirmation';
import { createTripFromConfirmation } from '@/services/booking-import';
import { loadTravelerPreferences } from '@/services/traveler-preferences';

function unauthorizedResponse(message = 'Unauthorized') {
  return NextResponse.json({ error: message }, { status: 401 });
}

export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(request);

    if (authError || !user) {
      return unauthorizedResponse();
    }

    const body = await request.json().catch(() => ({}));
    const parsedConfirmation =
      normalizeImportedBookingConfirmation(body?.parsedConfirmation) ??
      (await parseBookingConfirmationEmail({
        subject: typeof body?.subject === 'string' ? body.subject : null,
        from: typeof body?.from === 'string' ? body.from : null,
        text: typeof body?.text === 'string' ? body.text : null,
        html: typeof body?.html === 'string' ? body.html : null,
        receivedAt: typeof body?.receivedAt === 'string' ? body.receivedAt : null,
        medium: 'manual',
      }));

    if (!parsedConfirmation.destinationName) {
      return NextResponse.json({ error: 'No destination could be parsed from the confirmation email' }, { status: 400 });
    }

    const preferences = await loadTravelerPreferences(user.id);
    const tripId = typeof body?.tripId === 'string' && body.tripId.trim() ? body.tripId.trim() : randomUUID();
    const imported = await createTripFromConfirmation({
      userId: user.id,
      userEmail: user.email ?? null,
      tripId,
      confirmation: parsedConfirmation,
      preferences,
    });

    return NextResponse.json({
      success: true,
      parsedConfirmation,
      trip: imported.trip,
      share: imported.share,
      shareUrl: imported.share
        ? `${new URL(request.url).origin}/share/${encodeURIComponent(imported.share.token)}`
        : null,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to import booking confirmation' },
      { status: 500 }
    );
  }
}
