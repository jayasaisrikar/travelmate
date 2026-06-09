import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/services/supabase';
import { activeTravelerCutoff } from '@/services/social-activity';

type DestinationPulse = {
  destination: string;
  destination_slug: string;
  traveler_count: number;
  room_count: number;
  travel_months: string[];
  recent_travelers: Array<{
    id: string;
    display_name: string | null;
    avatar_url: string | null;
    verified: boolean;
  }>;
};

type DestinationPulseAccumulator = DestinationPulse & {
  traveler_ids: Set<string>;
};

// GET /api/social/destinations?limit=6
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '6', 10), 12);
  const cutoff = activeTravelerCutoff();

  const { data: signals, error: signalsError } = await supabase
    .from('traveler_trip_signals')
    .select('destination, destination_slug, travel_month, user_id, created_at')
    .eq('is_public', true)
    .gte('created_at', cutoff)
    .order('created_at', { ascending: false })
    .limit(300);

  if (signalsError) {
    return NextResponse.json({ error: signalsError.message }, { status: 500 });
  }

  const userIds = [...new Set((signals ?? []).map(signal => signal.user_id))];
  const { data: profiles, error: profilesError } = userIds.length > 0
    ? await supabase
      .from('traveler_profiles')
      .select('id, display_name, avatar_url, verified, verification_provider, verification_level, verification_status, verified_at, is_public, last_seen_at')
      .in('id', userIds)
      .eq('is_public', true)
      .gte('last_seen_at', cutoff)
    : { data: [], error: null };

  if (profilesError) {
    return NextResponse.json({ error: profilesError.message }, { status: 500 });
  }

  const { data: rooms, error: roomsError } = await supabase
    .from('trip_rooms')
    .select('destination_slug')
    .eq('is_open', true)
    .gte('created_at', cutoff);

  if (roomsError) {
    return NextResponse.json({ error: roomsError.message }, { status: 500 });
  }

  const profileMap = new Map((profiles ?? []).map(profile => [profile.id, profile]));
  const destinationMap = new Map<string, DestinationPulseAccumulator>();
  const roomCountMap = new Map<string, number>();

  for (const room of rooms ?? []) {
    roomCountMap.set(room.destination_slug, (roomCountMap.get(room.destination_slug) ?? 0) + 1);
  }

  for (const signal of signals ?? []) {
    const profile = profileMap.get(signal.user_id);
    if (!profile) {
      continue;
    }

    const current: DestinationPulseAccumulator = destinationMap.get(signal.destination_slug) ?? {
      destination: signal.destination,
      destination_slug: signal.destination_slug,
      traveler_count: 0,
      room_count: 0,
      travel_months: [],
      recent_travelers: [],
      traveler_ids: new Set<string>(),
    };

    current.room_count = roomCountMap.get(signal.destination_slug) ?? 0;
    current.traveler_ids.add(profile.id);
    current.traveler_count = current.traveler_ids.size;

    if (signal.travel_month && !current.travel_months.includes(signal.travel_month)) {
      current.travel_months.push(signal.travel_month);
    }

    if (current.recent_travelers.length < 3 && !current.recent_travelers.some(traveler => traveler.id === profile.id)) {
      current.recent_travelers.push({
        id: profile.id,
        display_name: profile.display_name,
        avatar_url: profile.avatar_url,
        verified: profile.verified,
      });
    }

    destinationMap.set(signal.destination_slug, current);
  }

  const pulses = [...destinationMap.values()]
    .sort((a, b) => {
      if (b.traveler_count !== a.traveler_count) {
        return b.traveler_count - a.traveler_count;
      }

      if (b.room_count !== a.room_count) {
        return b.room_count - a.room_count;
      }

      return a.destination.localeCompare(b.destination);
    })
    .slice(0, limit)
    .map(pulse => {
      const { traveler_ids, ...rest } = pulse;
      void traveler_ids;

      return {
        ...rest,
        travel_months: rest.travel_months.slice(0, 3),
      };
    });

  return NextResponse.json(pulses);
}
