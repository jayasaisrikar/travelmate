import { NextRequest, NextResponse } from 'next/server';
import { buildAppUrl } from '@/services/app-url';
import { fetchDiditDecision, normalizeDiditStatus, persistDiditVerificationResult } from '@/services/didit';
import { supabase } from '@/services/supabase';

// GET /api/social/verification/didit/callback
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('verificationSessionId') ?? searchParams.get('session_id') ?? '';
  const returnTo = searchParams.get('returnTo') ?? '/dashboard/community';

  if (!sessionId) {
    return NextResponse.redirect(new URL('/dashboard/community?verification=missing', buildAppUrl('/')));
  }

  try {
    const decision = await fetchDiditDecision(sessionId);
    const status = normalizeDiditStatus(decision.status);

    const { data: profile } = decision.vendor_data
      ? await supabase
        .from('traveler_profiles')
        .select('id')
        .eq('id', decision.vendor_data)
        .maybeSingle()
      : await supabase
        .from('traveler_profiles')
        .select('id')
        .eq('verification_session_id', sessionId)
        .maybeSingle();

    if (profile?.id) {
      await persistDiditVerificationResult({
        userId: profile.id,
        sessionId,
        status,
      });
    }

    const destination = new URL(returnTo, buildAppUrl('/'));
    destination.searchParams.set('verification', 'didit');
    destination.searchParams.set('status', status);

    return NextResponse.redirect(destination);
  } catch (error) {
    const destination = new URL(returnTo, buildAppUrl('/'));
    destination.searchParams.set('verification', 'didit');
    destination.searchParams.set('status', 'error');
    destination.searchParams.set('reason', error instanceof Error ? error.message : 'unknown');

    return NextResponse.redirect(destination);
  }
}
