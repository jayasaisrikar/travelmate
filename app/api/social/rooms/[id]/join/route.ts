import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/services/supabase';
import { getAuthenticatedUser } from '@/services/supabase-auth';
import { touchTravelerLastSeen } from '@/services/social-activity';

// POST /api/social/rooms/[id]/join
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await getAuthenticatedUser(request);
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const { data: room } = await supabase
    .from('trip_rooms')
    .select('id, is_open, max_members')
    .eq('id', id)
    .single();

  if (!room) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 });
  }

  if (!room.is_open) {
    return NextResponse.json({ error: 'This room is no longer accepting members' }, { status: 409 });
  }

  const { data: existingMembership, error: membershipError } = await supabase
    .from('trip_room_members')
    .select('role')
    .eq('room_id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (membershipError) {
    return NextResponse.json({ error: membershipError.message }, { status: 500 });
  }

  if (existingMembership) {
    await touchTravelerLastSeen(user.id);
    return NextResponse.json({
      joined: true,
      already_joined: true,
      role: existingMembership.role,
    });
  }

  const { count } = await supabase
    .from('trip_room_members')
    .select('user_id', { count: 'exact', head: true })
    .eq('room_id', id);

  if ((count ?? 0) >= room.max_members) {
    return NextResponse.json({ error: 'This room is full' }, { status: 409 });
  }

  const { error: insertError } = await supabase
    .from('trip_room_members')
    .insert({ room_id: id, user_id: user.id, role: 'member' });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  await touchTravelerLastSeen(user.id);
  return NextResponse.json({ joined: true, already_joined: false, role: 'member' });
}
