import { NextResponse } from 'next/server';
import { isTrustedVerificationLevel } from '@/services/didit';

export type GuardResult = { ok: true; level: string } | { ok: false; level: string };

/** Pure predicate: does this verification level unlock social mutations? */
export function isVerifiedLevel(level: string | null | undefined): boolean {
  return isTrustedVerificationLevel(level);
}

/** Read the traveler's verification level and decide if social mutations are allowed. */
export async function checkTrustedTraveler(userId: string): Promise<GuardResult> {
  const { supabase } = await import('@/services/supabase');

  const { data } = await supabase
    .from('traveler_profiles')
    .select('verification_level')
    .eq('id', userId)
    .maybeSingle();

  const level = (data?.verification_level as string | undefined) ?? 'unverified';
  return isVerifiedLevel(level) ? { ok: true, level } : { ok: false, level };
}

/** Standard 403 body for a gated social mutation. */
export function verificationRequiredResponse(level: string): NextResponse {
  return NextResponse.json({ error: 'verification_required', level }, { status: 403 });
}
