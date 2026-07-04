import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/services/supabase';
import { getAuthenticatedUser } from '@/services/supabase-auth';
import { activeTravelerCutoff, touchTravelerLastSeen } from '@/services/social-activity';

/**
 * GET /api/social/companions
 *
 * Query params:
 *   destination  — filter by slug
 *   limit        — default 20
 *   offset       — default 0
 *
 * Returns public travelers with their destination signal and the
 * caller's connection status toward each one.
 */
export async function GET(request: NextRequest) {
  const { user } = await getAuthenticatedUser(request);

  const { searchParams } = new URL(request.url);
  const destinationSlug = searchParams.get('destination');
  const limit  = Math.min(parseInt(searchParams.get('limit')  ?? '20', 10), 50);
  const offset = parseInt(searchParams.get('offset') ?? '0', 10);
  const cutoff = activeTravelerCutoff();

  // Fetch public signals first. traveler_trip_signals.user_id and
  // traveler_profiles.id both reference auth.users, so PostgREST cannot infer
  // a direct relationship for an embedded join.
  let signalQuery = supabase
    .from('traveler_trip_signals')
    .select(`
      id,
      destination,
      destination_slug,
      travel_month,
      user_id
    `)
    .eq('is_public', true)
    .gte('created_at', cutoff)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (destinationSlug) {
    signalQuery = signalQuery.eq('destination_slug', destinationSlug);
  }

  const { data: signals, error } = await signalQuery;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!signals || signals.length === 0) {
    return NextResponse.json([]);
  }

  // Fetch connection statuses for the current user in a single query
  const userIds = [...new Set(signals.map(s => s.user_id))];
  const { data: profiles, error: profilesError } = await supabase
    .from('traveler_profiles')
    .select('id, display_name, avatar_url, bio, travel_style, is_public, verified, verification_provider, verification_level, verification_status, verified_at, last_seen_at, created_at')
    .in('id', userIds)
    .eq('is_public', true)
    .gte('last_seen_at', cutoff);

  if (profilesError) {
    return NextResponse.json({ error: profilesError.message }, { status: 500 });
  }

  const profileMap = new Map((profiles ?? []).map(profile => [profile.id, profile]));
  const connectionMap: Record<string, string> = {};

  if (user && userIds.length > 0) {
    const { data: connections } = await supabase
      .from('traveler_connections')
      .select('from_user, to_user, status')
      .or(
        `and(from_user.eq.${user.id},to_user.in.(${userIds.join(',')})),` +
        `and(to_user.eq.${user.id},from_user.in.(${userIds.join(',')}))`
      );

    for (const conn of connections ?? []) {
      const otherId = conn.from_user === user.id ? conn.to_user : conn.from_user;
      if (conn.status === 'wave') {
        connectionMap[otherId] = conn.from_user === user.id ? 'wave_sent' : 'wave_received';
      } else {
        connectionMap[otherId] = conn.status;
      }
    }
  }

  const travelers = signals.flatMap(signal => {
    const profile = profileMap.get(signal.user_id);
    return profile ? [{
      ...profile,
      signal_id: signal.id,
      destination: signal.destination,
      destination_slug: signal.destination_slug,
      travel_month: signal.travel_month,
      connection_status: connectionMap[signal.user_id] ?? 'none',
      is_self: signal.user_id === user?.id,
    }] : [];
  });

  if (user) {
    await touchTravelerLastSeen(user.id);
  }
  return NextResponse.json(travelers);
}
