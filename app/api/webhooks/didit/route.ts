import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/services/supabase';
import { persistDiditVerificationResult, verifyDiditWebhookSignature } from '@/services/didit';

export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  if (!verifyDiditWebhookSignature({ rawBody, headers: request.headers })) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const sessionId = typeof payload.session_id === 'string' ? payload.session_id : '';
  const status = typeof payload.status === 'string' ? payload.status : '';
  const vendorData = typeof payload.vendor_data === 'string' ? payload.vendor_data : '';

  if (!sessionId || !status) {
    return NextResponse.json({ error: 'Missing session fields' }, { status: 400 });
  }

  const { data: profile } = vendorData
    ? await supabase
      .from('traveler_profiles')
      .select('id')
      .eq('id', vendorData)
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

  return NextResponse.json({ ok: true });
}
