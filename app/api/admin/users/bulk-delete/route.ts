import { NextRequest, NextResponse } from 'next/server';

import { isAdminEmail } from '@/services/admin-access';
import { getAuthenticatedUser } from '@/services/supabase-auth';
import { supabaseAdmin } from '@/services/supabase-admin';

function unauthorizedResponse(message = 'Unauthorized') {
  return NextResponse.json({ error: message }, { status: 401 });
}

function normalizeIds(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .map(item => (typeof item === 'string' ? item.trim() : ''))
        .filter(Boolean)
    )
  );
}

export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(request);

    if (authError || !user || !isAdminEmail(user.email)) {
      return unauthorizedResponse('Admin access required');
    }

    const body = await request.json().catch(() => ({}));
    const ids = normalizeIds(body?.ids);
    const targetIds = ids.filter(id => id !== user.id);

    if (targetIds.length === 0) {
      return NextResponse.json({ error: 'Select at least one user to delete' }, { status: 400 });
    }

    const settled = await Promise.allSettled(
      targetIds.map(async id => {
        const { error } = await supabaseAdmin.auth.admin.deleteUser(id);

        if (error) {
          throw new Error(error.message || `Failed to delete user ${id}`);
        }

        return id;
      })
    );

    const deletedIds: string[] = [];
    const failed: Array<{ id: string; error: string }> = [];

    settled.forEach((result, index) => {
      const id = targetIds[index];

      if (result.status === 'fulfilled') {
        deletedIds.push(id);
        return;
      }

      failed.push({
        id,
        error: result.reason instanceof Error ? result.reason.message : `Failed to delete user ${id}`,
      });
    });

    return NextResponse.json({
      success: true,
      deletedIds,
      failed,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete users' },
      { status: 500 }
    );
  }
}
