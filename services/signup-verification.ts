import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { buildAppUrl } from '@/services/app-url';
import { supabaseAdmin } from '@/services/supabase-admin';

const SIGNUP_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
const E2E_TEST_MODE = process.env.E2E_TEST_MODE === '1';
const E2E_TOKEN_STORE_PATH = path.join(os.tmpdir(), 'travelmate-signup-verification-e2e.json');

type StoredVerificationToken = {
  email: string;
  userId: string;
  expiresAt: number;
  consumedAt: number | null;
};

type VerificationResult =
  | { status: 'confirmed'; email: string }
  | { status: 'already_used'; email: string }
  | { status: 'expired'; email: string }
  | { status: 'invalid' };

function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function readE2ETokenStore() {
  try {
    const raw = await fs.readFile(E2E_TOKEN_STORE_PATH, 'utf8');
    const parsed = JSON.parse(raw) as Record<string, StoredVerificationToken>;

    return Object.fromEntries(
      Object.entries(parsed).filter(([, record]) => record.expiresAt > Date.now())
    ) as Record<string, StoredVerificationToken>;
  } catch {
    return {};
  }
}

async function writeE2ETokenStore(store: Record<string, StoredVerificationToken>) {
  await fs.writeFile(E2E_TOKEN_STORE_PATH, JSON.stringify(store, null, 2), 'utf8');
}

export async function createSignupVerificationLink(userId: string, email: string) {
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SIGNUP_TOKEN_TTL_MS).toISOString();

  if (E2E_TEST_MODE) {
    const store = await readE2ETokenStore();

    store[tokenHash] = {
      email,
      userId,
      expiresAt: Date.now() + SIGNUP_TOKEN_TTL_MS,
      consumedAt: null,
    };

    await writeE2ETokenStore(store);

    return buildAppUrl(`/verify-email?token=${encodeURIComponent(token)}`);
  }

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

  if (E2E_TEST_MODE) {
    const store = await readE2ETokenStore();
    const record = store[tokenHash];

    if (!record) {
      return { status: 'invalid' };
    }

    if (record.consumedAt) {
      return { status: 'already_used', email: record.email };
    }

    if (record.expiresAt <= Date.now()) {
      return { status: 'expired', email: record.email };
    }

    record.consumedAt = Date.now();
    store[tokenHash] = record;
    await writeE2ETokenStore(store);

    return { status: 'confirmed', email: record.email };
  }

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
