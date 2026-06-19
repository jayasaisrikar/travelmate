import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/services/supabase';
import { getAuthenticatedUser } from '@/services/supabase-auth';
import { touchTravelerLastSeen } from '@/services/social-activity';

const SELECT = 'id, from_user, to_user, reason, message, status, match_score, expires_at, created_at';

// PATCH /api/social/requests/[id] — accept | decline | cancel
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await getAuthenticatedUser(request);
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as { action?: string };
  const action = body.action;

  if (!action || !['accept', 'decline', 'cancel'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  const { data: existing, error: fetchError } = await supabase
    .from('tripmate_requests')
    .select(SELECT)
    .eq('id', id)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }
  if (!existing) {
    return NextResponse.json({ error: 'Request not found' }, { status: 404 });
  }

  // Permission + transition rules.
  if (action === 'cancel') {
    if (existing.from_user !== user.id) {
      return NextResponse.json({ error: 'Only the sender can cancel this request' }, { status: 403 });
    }
  } else if (existing.to_user !== user.id) {
    return NextResponse.json({ error: 'Only the recipient can respond to this request' }, { status: 403 });
  }

  if (existing.status !== 'pending') {
    return NextResponse.json(
      { error: `This request is already ${existing.status}` },
      { status: 409 }
    );
  }

  const nextStatus = action === 'accept' ? 'accepted' : action === 'decline' ? 'declined' : 'cancelled';

  const { data: updated, error: updateError } = await supabase
    .from('tripmate_requests')
    .update({ status: nextStatus })
    .eq('id', id)
    .select(SELECT)
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Accepting creates a mutual connection → unlocks messaging (PRD §13).
  if (action === 'accept') {
    await supabase.from('traveler_connections').upsert(
      [
        { from_user: existing.from_user, to_user: existing.to_user, status: 'connected' },
        { from_user: existing.to_user, to_user: existing.from_user, status: 'connected' },
      ],
      { onConflict: 'from_user,to_user' }
    );
  }

  // Shape the counterpart for the response.
  const counterpartId = updated.from_user === user.id ? updated.to_user : updated.from_user;
  const { data: counterpart } = await supabase
    .from('traveler_profiles')
    .select('id, display_name, avatar_url, verified, verification_level')
    .eq('id', counterpartId)
    .maybeSingle();

  await touchTravelerLastSeen(user.id);
  return NextResponse.json({
    ...updated,
    direction: updated.from_user === user.id ? 'outgoing' : 'incoming',
    counterpart: counterpart ?? null,
  });
}
