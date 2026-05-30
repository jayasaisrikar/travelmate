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
    .select('*')
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
