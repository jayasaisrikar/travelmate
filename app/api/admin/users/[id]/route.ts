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

    if (user.id === id) {
      return NextResponse.json({ error: 'You cannot delete the currently signed in admin' }, { status: 400 });
    }

    const { error } = await supabaseAdmin.auth.admin.deleteUser(id);

    if (error) {
      return NextResponse.json({ error: error.message || 'Failed to delete user' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete user' },
      { status: 500 }
    );
  }
}
