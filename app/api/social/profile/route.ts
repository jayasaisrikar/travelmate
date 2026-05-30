import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/services/supabase';
import { getAuthenticatedUser } from '@/services/supabase-auth';

// GET /api/social/profile — return the caller's own profile
export async function GET(request: NextRequest) {
  const { user, error } = await getAuthenticatedUser(request);
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error: dbError } = await supabase
    .from('traveler_profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json(data ?? null);
}

// POST /api/social/profile — upsert the caller's profile
export async function POST(request: NextRequest) {
  const { user, error } = await getAuthenticatedUser(request);
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({})) as {
    display_name?: string;
    avatar_url?: string;
    bio?: string;
    travel_style?: string;
    is_public?: boolean;
  };

  const allowedStyles = ['solo', 'couple', 'group', 'flexible'];
  if (body.travel_style && !allowedStyles.includes(body.travel_style)) {
    return NextResponse.json({ error: 'Invalid travel_style' }, { status: 400 });
  }

  if (body.bio && body.bio.length > 140) {
    return NextResponse.json({ error: 'Bio must be 140 characters or less' }, { status: 400 });
  }

  const { data, error: dbError } = await supabase
    .from('traveler_profiles')
    .upsert(
      {
        id: user.id,
        ...body,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    )
    .select()
    .single();

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
