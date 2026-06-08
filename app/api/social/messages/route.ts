import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/services/supabase';
import { getAuthenticatedUser } from '@/services/supabase-auth';
import { touchTravelerLastSeen } from '@/services/social-activity';

const DAILY_MESSAGE_LIMIT = 20;
const MAX_MESSAGE_LENGTH = 500;

function messageError(error: { code?: string; message?: string } | null | undefined) {
  if (error?.code === 'PGRST205' || error?.message?.includes('traveler_messages')) {
    return 'Traveler messages are not configured yet. Apply supabase/migrations/20260602_add_traveler_messages.sql.';
  }

  return error?.message || 'Traveler message request failed';
}

// GET /api/social/messages - list the caller's received messages
export async function GET(request: NextRequest) {
  const { user, error } = await getAuthenticatedUser(request);
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: messages, error: messagesError } = await supabase
    .from('traveler_messages')
    .select('id, from_user, to_user, body, read_at, created_at')
    .eq('to_user', user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  if (messagesError) {
    return NextResponse.json({ error: messageError(messagesError) }, { status: 500 });
  }

  const senderIds = [...new Set((messages ?? []).map(message => message.from_user))];
  const { data: profiles, error: profilesError } = senderIds.length > 0
    ? await supabase
      .from('traveler_profiles')
      .select('id, display_name, avatar_url')
      .in('id', senderIds)
    : { data: [], error: null };

  if (profilesError) {
    return NextResponse.json({ error: profilesError.message }, { status: 500 });
  }

  const profileMap = new Map((profiles ?? []).map(profile => [profile.id, profile]));
  await touchTravelerLastSeen(user.id);
  return NextResponse.json(
    (messages ?? []).map(message => ({
      ...message,
      sender: profileMap.get(message.from_user) ?? null,
    }))
  );
}

// POST /api/social/messages - send a direct message to a public traveler
export async function POST(request: NextRequest) {
  const { user, error } = await getAuthenticatedUser(request);
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({})) as {
    to_user?: string;
    body?: string;
  };
  const recipientId = body.to_user?.trim();
  const text = body.body?.trim();

  if (!recipientId || !text) {
    return NextResponse.json({ error: 'Recipient and message are required' }, { status: 400 });
  }

  if (recipientId === user.id) {
    return NextResponse.json({ error: 'You cannot message yourself' }, { status: 400 });
  }

  if (text.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json({ error: `Message must be ${MAX_MESSAGE_LENGTH} characters or less` }, { status: 400 });
  }

  const { data: recipient, error: recipientError } = await supabase
    .from('traveler_profiles')
    .select('id')
    .eq('id', recipientId)
    .eq('is_public', true)
    .maybeSingle();

  if (recipientError) {
    return NextResponse.json({ error: recipientError.message }, { status: 500 });
  }

  if (!recipient) {
    return NextResponse.json({ error: 'Traveler is no longer available' }, { status: 404 });
  }

  const { data: blockedConnection, error: blockedError } = await supabase
    .from('traveler_connections')
    .select('id')
    .eq('status', 'blocked')
    .or(
      `and(from_user.eq.${user.id},to_user.eq.${recipientId}),` +
      `and(from_user.eq.${recipientId},to_user.eq.${user.id})`
    )
    .maybeSingle();

  if (blockedError) {
    return NextResponse.json({ error: blockedError.message }, { status: 500 });
  }

  if (blockedConnection) {
    return NextResponse.json({ error: 'Messaging is unavailable for this traveler' }, { status: 403 });
  }

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const { count, error: countError } = await supabase
    .from('traveler_messages')
    .select('id', { count: 'exact', head: true })
    .eq('from_user', user.id)
    .gte('created_at', startOfDay.toISOString());

  if (countError) {
    return NextResponse.json({ error: messageError(countError) }, { status: 500 });
  }

  if ((count ?? 0) >= DAILY_MESSAGE_LIMIT) {
    return NextResponse.json(
      { error: `You can send at most ${DAILY_MESSAGE_LIMIT} traveler messages per day` },
      { status: 429 }
    );
  }

  const { data, error: insertError } = await supabase
    .from('traveler_messages')
    .insert({ from_user: user.id, to_user: recipientId, body: text })
    .select('id, from_user, to_user, body, read_at, created_at')
    .single();

  if (insertError) {
    return NextResponse.json({ error: messageError(insertError) }, { status: 500 });
  }

  await touchTravelerLastSeen(user.id);
  return NextResponse.json(data, { status: 201 });
}
