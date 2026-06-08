import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/services/supabase';
import { getAuthenticatedUser } from '@/services/supabase-auth';
import { touchTravelerLastSeen } from '@/services/social-activity';

// DELETE /api/social/waves/[userId] — retract a wave
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { user, error } = await getAuthenticatedUser(request);
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { userId } = await params;

  const { error: dbError } = await supabase
    .from('traveler_connections')
    .delete()
    .eq('from_user', user.id)
    .eq('to_user', userId)
    .eq('status', 'wave');

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  await touchTravelerLastSeen(user.id);
  return new NextResponse(null, { status: 204 });
}

// POST /api/social/waves/[userId]/accept — upgrade incoming wave to connected
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { user, error } = await getAuthenticatedUser(request);
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { userId } = await params;

  const { error: dbError } = await supabase
    .from('traveler_connections')
    .update({ status: 'connected' })
    .eq('from_user', userId)
    .eq('to_user', user.id)
    .eq('status', 'wave');

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  // Upsert the reverse direction too
  await supabase.from('traveler_connections').upsert(
    { from_user: user.id, to_user: userId, status: 'connected' },
    { onConflict: 'from_user,to_user' }
  );

  await touchTravelerLastSeen(user.id);
  return NextResponse.json({ connected: true });
}
