import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/services/supabase';
import { getAuthenticatedUser } from '@/services/supabase-auth';
import { touchTravelerLastSeen } from '@/services/social-activity';

// GET /api/social/rooms?destination=<slug>
export async function GET(request: NextRequest) {
  const { user } = await getAuthenticatedUser(request);
  const { searchParams } = new URL(request.url);
  const destinationSlug = searchParams.get('destination');

  let query = supabase
    .from('trip_rooms')
    .select(
      `
      *
    `
    )
    .eq('is_open', true)
    .order('created_at', { ascending: false })
    .limit(30);

  if (destinationSlug) {
    query = query.eq('destination_slug', destinationSlug);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const roomRows = data ?? [];
  const roomIds = roomRows.map(room => room.id);
  const { data: membershipCounts, error: countsError } = roomIds.length > 0
    ? await supabase
      .from('trip_room_members')
      .select('room_id')
      .in('room_id', roomIds)
    : { data: [], error: null };

  if (countsError) {
    return NextResponse.json({ error: countsError.message }, { status: 500 });
  }

  const { data: memberships, error: membershipsError } = user && roomIds.length > 0
    ? await supabase
      .from('trip_room_members')
      .select('room_id, role')
      .eq('user_id', user.id)
      .in('room_id', roomIds)
    : { data: [], error: null };

  if (membershipsError) {
    return NextResponse.json({ error: membershipsError.message }, { status: 500 });
  }

  const membershipMap = new Map((memberships ?? []).map(membership => [membership.room_id, membership.role]));
  const memberCountMap = new Map<string, number>();

  for (const membership of membershipCounts ?? []) {
    memberCountMap.set(membership.room_id, (memberCountMap.get(membership.room_id) ?? 0) + 1);
  }

  const rooms = roomRows.map(room => ({
    ...room,
    member_count: memberCountMap.get(room.id) ?? 0,
    is_member: membershipMap.has(room.id),
    current_user_role: membershipMap.get(room.id) ?? null,
  }));

  if (user?.id) {
    await touchTravelerLastSeen(user.id);
  }

  return NextResponse.json(rooms);
}

// POST /api/social/rooms — create a new room
export async function POST(request: NextRequest) {
  const { user, error } = await getAuthenticatedUser(request);
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({})) as {
    destination?: string;
    destination_slug?: string;
    title?: string;
    travel_month?: string;
  };

  if (!body.destination || !body.destination_slug) {
    return NextResponse.json({ error: 'destination and destination_slug are required' }, { status: 400 });
  }

  const { data: room, error: roomError } = await supabase
    .from('trip_rooms')
    .insert({
      created_by: user.id,
      destination: body.destination,
      destination_slug: body.destination_slug,
      title: body.title ?? `Trip to ${body.destination}`,
      travel_month: body.travel_month ?? null,
    })
    .select()
    .single();

  if (roomError) {
    return NextResponse.json({ error: roomError.message }, { status: 500 });
  }

  // Auto-add creator as host
  const { error: hostError } = await supabase.from('trip_room_members').insert({
    room_id: room.id,
    user_id: user.id,
    role: 'host',
  });

  if (hostError) {
    await supabase.from('trip_rooms').delete().eq('id', room.id);
    return NextResponse.json({ error: hostError.message }, { status: 500 });
  }

  await touchTravelerLastSeen(user.id);
  return NextResponse.json({
    ...room,
    member_count: 1,
    is_member: true,
    current_user_role: 'host',
  }, { status: 201 });
}
