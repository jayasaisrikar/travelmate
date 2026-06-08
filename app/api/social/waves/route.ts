import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/services/supabase';
import { getAuthenticatedUser } from '@/services/supabase-auth';
import { touchTravelerLastSeen } from '@/services/social-activity';

const DAILY_WAVE_LIMIT = 10;

// GET /api/social/waves — list outgoing waves
export async function GET(request: NextRequest) {
  const { user, error } = await getAuthenticatedUser(request);
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error: dbError } = await supabase
    .from('traveler_connections')
    .select('*')
    .eq('from_user', user.id)
    .eq('status', 'wave');

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  await touchTravelerLastSeen(user.id);
  return NextResponse.json(data ?? []);
}

// POST /api/social/waves — send a wave
export async function POST(request: NextRequest) {
  const { user, error } = await getAuthenticatedUser(request);
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({})) as { to_user?: string };

  if (!body.to_user) {
    return NextResponse.json({ error: 'to_user is required' }, { status: 400 });
  }

  if (body.to_user === user.id) {
    return NextResponse.json({ error: 'You cannot wave at yourself' }, { status: 400 });
  }

  // Daily quota check
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const { count } = await supabase
    .from('traveler_connections')
    .select('id', { count: 'exact', head: true })
    .eq('from_user', user.id)
    .gte('created_at', startOfDay.toISOString());

  if ((count ?? 0) >= DAILY_WAVE_LIMIT) {
    return NextResponse.json(
      { error: `You can send at most ${DAILY_WAVE_LIMIT} waves per day` },
      { status: 429 }
    );
  }

  // Check if the other person already waved at us → auto-connect
  const { data: incoming } = await supabase
    .from('traveler_connections')
    .select('id, status')
    .eq('from_user', body.to_user)
    .eq('to_user', user.id)
    .maybeSingle();

  if (incoming && incoming.status === 'wave') {
    // Mutual wave → connect both rows
    await supabase
      .from('traveler_connections')
      .update({ status: 'connected' })
      .eq('id', incoming.id);

    const { data } = await supabase
      .from('traveler_connections')
      .upsert(
        { from_user: user.id, to_user: body.to_user, status: 'connected' },
        { onConflict: 'from_user,to_user' }
      )
      .select()
      .single();

    await touchTravelerLastSeen(user.id);
    return NextResponse.json({ ...data, auto_connected: true }, { status: 201 });
  }

  const { data, error: dbError } = await supabase
    .from('traveler_connections')
    .upsert(
      { from_user: user.id, to_user: body.to_user, status: 'wave' },
      { onConflict: 'from_user,to_user' }
    )
    .select()
    .single();

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  await touchTravelerLastSeen(user.id);
  return NextResponse.json(data, { status: 201 });
}
