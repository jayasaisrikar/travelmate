import { NextRequest, NextResponse } from 'next/server';

import { getAuthenticatedUser } from '@/services/supabase-auth';
import { isAdminEmail } from '@/services/admin-access';
import { loadAdminDashboardOverview } from '@/services/admin-dashboard';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function unauthorizedResponse(message = 'Unauthorized') {
  return NextResponse.json({ error: message }, { status: 401 });
}

export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(request);

    if (authError || !user || !isAdminEmail(user.email)) {
      return unauthorizedResponse('Admin access required');
    }

    const baseUrl = new URL(request.url).origin;
    const overview = await loadAdminDashboardOverview(baseUrl);

    return NextResponse.json(overview);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load admin dashboard' },
      { status: 500 }
    );
  }
}
