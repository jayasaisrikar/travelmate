import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/services/supabase';
import { getAuthenticatedUser } from '@/services/supabase-auth';
import { touchTravelerLastSeen } from '@/services/social-activity';
import { isTrustedVerificationLevel } from '@/services/didit';

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

  await touchTravelerLastSeen(user.id);
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

  const { data: existingProfile, error: existingProfileError } = await supabase
    .from('traveler_profiles')
    .select('display_name, avatar_url, bio, travel_style, is_public, verified, verification_level, verification_status, verification_provider, verified_at')
    .eq('id', user.id)
    .maybeSingle();

  if (existingProfileError) {
    return NextResponse.json({ error: existingProfileError.message }, { status: 500 });
  }

  const nextVerificationLevel = isTrustedVerificationLevel(existingProfile?.verification_level)
    ? existingProfile.verification_level
    : body.is_public
      ? 'basic'
      : existingProfile?.verification_level ?? 'unverified';

  const payload = {
    id: user.id,
    display_name: body.display_name !== undefined ? body.display_name.trim() || null : existingProfile?.display_name ?? null,
    avatar_url: body.avatar_url !== undefined ? body.avatar_url.trim() || null : existingProfile?.avatar_url ?? null,
    bio: body.bio !== undefined ? body.bio.trim() || null : existingProfile?.bio ?? null,
    travel_style: body.travel_style !== undefined ? body.travel_style : existingProfile?.travel_style ?? null,
    is_public: body.is_public ?? existingProfile?.is_public ?? false,
    verified: nextVerificationLevel === 'trusted' || nextVerificationLevel === 'high_trust',
    verification_level: nextVerificationLevel,
    verification_status: existingProfile?.verification_status ?? 'not_started',
    verification_provider: existingProfile?.verification_provider ?? null,
    verified_at: existingProfile?.verified ? existingProfile?.verified_at ?? new Date().toISOString() : existingProfile?.verified_at ?? null,
    last_seen_at: new Date().toISOString(),
  };

  const { data, error: dbError } = await supabase
    .from('traveler_profiles')
    .upsert(payload, { onConflict: 'id' })
    .select()
    .single();

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  await touchTravelerLastSeen(user.id);
  return NextResponse.json(data);
}
