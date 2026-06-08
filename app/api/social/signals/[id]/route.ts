import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/services/supabase';
import { getAuthenticatedUser } from '@/services/supabase-auth';

// DELETE /api/social/signals/[id] — retract a signal
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await getAuthenticatedUser(request);
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const { error: dbError } = await supabase
    .from('traveler_trip_signals')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id); // ensure ownership

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return new NextResponse(null, { status: 204 });
}
