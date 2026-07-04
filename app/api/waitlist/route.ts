import { NextRequest, NextResponse } from 'next/server';

import { sendWaitlistConfirmationEmail } from '@/services/waitlist-email';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeField(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = normalizeField(body?.email).toLowerCase();

    if (!email || !EMAIL_PATTERN.test(email)) {
      return NextResponse.json({ error: 'A valid email is required' }, { status: 400 });
    }

    await sendWaitlistConfirmationEmail({ email });

    return NextResponse.json({
      success: true,
      message: "You're on the list — check your inbox.",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to join the waiting list' },
      { status: 500 }
    );
  }
}
