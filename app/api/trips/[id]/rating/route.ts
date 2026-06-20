import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/services/supabase';
import { getAuthenticatedUser } from '@/services/supabase-auth';
import { checkTrustedTraveler } from '@/services/social-guard';
import { canRateTrip, summarizeRatings } from '@/services/ratings';

async function eligibility(userId: string, tripId: string) {
  const today = new Date().toISOString().slice(0, 10);
  const [{ data: trip }, guard, { data: presence }] = await Promise.all([
    supabase.from('trips').select('trip_end_date').eq('id', tripId).eq('user_id', userId).maybeSingle(),
    checkTrustedTraveler(userId),
    supabase.from('trip_presence_checks').select('id').eq('trip_id', tripId).eq('user_id', userId).maybeSingle(),
  ]);
  if (!trip) return { trip: null as null, result: { ok: false as const, reason: 'trip_not_ended' as const } };
  return {
    trip,
    result: canRateTrip({ isVerified: guard.ok, hasPresence: !!presence, tripEndDate: trip.trip_end_date, today }),
  };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await getAuthenticatedUser(request);
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const [{ data: mine }, { data: all }, elig] = await Promise.all([
    supabase.from('trip_ratings').select('stars, review').eq('trip_id', id).eq('user_id', user.id).maybeSingle(),
    supabase.from('trip_ratings').select('stars').eq('trip_id', id),
    eligibility(user.id, id),
  ]);
  return NextResponse.json({
    mine: mine ?? null,
    aggregate: summarizeRatings(all ?? []),
    eligibility: elig.result,
  });
}

async function upsertRating(request: NextRequest, id: string) {
  const { user, error } = await getAuthenticatedUser(request);
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { stars?: number; review?: string };
  if (typeof body.stars !== 'number' || body.stars < 1 || body.stars > 5 || !Number.isInteger(body.stars)) {
    return NextResponse.json({ error: 'stars must be an integer 1–5' }, { status: 400 });
  }
  const elig = await eligibility(user.id, id);
  if (!elig.result.ok) return NextResponse.json({ error: elig.result.reason }, { status: 403 });
  const now = new Date().toISOString();
  const { data, error: upErr } = await supabase
    .from('trip_ratings')
    .upsert(
      { trip_id: id, user_id: user.id, stars: body.stars, review: body.review ?? null, updated_at: now },
      { onConflict: 'trip_id,user_id' }
    )
    .select('stars, review')
    .single();
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return upsertRating(request, id);
}
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return upsertRating(request, id);
}
