import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/services/supabase';
import { getAuthenticatedUser } from '@/services/supabase-auth';

// POST /api/social/rooms/[id]/leave
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await getAuthenticatedUser(request);
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  // If user is the host and there are other members, transfer host or close room
  const { data: membership } = await supabase
    .from('trip_room_members')
    .select('role')
    .eq('room_id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!membership) {
    return NextResponse.json({ error: 'You are not a member of this room' }, { status: 404 });
  }

  await supabase
    .from('trip_room_members')
    .delete()
    .eq('room_id', id)
    .eq('user_id', user.id);

  // If the host left, promote the next member or close the room
  if (membership.role === 'host') {
    const { data: remaining } = await supabase
      .from('trip_room_members')
      .select('user_id')
      .eq('room_id', id)
      .limit(1);

    if (remaining && remaining.length > 0) {
      await supabase
        .from('trip_room_members')
        .update({ role: 'host' })
        .eq('room_id', id)
        .eq('user_id', remaining[0].user_id);
    } else {
      // No one left — close the room
      await supabase
        .from('trip_rooms')
        .update({ is_open: false })
        .eq('id', id);
    }
  }

  return NextResponse.json({ left: true });
}
