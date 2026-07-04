import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/services/supabase';
import { getAuthenticatedUser } from '@/services/supabase-auth';
import { checkTrustedTraveler, verificationRequiredResponse } from '@/services/social-guard';
import { slugifyDestination } from '@/services/social';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await getAuthenticatedUser(request);
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as { publish?: boolean };
  const publish = body.publish === true;

  const { data: trip } = await supabase
    .from('trips').select('id, destination').eq('id', id).eq('user_id', user.id).maybeSingle();
  if (!trip) return NextResponse.json({ error: 'Trip not found' }, { status: 404 });

  const guard = await checkTrustedTraveler(user.id);
  if (!guard.ok) return verificationRequiredResponse(guard.level);

  const patch = publish
    ? { is_published: true, published_at: new Date().toISOString(), destination_slug: slugifyDestination(trip.destination) }
    : { is_published: false, published_at: null };

  const { error: upErr } = await supabase.from('trips').update(patch).eq('id', id).eq('user_id', user.id);
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
  return NextResponse.json({ is_published: publish });
}
