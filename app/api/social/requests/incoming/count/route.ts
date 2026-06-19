import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/services/supabase';
import { getAuthenticatedUser } from '@/services/supabase-auth';

// GET /api/social/requests/incoming/count — pending requests awaiting my response
export async function GET(request: NextRequest) {
  const { user, error } = await getAuthenticatedUser(request);
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { count, error: dbError } = await supabase
    .from('tripmate_requests')
    .select('id', { count: 'exact', head: true })
    .eq('to_user', user.id)
    .eq('status', 'pending');

  if (dbError) {
    // Table not migrated yet → treat as zero rather than erroring the nav.
    return NextResponse.json({ count: 0 });
  }

  return NextResponse.json({ count: count ?? 0 });
}
