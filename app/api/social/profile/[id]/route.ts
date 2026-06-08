import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/services/supabase';

// GET /api/social/profile/[id] — fetch any public profile
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { data, error } = await supabase
    .from('traveler_profiles')
    .select('id, display_name, avatar_url, bio, travel_style, is_public, verified, verification_provider, verification_level, verification_status, verified_at, last_seen_at, created_at')
    .eq('id', id)
    .eq('is_public', true)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json(null, { status: 404 });
  }

  return NextResponse.json(data);
}
