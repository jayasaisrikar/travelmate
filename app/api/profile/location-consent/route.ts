import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/services/supabase';
import { getAuthenticatedUser } from '@/services/supabase-auth';

export async function POST(request: NextRequest) {
  const { user, error } = await getAuthenticatedUser(request);
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { grant } = (await request.json().catch(() => ({}))) as { grant?: boolean };
  const now = new Date().toISOString();
  const patch = grant
    ? { location_consent_at: now, location_consent_revoked_at: null }
    : { location_consent_revoked_at: now };
  const { error: upErr } = await supabase.from('traveler_profiles').update(patch).eq('id', user.id);
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
  return NextResponse.json({ consent: !!grant });
}
