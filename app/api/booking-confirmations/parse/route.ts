import { NextRequest, NextResponse } from 'next/server';

import { getAuthenticatedUser } from '@/services/supabase-auth';
import { parseBookingConfirmationEmail } from '@/services/booking-confirmation';

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
    const parsedConfirmation = await parseBookingConfirmationEmail({
      subject: typeof body?.subject === 'string' ? body.subject : null,
      from: typeof body?.from === 'string' ? body.from : null,
      text: typeof body?.text === 'string' ? body.text : null,
      html: typeof body?.html === 'string' ? body.html : null,
      receivedAt: typeof body?.receivedAt === 'string' ? body.receivedAt : null,
      medium: 'manual',
    });

    return NextResponse.json({
      success: true,
      parsedConfirmation,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to parse booking confirmation' },
      { status: 500 }
    );
  }
}
