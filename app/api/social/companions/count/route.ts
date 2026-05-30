import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/services/supabase';

// GET /api/social/companions/count?destination=<slug>
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const destinationSlug = searchParams.get('destination');

  if (!destinationSlug) {
    return NextResponse.json({ error: 'destination param required' }, { status: 400 });
  }

  const { data: signals, error } = await supabase
    .from('traveler_trip_signals')
    .select('user_id')
    .eq('destination_slug', destinationSlug)
    .eq('is_public', true);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const userIds = [...new Set((signals ?? []).map(signal => signal.user_id))];
  if (userIds.length === 0) {
    return NextResponse.json({ count: 0 });
  }

  const { count, error: profilesError } = await supabase
    .from('traveler_profiles')
    .select('id', { count: 'exact', head: true })
    .in('id', userIds)
    .eq('is_public', true);

  if (profilesError) {
    return NextResponse.json({ error: profilesError.message }, { status: 500 });
  }

  return NextResponse.json({ count: count ?? 0 });
}
