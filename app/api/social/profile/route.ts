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
    interests?: string[];
    languages?: string[];
    budget_preference?: string | null;
    pace_preference?: string | null;
  };

  const allowedStyles = ['solo', 'couple', 'group', 'flexible'];
  if (body.travel_style && !allowedStyles.includes(body.travel_style)) {
    return NextResponse.json({ error: 'Invalid travel_style' }, { status: 400 });
  }

  const allowedBudgets = ['budget', 'moderate', 'comfort', 'luxury'];
  if (body.budget_preference && !allowedBudgets.includes(body.budget_preference)) {
    return NextResponse.json({ error: 'Invalid budget_preference' }, { status: 400 });
  }

  const allowedPaces = ['slow', 'balanced', 'fast'];
  if (body.pace_preference && !allowedPaces.includes(body.pace_preference)) {
    return NextResponse.json({ error: 'Invalid pace_preference' }, { status: 400 });
  }

  if (body.bio && body.bio.length > 140) {
    return NextResponse.json({ error: 'Bio must be 140 characters or less' }, { status: 400 });
  }

  // Normalise free-text tag arrays: trim, dedupe, lowercase, cap length/count.
  const cleanTags = (input: unknown): string[] | undefined => {
    if (!Array.isArray(input)) return undefined;
    const cleaned = [...new Set(
      input
        .filter((v): v is string => typeof v === 'string')
        .map(v => v.trim().toLowerCase())
        .filter(v => v.length > 0 && v.length <= 30)
    )];
    return cleaned.slice(0, 12);
  };
  const nextInterests = cleanTags(body.interests);
  const nextLanguages = cleanTags(body.languages);

  const { data: existingProfile, error: existingProfileError } = await supabase
    .from('traveler_profiles')
    .select('display_name, avatar_url, bio, travel_style, interests, languages, budget_preference, pace_preference, is_public, verified, verification_level, verification_status, verification_provider, verified_at')
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
    interests: nextInterests !== undefined ? nextInterests : existingProfile?.interests ?? [],
    languages: nextLanguages !== undefined ? nextLanguages : existingProfile?.languages ?? [],
    budget_preference: body.budget_preference !== undefined ? body.budget_preference || null : existingProfile?.budget_preference ?? null,
    pace_preference: body.pace_preference !== undefined ? body.pace_preference || null : existingProfile?.pace_preference ?? null,
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
