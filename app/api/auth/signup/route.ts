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

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    if (!password) {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 });
    }

    const result = await sendSignupConfirmationEmail({
      email,
      password,
    });

    return NextResponse.json({
      success: true,
      message: 'Check your email to confirm your account.',
      redirectTo: result.redirectTo,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create account' },
      { status: 500 }
    );
  }
}
