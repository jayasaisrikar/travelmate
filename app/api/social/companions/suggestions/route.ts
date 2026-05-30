import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/services/supabase';
import { getAuthenticatedUser } from '@/services/supabase-auth';

/**
 * GET /api/social/companions/suggestions?limit=6
 *
 * Returns travelers going to the same destinations as the current user.
 * Falls back to any recent travelers if the user has no signals.
 */
export async function GET(request: NextRequest) {
  const { user, error } = await getAuthenticatedUser(request);
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '6', 10), 20);

  // Get destinations this user is signalling
  const { data: mySignals } = await supabase
    .from('traveler_trip_signals')
    .select('destination_slug')
    .eq('user_id', user.id);

  const mySlugs = [...new Set((mySignals ?? []).map(s => s.destination_slug))];

  let query = supabase
    .from('traveler_trip_signals')
    .select(`
      id,
      destination,
      destination_slug,
      travel_month,
      user_id
    `)
    .eq('is_public', true)
    .neq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (mySlugs.length > 0) {
    query = query.in('destination_slug', mySlugs);
  }

  const { data, error: dbError } = await query;

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  const signals = data ?? [];
  const userIds = [...new Set(signals.map(signal => signal.user_id))];
  const { data: profiles, error: profilesError } = userIds.length > 0
    ? await supabase
      .from('traveler_profiles')
      .select('id, display_name, avatar_url, bio, travel_style, is_public, verified, last_seen_at, created_at')
      .in('id', userIds)
      .eq('is_public', true)
    : { data: [], error: null };

  if (profilesError) {
    return NextResponse.json({ error: profilesError.message }, { status: 500 });
  }

  const profileMap = new Map((profiles ?? []).map(profile => [profile.id, profile]));
  const travelers = signals.flatMap(signal => {
    const profile = profileMap.get(signal.user_id);
    return profile ? [{
      ...profile,
      signal_id: signal.id,
      destination: signal.destination,
      destination_slug: signal.destination_slug,
      travel_month: signal.travel_month,
      connection_status: 'none' as const,
      is_self: false,
    }] : [];
  });

  return NextResponse.json(travelers);
}
