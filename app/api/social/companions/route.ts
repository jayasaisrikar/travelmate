import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/services/supabase';
import { getAuthenticatedUser } from '@/services/supabase-auth';
import { activeTravelerCutoff, touchTravelerLastSeen } from '@/services/social-activity';
import { scoreMatch, type MatchInput } from '@/services/tripmate-matching';
import { toMatchInput } from '@/services/social-requests';
import type { ConnectionStatus } from '@/services/social';

const PROFILE_FIELDS =
  'id, display_name, avatar_url, bio, travel_style, interests, languages, budget_preference, pace_preference, is_public, verified, verification_provider, verification_level, verification_status, verified_at, last_seen_at, created_at';

/**
 * GET /api/social/companions
 *
 * Query params: destination (slug) · limit (default 20) · offset (default 0)
 *
 * Returns public travellers with their destination signal, the caller's
 * connection status, and a Matching Algorithm v1 score relative to the
 * caller's own trips. Blocked travellers are excluded entirely (PRD §10.5).
 */
export async function GET(request: NextRequest) {
  const { user } = await getAuthenticatedUser(request);

  const { searchParams } = new URL(request.url);
  const destinationSlug = searchParams.get('destination');
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 50);
  const offset = parseInt(searchParams.get('offset') ?? '0', 10);
  const cutoff = activeTravelerCutoff();

  let signalQuery = supabase
    .from('traveler_trip_signals')
    .select('id, destination, destination_slug, travel_month, date_start, date_end, interests, user_id')
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

  const userIds = [...new Set(signals.map(s => s.user_id))];
  const { data: profiles, error: profilesError } = await supabase
    .from('traveler_profiles')
    .select(PROFILE_FIELDS)
    .in('id', userIds)
    .eq('is_public', true)
    .gte('last_seen_at', cutoff);

  if (profilesError) {
    return NextResponse.json({ error: profilesError.message }, { status: 500 });
  }

  const profileMap = new Map((profiles ?? []).map(profile => [profile.id, profile]));

  // ── Connection + request state for the caller ──
  const connectionMap: Record<string, ConnectionStatus> = {};
  const blockedIds = new Set<string>();

  // The caller's own profile + signals power the match scoring.
  let viewerProfile: Record<string, unknown> | null = null;
  const viewerSignalsBySlug = new Map<string, MatchInput>();

  if (user && userIds.length > 0) {
    const [{ data: connections }, { data: requests }, { data: myProfile }, { data: mySignals }] =
      await Promise.all([
        supabase
          .from('traveler_connections')
          .select('from_user, to_user, status')
          .or(
            `and(from_user.eq.${user.id},to_user.in.(${userIds.join(',')})),` +
              `and(to_user.eq.${user.id},from_user.in.(${userIds.join(',')}))`
          ),
        supabase
          .from('tripmate_requests')
          .select('from_user, to_user, status')
          .eq('status', 'pending')
          .or(
            `and(from_user.eq.${user.id},to_user.in.(${userIds.join(',')})),` +
              `and(to_user.eq.${user.id},from_user.in.(${userIds.join(',')}))`
          ),
        supabase
          .from('traveler_profiles')
          .select('interests, languages, budget_preference, pace_preference, verification_level')
          .eq('id', user.id)
          .maybeSingle(),
        supabase
          .from('traveler_trip_signals')
          .select('destination_slug, travel_month, date_start, date_end, interests')
          .eq('user_id', user.id),
      ]);

    for (const conn of connections ?? []) {
      const otherId = conn.from_user === user.id ? conn.to_user : conn.from_user;
      if (conn.status === 'blocked') {
        blockedIds.add(otherId);
        connectionMap[otherId] = 'blocked';
      } else if (conn.status === 'connected') {
        connectionMap[otherId] = 'connected';
      }
    }

    // Pending requests only fill the slot if not already connected/blocked.
    for (const req of (requests ?? []) as { from_user: string; to_user: string }[]) {
      const outgoing = req.from_user === user.id;
      const otherId = outgoing ? req.to_user : req.from_user;
      if (!connectionMap[otherId]) {
        connectionMap[otherId] = outgoing ? 'request_sent' : 'request_received';
      }
    }

    viewerProfile = myProfile ?? null;
    for (const sig of mySignals ?? []) {
      if (sig.destination_slug) {
        viewerSignalsBySlug.set(sig.destination_slug, toMatchInput(myProfile, sig));
      }
    }
  }

  const travelers = signals.flatMap(signal => {
    const profile = profileMap.get(signal.user_id);
    if (!profile) return [];
    if (blockedIds.has(signal.user_id)) return []; // hide blocked travellers

    const isSelf = signal.user_id === user?.id;

    // Score against the viewer's signal for this destination, falling back to
    // a profile-only comparison (destination still matches via the slug).
    let matchScore: number | null = null;
    let matchReasons: string[] = [];
    if (user && !isSelf && (viewerProfile || viewerSignalsBySlug.size > 0)) {
      const viewerInput: MatchInput =
        viewerSignalsBySlug.get(signal.destination_slug) ??
        toMatchInput(viewerProfile, { destination_slug: signal.destination_slug });
      const result = scoreMatch(viewerInput, toMatchInput(profile, signal));
      matchScore = result.score;
      matchReasons = result.reasons;
    }

    return [{
      ...profile,
      signal_id: signal.id,
      destination: signal.destination,
      destination_slug: signal.destination_slug,
      travel_month: signal.travel_month,
      connection_status: connectionMap[signal.user_id] ?? 'none',
      match_score: matchScore,
      match_reasons: matchReasons,
      is_self: isSelf,
    }];
  });

  // Best matches first (self/unscored fall to natural order at the end).
  travelers.sort((a, b) => (b.match_score ?? -1) - (a.match_score ?? -1));

  if (user) {
    await touchTravelerLastSeen(user.id);
  }
  return NextResponse.json(travelers);
}
