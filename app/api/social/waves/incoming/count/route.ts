import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/services/supabase';
import { getAuthenticatedUser } from '@/services/supabase-auth';

// GET /api/social/waves/incoming/count
export async function GET(request: NextRequest) {
  const { user, error } = await getAuthenticatedUser(request);
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { count, error: dbError } = await supabase
    .from('traveler_connections')
    .select('id', { count: 'exact', head: true })
    .eq('to_user', user.id)
    .eq('status', 'wave');

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json({ count: count ?? 0 });
}
