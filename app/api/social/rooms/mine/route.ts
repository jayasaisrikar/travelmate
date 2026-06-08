import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/services/supabase';
import { getAuthenticatedUser } from '@/services/supabase-auth';
import { touchTravelerLastSeen } from '@/services/social-activity';

// GET /api/social/rooms/mine
export async function GET(request: NextRequest) {
  const { user, error } = await getAuthenticatedUser(request);
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: memberships, error: membershipsError } = await supabase
    .from('trip_room_members')
    .select('room_id, role, joined_at')
    .eq('user_id', user.id)
    .order('joined_at', { ascending: false });

  if (membershipsError) {
    return NextResponse.json({ error: membershipsError.message }, { status: 500 });
  }

  const roomIds = [...new Set((memberships ?? []).map(membership => membership.room_id))];
  if (roomIds.length === 0) {
    return NextResponse.json([]);
  }

  const { data: rooms, error: roomsError } = await supabase
    .from('trip_rooms')
    .select('*')
    .in('id', roomIds)
    .order('created_at', { ascending: false });

  if (roomsError) {
    return NextResponse.json({ error: roomsError.message }, { status: 500 });
  }

  const { data: memberRows, error: countsError } = await supabase
    .from('trip_room_members')
    .select('room_id')
    .in('room_id', roomIds);

  if (countsError) {
    return NextResponse.json({ error: countsError.message }, { status: 500 });
  }

  const roleMap = new Map((memberships ?? []).map(membership => [membership.room_id, membership.role]));
  const countMap = new Map<string, number>();

  for (const row of memberRows ?? []) {
    countMap.set(row.room_id, (countMap.get(row.room_id) ?? 0) + 1);
  }

  await touchTravelerLastSeen(user.id);
  return NextResponse.json(
    (rooms ?? []).map(room => ({
      ...room,
      member_count: countMap.get(room.id) ?? 0,
      is_member: true,
      current_user_role: roleMap.get(room.id) ?? null,
    }))
  );
}
