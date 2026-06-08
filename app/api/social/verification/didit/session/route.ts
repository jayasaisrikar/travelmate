import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/services/supabase-auth';
import { supabase } from '@/services/supabase';
import { buildAppUrl } from '@/services/app-url';
import { createDiditVerificationSession } from '@/services/didit';

// POST /api/social/verification/didit/session
export async function POST(request: NextRequest) {
  const { user, error } = await getAuthenticatedUser(request);
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from('traveler_profiles')
    .select('id, is_public, verification_level, verification_status')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  if (!profile?.is_public) {
    return NextResponse.json(
      { error: 'Make your traveler profile visible before starting verification.' },
      { status: 400 }
    );
  }

  const body = await request.json().catch(() => ({})) as {
    returnTo?: string;
    metadata?: Record<string, unknown>;
  };

  try {
    const session = await createDiditVerificationSession({
      userId: user.id,
      callbackUrl: buildAppUrl('/api/social/verification/didit/callback'),
      metadata: {
        returnTo: body.returnTo ?? '/dashboard/community',
        source: 'wayflo-social-profile',
        ...(body.metadata ?? {}),
      },
    });

    const { error: updateError } = await supabase
      .from('traveler_profiles')
      .update({
        verification_provider: 'didit',
        verification_session_id: session.session_id,
        verification_status: 'pending',
        verification_requested_at: new Date().toISOString(),
        verification_level: profile.verification_level === 'trusted' || profile.verification_level === 'high_trust'
          ? profile.verification_level
          : 'basic',
      })
      .eq('id', user.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      sessionId: session.session_id,
      sessionUrl: session.url,
      status: session.status ?? 'Not Started',
    });
  } catch (sessionError) {
    return NextResponse.json(
      { error: sessionError instanceof Error ? sessionError.message : 'Failed to start verification' },
      { status: 500 }
    );
  }
}
