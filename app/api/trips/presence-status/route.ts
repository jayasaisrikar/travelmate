import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/services/supabase';
import { getAuthenticatedUser } from '@/services/supabase-auth';

export async function GET(request: NextRequest) {
  const { user, error } = await getAuthenticatedUser(request);
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: trips } = await supabase
    .from('trips')
    .select('id, trip_start_date, trip_end_date')
    .eq('user_id', user.id);

  const tripRows = trips ?? [];
  const ids = tripRows.map(t => t.id);
  const { data: checks } = ids.length
    ? await supabase.from('trip_presence_checks').select('trip_id').eq('user_id', user.id).in('trip_id', ids)
    : { data: [] };
  const verified = new Set((checks ?? []).map(c => c.trip_id));

  const { data: profile } = await supabase
    .from('traveler_profiles')
    .select('location_consent_at, location_consent_revoked_at')
    .eq('id', user.id).maybeSingle();
  const consent = !!profile?.location_consent_at &&
    (!profile.location_consent_revoked_at || profile.location_consent_revoked_at < profile.location_consent_at);

  return NextResponse.json({
    trips: tripRows.map(t => ({ ...t, verified: verified.has(t.id) })),
    consent,
  });
}
