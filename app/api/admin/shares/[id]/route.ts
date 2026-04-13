import { NextRequest, NextResponse } from 'next/server';

import { isAdminEmail } from '@/services/admin-access';
import { getAuthenticatedUser } from '@/services/supabase-auth';
import { supabaseAdmin } from '@/services/supabase-admin';

function unauthorizedResponse(message = 'Unauthorized') {
  return NextResponse.json({ error: message }, { status: 401 });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { user, error: authError } = await getAuthenticatedUser(request);

    if (authError || !user || !isAdminEmail(user.email)) {
      return unauthorizedResponse('Admin access required');
    }

    const { data, error } = await supabaseAdmin
      .from('trip_shares')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', id)
      .select('id')
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json({ error: error?.message || 'Share not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to revoke share' },
      { status: 500 }
    );
  }
}
