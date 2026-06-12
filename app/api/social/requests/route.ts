import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/services/supabase';
import { getAuthenticatedUser } from '@/services/supabase-auth';
import { touchTravelerLastSeen } from '@/services/social-activity';
import { scoreMatch } from '@/services/tripmate-matching';
import {
  DAILY_REQUEST_LIMIT,
  REQUEST_MESSAGE_LIMIT,
  detectRestrictedContact,
  isValidReason,
  restrictedContactMessage,
  toMatchInput,
} from '@/services/social-requests';

const COUNTERPART_FIELDS = 'id, display_name, avatar_url, verified, verification_level';

function notConfigured(error: { code?: string; message?: string } | null | undefined) {
  return error?.code === 'PGRST205' || error?.message?.includes('tripmate_requests');
}

interface RequestRow {
  id: string;
  from_user: string;
  to_user: string;
  reason: string;
  message: string | null;
  status: string;
  match_score: number | null;
  expires_at: string;
  created_at: string;
}

async function shapeRequests(rows: RequestRow[], selfId: string) {
  const counterpartIds = [
    ...new Set(rows.map(r => (r.from_user === selfId ? r.to_user : r.from_user))),
  ];

  const { data: profiles } = counterpartIds.length
    ? await supabase.from('traveler_profiles').select(COUNTERPART_FIELDS).in('id', counterpartIds)
    : { data: [] };

  const profileMap = new Map((profiles ?? []).map(p => [p.id, p]));

  return rows.map(row => {
    const outgoing = row.from_user === selfId;
    const counterpartId = outgoing ? row.to_user : row.from_user;
    return {
      ...row,
      direction: outgoing ? 'outgoing' : 'incoming',
      counterpart: profileMap.get(counterpartId) ?? null,
    };
  });
}

// GET /api/social/requests — the caller's incoming + outgoing requests
export async function GET(request: NextRequest) {
  const { user, error } = await getAuthenticatedUser(request);
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error: dbError } = await supabase
    .from('tripmate_requests')
    .select('id, from_user, to_user, reason, message, status, match_score, expires_at, created_at')
    .or(`from_user.eq.${user.id},to_user.eq.${user.id}`)
    .order('created_at', { ascending: false });

  if (dbError) {
    if (notConfigured(dbError)) {
      return NextResponse.json({ incoming: [], outgoing: [] });
    }
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  const shaped = await shapeRequests((data ?? []) as RequestRow[], user.id);
  await touchTravelerLastSeen(user.id);

  return NextResponse.json({
    incoming: shaped.filter(r => r.direction === 'incoming'),
    outgoing: shaped.filter(r => r.direction === 'outgoing'),
  });
}

// POST /api/social/requests — send a structured tripmate request
export async function POST(request: NextRequest) {
  const { user, error } = await getAuthenticatedUser(request);
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    to_user?: string;
    reason?: string;
    message?: string;
    from_signal?: string;
    to_signal?: string;
  };

  const toUser = body.to_user?.trim();
  const message = body.message?.trim() || null;

  if (!toUser) {
    return NextResponse.json({ error: 'Recipient is required' }, { status: 400 });
  }
  if (toUser === user.id) {
    return NextResponse.json({ error: 'You cannot request yourself' }, { status: 400 });
  }
  if (!isValidReason(body.reason)) {
    return NextResponse.json({ error: 'Choose a valid reason for reaching out' }, { status: 400 });
  }
  if (message) {
    if (message.length > REQUEST_MESSAGE_LIMIT) {
      return NextResponse.json(
        { error: `Message must be ${REQUEST_MESSAGE_LIMIT} characters or less` },
        { status: 400 }
      );
    }
    const restricted = detectRestrictedContact(message);
    if (restricted) {
      return NextResponse.json({ error: restrictedContactMessage(restricted) }, { status: 400 });
    }
  }

  // Recipient must be a public traveller.
  const { data: recipient, error: recipientError } = await supabase
    .from('traveler_profiles')
    .select('id, interests, languages, budget_preference, pace_preference, verification_level')
    .eq('id', toUser)
    .eq('is_public', true)
    .maybeSingle();

  if (recipientError) {
    return NextResponse.json({ error: recipientError.message }, { status: 500 });
  }
  if (!recipient) {
    return NextResponse.json({ error: 'This traveller is no longer available' }, { status: 404 });
  }

  // Block enforcement in either direction.
  const { data: blocked } = await supabase
    .from('traveler_connections')
    .select('id')
    .eq('status', 'blocked')
    .or(
      `and(from_user.eq.${user.id},to_user.eq.${toUser}),` +
        `and(from_user.eq.${toUser},to_user.eq.${user.id})`
    )
    .maybeSingle();

  if (blocked) {
    return NextResponse.json({ error: 'You can no longer reach this traveller' }, { status: 403 });
  }

  // Daily rate limit (spam protection).
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const { count, error: countError } = await supabase
    .from('tripmate_requests')
    .select('id', { count: 'exact', head: true })
    .eq('from_user', user.id)
    .gte('created_at', startOfDay.toISOString());

  if (countError && !notConfigured(countError)) {
    return NextResponse.json({ error: countError.message }, { status: 500 });
  }
  if ((count ?? 0) >= DAILY_REQUEST_LIMIT) {
    return NextResponse.json(
      { error: `You can send at most ${DAILY_REQUEST_LIMIT} requests per day` },
      { status: 429 }
    );
  }

  // ── Compute a match score for context ──
  const [{ data: myProfile }, { data: mySignal }, { data: theirSignal }] = await Promise.all([
    supabase
      .from('traveler_profiles')
      .select('interests, languages, budget_preference, pace_preference, verification_level')
      .eq('id', user.id)
      .maybeSingle(),
    body.from_signal
      ? supabase
          .from('traveler_trip_signals')
          .select('destination_slug, travel_month, date_start, date_end, interests')
          .eq('id', body.from_signal)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    body.to_signal
      ? supabase
          .from('traveler_trip_signals')
          .select('destination_slug, travel_month, date_start, date_end, interests')
          .eq('id', body.to_signal)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  let matchScore: number | null = null;
  if (mySignal || myProfile) {
    const result = scoreMatch(
      toMatchInput(myProfile, mySignal),
      toMatchInput(recipient, theirSignal)
    );
    matchScore = result.score;
  }

  // ── Reciprocal request → auto-connect ──
  const { data: reciprocal } = await supabase
    .from('tripmate_requests')
    .select('id, status')
    .eq('from_user', toUser)
    .eq('to_user', user.id)
    .maybeSingle();

  if (reciprocal && reciprocal.status === 'pending') {
    await supabase
      .from('tripmate_requests')
      .update({ status: 'accepted' })
      .eq('id', reciprocal.id);
    await createConnection(user.id, toUser);

    const { data: row } = await supabase
      .from('tripmate_requests')
      .upsert(
        {
          from_user: user.id,
          to_user: toUser,
          reason: body.reason,
          message,
          status: 'accepted',
          match_score: matchScore,
        },
        { onConflict: 'from_user,to_user' }
      )
      .select('id, from_user, to_user, reason, message, status, match_score, expires_at, created_at')
      .single();

    await touchTravelerLastSeen(user.id);
    const [shaped] = await shapeRequests([row as RequestRow], user.id);
    return NextResponse.json({ ...shaped, auto_connected: true }, { status: 201 });
  }

  // ── Create / refresh the pending request ──
  const { data: row, error: upsertError } = await supabase
    .from('tripmate_requests')
    .upsert(
      {
        from_user: user.id,
        to_user: toUser,
        from_signal: body.from_signal ?? null,
        to_signal: body.to_signal ?? null,
        reason: body.reason,
        message,
        status: 'pending',
        match_score: matchScore,
        expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      },
      { onConflict: 'from_user,to_user' }
    )
    .select('id, from_user, to_user, reason, message, status, match_score, expires_at, created_at')
    .single();

  if (upsertError) {
    if (notConfigured(upsertError)) {
      return NextResponse.json(
        { error: 'Tripmate requests are not configured yet. Apply migration 20260612_add_tripmate_requests.sql.' },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: upsertError.message }, { status: 500 });
  }

  await touchTravelerLastSeen(user.id);
  const [shaped] = await shapeRequests([row as RequestRow], user.id);
  return NextResponse.json(shaped, { status: 201 });
}

/** Create a mutual 'connected' edge so messaging unlocks for both users. */
async function createConnection(a: string, b: string) {
  await supabase.from('traveler_connections').upsert(
    [
      { from_user: a, to_user: b, status: 'connected' },
      { from_user: b, to_user: a, status: 'connected' },
    ],
    { onConflict: 'from_user,to_user' }
  );
}
