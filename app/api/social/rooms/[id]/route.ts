import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/services/supabase';
import { getAuthenticatedUser } from '@/services/supabase-auth';
import { touchTravelerLastSeen } from '@/services/social-activity';

// GET /api/social/rooms/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { user } = await getAuthenticatedUser(request);

  const { data: room, error } = await supabase
    .from('trip_rooms')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !room) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 });
  }

  const { data: members } = await supabase
    .from('trip_room_members')
    .select('room_id, user_id, role, joined_at')
    .eq('room_id', id);

  const memberRows = members ?? [];
  const memberIds = memberRows.map(member => member.user_id);
  const { data: profiles, error: profilesError } = memberIds.length > 0
    ? await supabase
      .from('traveler_profiles')
      .select('id, display_name, avatar_url, bio, travel_style, verified, verification_provider, verification_level, verification_status, verified_at')
      .in('id', memberIds)
    : { data: [], error: null };

  if (profilesError) {
    return NextResponse.json({ error: profilesError.message }, { status: 500 });
  }

  const profileMap = new Map((profiles ?? []).map(profile => [profile.id, profile]));
  const roomMembers = memberRows.map(member => ({
    ...member,
    profile: profileMap.get(member.user_id) ?? null,
    is_self: member.user_id === user?.id,
  }));
  const isMember = user
    ? roomMembers.some(member => member.user_id === user.id)
    : false;
  const currentUserRole = user
    ? roomMembers.find(member => member.user_id === user.id)?.role ?? null
    : null;

  if (user?.id) {
    await touchTravelerLastSeen(user.id);
  }

  return NextResponse.json({
    ...room,
    member_count: roomMembers.length,
    members: roomMembers,
    is_member: isMember,
    current_user_role: currentUserRole,
  });
}
