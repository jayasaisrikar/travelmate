/**
 * services/social-requests.ts
 *
 * Server-safe helpers for the tripmate request flow. Kept free of any
 * browser/Supabase-client imports so it is safe to use inside route handlers.
 */

import type { MatchInput } from '@/services/tripmate-matching';
import type { SocialVerificationLevel } from '@/services/social-verification';

export const REQUEST_REASONS = [
  'same_destination',
  'same_dates',
  'collaborate_itinerary',
  'one_activity',
  'coffee_meetup',
  'ask_suggestions',
  'full_tripmate',
] as const;

export type RequestReason = (typeof REQUEST_REASONS)[number];

export const REQUEST_MESSAGE_LIMIT = 300;

/** Max new outgoing requests a user can create per rolling day. */
export const DAILY_REQUEST_LIMIT = 15;

export function isValidReason(value: unknown): value is RequestReason {
  return typeof value === 'string' && (REQUEST_REASONS as readonly string[]).includes(value);
}

/**
 * First-contact safety filter (PRD §10.7 / §18): links, emails and phone
 * numbers are not allowed in the opening message. Returns the offending
 * category, or null when the text is clean.
 */
export function detectRestrictedContact(text: string): 'link' | 'email' | 'phone' | null {
  if (!text) return null;

  const email = /\b[^\s@]+@[^\s@]+\.[^\s@]{2,}\b/;
  if (email.test(text)) return 'email';

  const link = /(https?:\/\/|www\.)|\b[a-z0-9-]+\.(com|net|org|io|co|me|app|xyz|info|link|gg|to)\b/i;
  if (link.test(text)) return 'link';

  // 7+ digits, allowing spaces / dashes / dots / parens between them.
  const digitCount = (text.match(/\d/g) ?? []).length;
  const phone = /\+?\d(?:[\d\s().-]{5,})\d/;
  if (digitCount >= 7 && phone.test(text)) return 'phone';

  return null;
}

export function restrictedContactMessage(kind: 'link' | 'email' | 'phone'): string {
  const what = kind === 'link' ? 'links' : kind === 'email' ? 'email addresses' : 'phone numbers';
  return `For your safety, please don't include ${what} in your first message. You can share those after you connect.`;
}

// ─── Match-input shaping ─────────────────────────────────────────────────────

interface ProfileRow {
  interests?: string[] | null;
  languages?: string[] | null;
  budget_preference?: string | null;
  pace_preference?: string | null;
  verification_level?: string | null;
}

interface SignalRow {
  destination_slug?: string | null;
  travel_month?: string | null;
  date_start?: string | null;
  date_end?: string | null;
  interests?: string[] | null;
}

/**
 * Combine a profile + a single trip signal into a MatchInput. Interests from
 * the trip signal take priority, falling back to the profile-level interests.
 */
export function toMatchInput(profile: ProfileRow | null, signal: SignalRow | null): MatchInput {
  return {
    destinationSlug: signal?.destination_slug ?? '',
    travelMonth: signal?.travel_month ?? null,
    dateStart: signal?.date_start ?? null,
    dateEnd: signal?.date_end ?? null,
    interests:
      signal?.interests && signal.interests.length > 0
        ? signal.interests
        : profile?.interests ?? null,
    budgetPreference: profile?.budget_preference ?? null,
    pacePreference: profile?.pace_preference ?? null,
    languages: profile?.languages ?? null,
    verificationLevel: (profile?.verification_level as SocialVerificationLevel) ?? null,
  };
}
