import { NextRequest, NextResponse } from 'next/server';

import { assertAdminCredentials } from '@/services/admin-access';
import { ensureAdminUser } from '@/services/admin-bootstrap';

function normalizeField(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = normalizeField(body?.email);
    const password = normalizeField(body?.password);

    assertAdminCredentials(email, password);

    const user = await ensureAdminUser();

    return NextResponse.json({
      success: true,
      email: user.email,
      id: user.id,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to bootstrap admin account';
    const status = message === 'Invalid admin credentials' ? 403 : 500;
    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}
