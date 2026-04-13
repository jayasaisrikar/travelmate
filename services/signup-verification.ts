import crypto from 'node:crypto';

import { buildAppUrl } from '@/services/app-url';
import { supabaseAdmin } from '@/services/supabase-admin';

const SIGNUP_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

type VerificationResult =
  | { status: 'confirmed'; email: string }
  | { status: 'already_used'; email: string }
  | { status: 'expired'; email: string }
  | { status: 'invalid' };

function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function createSignupVerificationLink(userId: string, email: string) {
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SIGNUP_TOKEN_TTL_MS).toISOString();

  const { error } = await supabaseAdmin.from('signup_verification_tokens').insert({
    user_id: userId,
    email,
    token_hash: tokenHash,
    expires_at: expiresAt,
  });

  if (error) {
    throw error;
  }

  return buildAppUrl(`/verify-email?token=${encodeURIComponent(token)}`);
}

export async function confirmSignupVerificationToken(token: string): Promise<VerificationResult> {
  const tokenHash = hashToken(token);

  const { data: record, error } = await supabaseAdmin
    .from('signup_verification_tokens')
    .select('email, user_id, expires_at, consumed_at')
    .eq('token_hash', tokenHash)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!record) {
    return { status: 'invalid' };
  }

  if (record.consumed_at) {
    return { status: 'already_used', email: record.email };
  }

  if (new Date(record.expires_at).getTime() <= Date.now()) {
    return { status: 'expired', email: record.email };
  }

  const { error: confirmError } = await supabaseAdmin.auth.admin.updateUserById(record.user_id, {
    email_confirm: true,
  });

  if (confirmError) {
    throw confirmError;
  }

  const { error: consumeError } = await supabaseAdmin
    .from('signup_verification_tokens')
    .update({ consumed_at: new Date().toISOString() })
    .eq('token_hash', tokenHash)
    .is('consumed_at', null);

  if (consumeError) {
    throw consumeError;
  }

  return { status: 'confirmed', email: record.email };
}
