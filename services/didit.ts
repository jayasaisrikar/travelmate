import { createHmac, timingSafeEqual } from 'crypto';
import { supabase } from '@/services/supabase';
import { buildAppUrl } from '@/services/app-url';

export type DiditVerificationLevel = 'unverified' | 'basic' | 'trusted' | 'high_trust';
export type DiditVerificationStatus =
  | 'not_started'
  | 'pending'
  | 'approved'
  | 'declined'
  | 'in_review'
  | 'expired'
  | 'abandoned'
  | 'resubmitted';

export interface DiditSessionResponse {
  session_id: string;
  session_number?: number;
  session_token?: string;
  url: string;
  vendor_data?: string | null;
  metadata?: Record<string, unknown> | null;
  status?: string;
  workflow_id?: string;
  workflow_version?: number | null;
}

export interface DiditDecisionResponse {
  session_id: string;
  session_number?: number;
  session_url?: string;
  status: string;
  workflow_id?: string;
  vendor_data?: string | null;
  metadata?: Record<string, unknown> | null;
  decision?: Record<string, unknown> | null;
}

function getDiditApiKey() {
  const apiKey = process.env.DIDIT_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('DIDIT_API_KEY is not configured');
  }

  return apiKey;
}

export function getDiditWorkflowId() {
  const workflowId = process.env.DIDIT_KYC_WORKFLOW_ID?.trim() || process.env.DIDIT_WORKFLOW_ID?.trim();
  if (!workflowId) {
    throw new Error('DIDIT_KYC_WORKFLOW_ID is not configured');
  }

  return workflowId;
}

export function normalizeDiditStatus(status: string | null | undefined): DiditVerificationStatus {
  const value = (status ?? '').trim().toLowerCase().replace(/\s+/g, '_');

  switch (value) {
    case 'approved':
      return 'approved';
    case 'declined':
      return 'declined';
    case 'in_review':
      return 'in_review';
    case 'expired':
      return 'expired';
    case 'abandoned':
      return 'abandoned';
    case 'resubmitted':
      return 'resubmitted';
    case 'kyc_expired':
      return 'expired';
    case 'in_progress':
    case 'awaiting_user':
    case 'not_started':
    default:
      return 'pending';
  }
}

export function diditLevelForStatus(status: DiditVerificationStatus): DiditVerificationLevel {
  if (status === 'approved') {
    return 'trusted';
  }

  return 'basic';
}

export function isTrustedVerificationLevel(level: string | null | undefined): level is 'trusted' | 'high_trust' {
  return level === 'trusted' || level === 'high_trust';
}

export async function createDiditVerificationSession(input: {
  userId: string;
  callbackUrl?: string;
  metadata?: Record<string, unknown>;
}): Promise<DiditSessionResponse> {
  const response = await fetch('https://verification.didit.me/v3/session/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': getDiditApiKey(),
    },
    body: JSON.stringify({
      workflow_id: getDiditWorkflowId(),
      vendor_data: input.userId,
      callback: input.callbackUrl ?? buildAppUrl('/api/social/verification/didit/callback'),
      callback_method: 'both',
      metadata: input.metadata ?? {},
      language: 'en',
    }),
    cache: 'no-store',
  });

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error((body as { detail?: string; error?: string } | null)?.detail ?? (body as { error?: string } | null)?.error ?? `Didit session create failed (${response.status})`);
  }

  return body as DiditSessionResponse;
}

export async function fetchDiditDecision(sessionId: string): Promise<DiditDecisionResponse> {
  const response = await fetch(`https://verification.didit.me/v3/session/${encodeURIComponent(sessionId)}/decision/`, {
    headers: {
      'x-api-key': getDiditApiKey(),
    },
    cache: 'no-store',
  });

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error((body as { detail?: string; error?: string } | null)?.detail ?? (body as { error?: string } | null)?.error ?? `Didit decision fetch failed (${response.status})`);
  }

  return body as DiditDecisionResponse;
}

function canonicalizeWebhookValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(item => canonicalizeWebhookValue(item));
  }

  if (value && typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((accumulator, key) => {
        accumulator[key] = canonicalizeWebhookValue((value as Record<string, unknown>)[key]);
        return accumulator;
      }, {});
  }

  return value;
}

export function verifyDiditWebhookSignature(input: {
  rawBody: string;
  headers: Headers;
}): boolean {
  const secret = process.env.DIDIT_WEBHOOK_SECRET?.trim();
  if (!secret) {
    return false;
  }

  const timestamp = input.headers.get('x-timestamp') ?? '';
  const signatureV2 = input.headers.get('x-signature-v2') ?? '';
  const signatureSimple = input.headers.get('x-signature-simple') ?? '';

  if (!timestamp) {
    return false;
  }

  const requestTime = Number.parseInt(timestamp, 10);
  if (!Number.isFinite(requestTime) || Math.abs(Math.floor(Date.now() / 1000) - requestTime) > 300) {
    return false;
  }

  let jsonBody: Record<string, unknown>;
  try {
    jsonBody = JSON.parse(input.rawBody) as Record<string, unknown>;
  } catch {
    return false;
  }

  if (signatureV2) {
    const canonical = JSON.stringify(canonicalizeWebhookValue(jsonBody));
    const expected = createHmac('sha256', secret).update(canonical).digest('hex');
    const expectedBuffer = Buffer.from(expected, 'utf8');
    const signatureBuffer = Buffer.from(signatureV2, 'utf8');

    if (expectedBuffer.length === signatureBuffer.length && timingSafeEqual(expectedBuffer, signatureBuffer)) {
      return true;
    }
  }

  if (signatureSimple) {
    const canonicalString = [
      String(jsonBody.timestamp ?? ''),
      String(jsonBody.session_id ?? ''),
      String(jsonBody.status ?? ''),
      String(jsonBody.webhook_type ?? ''),
    ].join(':');

    const expected = createHmac('sha256', secret).update(canonicalString).digest('hex');
    const expectedBuffer = Buffer.from(expected, 'utf8');
    const signatureBuffer = Buffer.from(signatureSimple, 'utf8');

    if (expectedBuffer.length === signatureBuffer.length && timingSafeEqual(expectedBuffer, signatureBuffer)) {
      return true;
    }
  }

  return false;
}

export async function persistDiditVerificationResult(input: {
  userId: string;
  sessionId: string;
  status: string;
  verifiedAt?: string;
  markTrustedIfApproved?: boolean;
}) {
  const normalizedStatus = normalizeDiditStatus(input.status);
  const nextLevel = await deriveVerificationTargetLevel(input.userId, normalizedStatus);
  const updates: Record<string, unknown> = {
    verification_provider: 'didit',
    verification_session_id: input.sessionId,
    verification_status: normalizedStatus,
    verification_level: nextLevel,
  };

  if (normalizedStatus === 'approved') {
    updates.verification_level = 'trusted';
    updates.verified = true;
    updates.verified_at = input.verifiedAt ?? new Date().toISOString();
  } else {
    updates.verified = isTrustedVerificationLevel(nextLevel);
  }

  const { data, error } = await supabase
    .from('traveler_profiles')
    .update(updates)
    .eq('id', input.userId)
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function deriveVerificationTargetLevel(userId: string, status: DiditVerificationStatus) {
  const { data: profile } = await supabase
    .from('traveler_profiles')
    .select('verification_level, is_public')
    .eq('id', userId)
    .maybeSingle();

  const currentLevel = profile?.verification_level ?? 'unverified';
  if (status === 'approved') {
    return 'trusted' as const;
  }

  if (currentLevel === 'trusted' || currentLevel === 'high_trust') {
    return currentLevel;
  }

  return profile?.is_public ? 'basic' : 'unverified';
}
