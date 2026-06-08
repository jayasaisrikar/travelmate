import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/services/supabase';
import { getAuthenticatedUser } from '@/services/supabase-auth';
import { touchTravelerLastSeen } from '@/services/social-activity';

function slugifyDestination(destination: string) {
  return destination
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// GET /api/social/signals — get current user's signals
export async function GET(request: NextRequest) {
  const { user, error } = await getAuthenticatedUser(request);
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error: dbError } = await supabase
    .from('traveler_trip_signals')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  await touchTravelerLastSeen(user.id);
  return NextResponse.json(data ?? []);
}

// POST /api/social/signals — publish a trip signal
export async function POST(request: NextRequest) {
  const { user, error } = await getAuthenticatedUser(request);
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({})) as {
    trip_id?: string;
    destination?: string;
    destination_slug?: string;
    travel_month?: string;
    is_public?: boolean;
  };

  if (!body.trip_id || !body.destination) {
    return NextResponse.json({ error: 'trip_id and destination are required' }, { status: 400 });
  }

  const { data: trip, error: tripError } = await supabase
    .from('trips')
    .select('id, destination')
    .eq('id', body.trip_id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (tripError) {
    return NextResponse.json({ error: tripError.message }, { status: 500 });
  }

  if (!trip) {
    return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
  }

  const destination = trip.destination;
  const signal = {
    user_id: user.id,
    trip_id: trip.id,
    destination,
    destination_slug: slugifyDestination(destination),
    travel_month: body.travel_month ?? null,
    is_public: body.is_public ?? false,
  };

  const { data: existing, error: existingError } = await supabase
    .from('traveler_trip_signals')
    .select('id')
    .eq('user_id', user.id)
    .eq('trip_id', trip.id)
    .maybeSingle();

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 500 });
  }

  const query = existing
    ? supabase.from('traveler_trip_signals').update(signal).eq('id', existing.id)
    : supabase.from('traveler_trip_signals').insert(signal);

  const { data, error: dbError } = await query.select().single();

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  await touchTravelerLastSeen(user.id);
  return NextResponse.json(data, { status: existing ? 200 : 201 });
}
