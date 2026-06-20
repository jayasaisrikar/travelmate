/**
 * services/social.ts
 *
 * All client-side social feature logic: traveler profiles, waves,
 * trip signals, and trip rooms. Every mutation goes through the
 * /api/social/* routes so we can enforce server-side rules cleanly.
 */

import { getSupabaseBrowser } from '@/services/supabase-browser';
import type {
  SocialVerificationLevel,
  SocialVerificationStatus,
} from '@/services/social-verification';

// ─── Error handling ──────────────────────────────────────────────────────────

export class SocialApiError extends Error {
  status: number;
  code?: string;
  level?: string;
  constructor(message: string, status: number, code?: string, level?: string) {
    super(message);
    this.name = 'SocialApiError';
    this.status = status;
    this.code = code;
    this.level = level;
  }
}

// ─── Shared types ────────────────────────────────────────────────────────────

export interface TravelerProfile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  travel_style: 'solo' | 'couple' | 'group' | 'flexible' | null;
  is_public: boolean;
  verified: boolean;
  verification_provider: 'didit' | null;
  verification_level: SocialVerificationLevel;
  verification_status: SocialVerificationStatus;
  verification_session_id: string | null;
  verification_requested_at: string | null;
  verified_at: string | null;
  last_seen_at: string | null;
  created_at: string;
  location_consent_at?: string | null;
  location_consent_revoked_at?: string | null;
}

export interface TravelerWithSignal extends TravelerProfile {
  signal_id: string;
  destination: string;
  destination_slug: string;
  travel_month: string | null;
  connection_status: 'none' | 'wave_sent' | 'wave_received' | 'connected' | 'blocked';
  is_self: boolean;
}

export interface TripSignal {
  id: string;
  user_id: string;
  trip_id: string | null;   // text — matches trips.id
  destination: string;
  destination_slug: string;
  travel_month: string | null;
  is_public: boolean;
  created_at: string;
}

export interface TripRoom {
  id: string;
  created_by: string;
  destination: string;
  destination_slug: string;
  title: string | null;
  travel_month: string | null;
  max_members: number;
  is_open: boolean;
  member_count: number;
  is_member?: boolean;
  current_user_role?: 'host' | 'member' | null;
  created_at: string;
}

export interface DestinationPulse {
  destination: string;
  destination_slug: string;
  traveler_count: number;
  room_count: number;
  travel_months: string[];
  recent_travelers: Array<Pick<TravelerProfile, 'id' | 'display_name' | 'avatar_url' | 'verified' | 'verification_level'>>;
}

export interface TripRoomMember {
  room_id: string;
  user_id: string;
  role: 'host' | 'member';
  joined_at: string;
  profile: TravelerProfile | null;
  is_self?: boolean;
}

export interface TravelerMessage {
  id: string;
  from_user: string;
  to_user: string;
  body: string;
  read_at: string | null;
  created_at: string;
  sender?: Pick<TravelerProfile, 'id' | 'display_name' | 'avatar_url'> | null;
}

export interface DiditVerificationStartResult {
  sessionId: string;
  sessionUrl: string;
  status: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function authHeader(): Promise<Record<string, string>> {
  const { data } = await getSupabaseBrowser().auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = await authHeader();

  const res = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
      ...(init.headers as Record<string, string> | undefined),
    },
    cache: 'no-store',
  });

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    const b = body as { error?: string; level?: string } | null;
    throw new SocialApiError(
      b?.error ?? `Social API error ${res.status}`,
      res.status,
      b?.error,
      b?.level
    );
  }

  return body as T;
}

/** Normalise any destination string into a URL-safe slug */
export function slugifyDestination(destination: string): string {
  return destination
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Format a Date as "Month YYYY" travel window string */
export function formatTravelMonth(date: Date = new Date()): string {
  return date.toLocaleString('en-US', { month: 'long', year: 'numeric' });
}

// ─── Profile ─────────────────────────────────────────────────────────────────

/** Fetch the current user's traveler profile (null if not created yet) */
export async function getMyProfile(): Promise<TravelerProfile | null> {
  return apiFetch<TravelerProfile | null>('/api/social/profile');
}

/** Create or update the current user's traveler profile */
export async function upsertMyProfile(
  patch: Partial<Pick<TravelerProfile, 'display_name' | 'avatar_url' | 'bio' | 'travel_style' | 'is_public'>>
): Promise<TravelerProfile> {
  return apiFetch<TravelerProfile>('/api/social/profile', {
    method: 'POST',
    body: JSON.stringify(patch),
  });
}

/** Grant or revoke consent for the one-shot trip presence location check */
export async function setLocationConsent(grant: boolean): Promise<{ consent: boolean }> {
  return apiFetch<{ consent: boolean }>('/api/profile/location-consent', {
    method: 'POST',
    body: JSON.stringify({ grant }),
  });
}

/** Fetch any user's public profile by their id */
export async function getPublicProfile(userId: string): Promise<TravelerProfile | null> {
  return apiFetch<TravelerProfile | null>(`/api/social/profile/${userId}`);
}

/** Start the optional Didit verification flow for the current user */
export async function startDiditVerification(returnTo?: string): Promise<DiditVerificationStartResult> {
  return apiFetch<DiditVerificationStartResult>('/api/social/verification/didit/session', {
    method: 'POST',
    body: JSON.stringify({
      returnTo,
    }),
  });
}

// ─── Trip signals ─────────────────────────────────────────────────────────────

/** Publish a trip signal ("I'm going to X in Y month") */
export async function publishTripSignal(payload: {
  tripId: string;
  destination: string;
  travelMonth?: string;
}): Promise<TripSignal> {
  return apiFetch<TripSignal>('/api/social/signals', {
    method: 'POST',
    body: JSON.stringify({
      trip_id: payload.tripId,
      destination: payload.destination,
      destination_slug: slugifyDestination(payload.destination),
      travel_month: payload.travelMonth ?? formatTravelMonth(),
      is_public: true,
    }),
  });
}

/** Retract a published signal */
export async function retractTripSignal(signalId: string): Promise<void> {
  await apiFetch(`/api/social/signals/${signalId}`, { method: 'DELETE' });
}

/** Get the current user's active signals */
export async function getMySignals(): Promise<TripSignal[]> {
  return apiFetch<TripSignal[]>('/api/social/signals');
}

// ─── Discovery ───────────────────────────────────────────────────────────────

/** List public travelers (optionally filtered by destination slug) */
export async function listTravelers(options?: {
  destinationSlug?: string;
  limit?: number;
  offset?: number;
}): Promise<TravelerWithSignal[]> {
  const params = new URLSearchParams();
  if (options?.destinationSlug) params.set('destination', options.destinationSlug);
  if (options?.limit)  params.set('limit',  String(options.limit));
  if (options?.offset) params.set('offset', String(options.offset));

  const qs = params.toString();
  return apiFetch<TravelerWithSignal[]>(`/api/social/companions${qs ? `?${qs}` : ''}`);
}

/** Count public travelers going to a destination (for social-proof badges) */
export async function getTravelerCount(destinationSlug: string): Promise<number> {
  const data = await apiFetch<{ count: number }>(
    `/api/social/companions/count?destination=${encodeURIComponent(destinationSlug)}`
  );
  return data.count;
}

/** Fetch top public destinations for discovery / social proof surfaces */
export async function listDestinationPulses(limit = 6): Promise<DestinationPulse[]> {
  const data = await apiFetch<DestinationPulse[]>(`/api/social/destinations?limit=${limit}`);
  return data;
}

/** Fetch travelers going to the same destinations as the current user */
export async function getCompanionSuggestions(limit = 6): Promise<TravelerWithSignal[]> {
  return apiFetch<TravelerWithSignal[]>(`/api/social/companions/suggestions?limit=${limit}`);
}

// ─── Waves ───────────────────────────────────────────────────────────────────

/** Send a wave to another traveler */
export async function sendWave(toUserId: string): Promise<void> {
  await apiFetch('/api/social/waves', {
    method: 'POST',
    body: JSON.stringify({ to_user: toUserId }),
  });
}

/** Revoke / un-wave */
export async function retractWave(toUserId: string): Promise<void> {
  await apiFetch(`/api/social/waves/${toUserId}`, { method: 'DELETE' });
}

/** Accept a wave — upgrades status to 'connected' */
export async function acceptWave(fromUserId: string): Promise<void> {
  await apiFetch(`/api/social/waves/${fromUserId}/accept`, { method: 'POST' });
}

/** Get incoming waves (people who waved at you) — count only for privacy */
export async function getIncomingWaveCount(): Promise<number> {
  const data = await apiFetch<{ count: number }>('/api/social/waves/incoming/count');
  return data.count;
}

// ─── Messages ────────────────────────────────────────────────────────────────

/** Send a short direct message to another public traveler */
export async function sendTravelerMessage(toUserId: string, body: string): Promise<TravelerMessage> {
  return apiFetch<TravelerMessage>('/api/social/messages', {
    method: 'POST',
    body: JSON.stringify({ to_user: toUserId, body }),
  });
}

/** List direct messages received by the current traveler */
export async function getTravelerMessages(): Promise<TravelerMessage[]> {
  return apiFetch<TravelerMessage[]>('/api/social/messages');
}

// ─── Trip Rooms ───────────────────────────────────────────────────────────────

/** List open trip rooms, optionally filtered by destination */
export async function listTripRooms(destinationSlug?: string): Promise<TripRoom[]> {
  const qs = destinationSlug ? `?destination=${encodeURIComponent(destinationSlug)}` : '';
  return apiFetch<TripRoom[]>(`/api/social/rooms${qs}`);
}

/** List the rooms the current traveler has joined or created */
export async function listMyTripRooms(): Promise<TripRoom[]> {
  return apiFetch<TripRoom[]>('/api/social/rooms/mine');
}

/** Create a new trip room */
export async function createTripRoom(payload: {
  destination: string;
  title?: string;
  travelMonth?: string;
}): Promise<TripRoom> {
  return apiFetch<TripRoom>('/api/social/rooms', {
    method: 'POST',
    body: JSON.stringify({
      destination: payload.destination,
      destination_slug: slugifyDestination(payload.destination),
      title: payload.title ?? `Trip to ${payload.destination}`,
      travel_month: payload.travelMonth ?? formatTravelMonth(),
    }),
  });
}

/** Join an open trip room */
export async function joinTripRoom(roomId: string): Promise<{ joined: boolean; already_joined: boolean }> {
  return apiFetch(`/api/social/rooms/${roomId}/join`, { method: 'POST' });
}

/** Leave a trip room */
export async function leaveTripRoom(roomId: string): Promise<void> {
  await apiFetch(`/api/social/rooms/${roomId}/leave`, { method: 'POST' });
}

/** Get full room details including member list */
export async function getTripRoom(
  roomId: string
): Promise<TripRoom & { members: TripRoomMember[] }> {
  return apiFetch(`/api/social/rooms/${roomId}`);
}
