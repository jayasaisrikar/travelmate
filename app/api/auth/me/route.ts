import { NextRequest, NextResponse } from 'next/server';

import { getAuthenticatedUser } from '@/services/supabase-auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const { user, isAdmin, error } = await getAuthenticatedUser(request);

  if (error || !user) {
    return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      email_confirmed_at: user.email_confirmed_at,
      last_sign_in_at: user.last_sign_in_at,
      created_at: user.created_at,
    },
    isAdmin,
  });
}
