import { NextRequest, NextResponse } from 'next/server';

import { sendPasswordResetEmail } from '@/services/auth-email';

function normalizeField(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = normalizeField(body?.email);

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    await sendPasswordResetEmail({ email });

    return NextResponse.json({
      success: true,
      message: 'If an account exists for that email, a password reset link has been sent.',
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send password reset email' },
      { status: 500 }
    );
  }
}
