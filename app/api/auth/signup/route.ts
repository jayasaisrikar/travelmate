import { NextRequest, NextResponse } from 'next/server';

import { sendSignupConfirmationEmail } from '@/services/auth-email';

function normalizeField(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = normalizeField(body?.email);
    const password = normalizeField(body?.password);

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    await sendSignupConfirmationEmail({ email, password });

    return NextResponse.json({
      success: true,
      message: 'Check your email to confirm your account, then log in.',
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send confirmation email' },
      { status: 500 }
    );
  }
}
