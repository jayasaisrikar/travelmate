/**
 * services/social.ts
 *
 * All client-side social feature logic: traveler profiles, tripmate
 * requests, trip signals, and trip rooms. Every mutation goes through the
 * /api/social/* routes so we can enforce server-side rules cleanly.
 */

import { getSupabaseBrowser } from '@/services/supabase-browser';
import type {
  SocialVerificationLevel,
  SocialVerificationStatus,
} from '@/services/social-verification';

// ─── Shared types ────────────────────────────────────────────────────────────

export interface TravelerProfile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  travel_style: 'solo' | 'couple' | 'group' | 'flexible' | null;
  interests: string[];
  languages: string[];
  budget_preference: 'budget' | 'moderate' | 'comfort' | 'luxury' | null;
  pace_preference: 'slow' | 'balanced' | 'fast' | null;
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
}

/**
 * Connection state of the viewer toward a traveller.
 *   request_sent     — viewer sent a pending tripmate request
 *   request_received — traveller sent the viewer a pending request
 *   connected        — an accepted request links the two (messaging unlocked)
 */
export type ConnectionStatus =
  | 'none'
  | 'request_sent'
  | 'request_received'
  | 'connected'
  | 'blocked';

export interface TravelerWithSignal extends TravelerProfile {
  signal_id: string;
  destination: string;
  destination_slug: string;
  travel_month: string | null;
  connection_status: ConnectionStatus;
  /** Match score 0–100 vs the viewer's trips (null when not computable). */
  match_score: number | null;
  /** Human-readable reasons behind the match score. */
  match_reasons: string[];
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
    throw new Error(
      (body as { error?: string } | null)?.error ??
        `Social API error ${res.status}`
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
  patch: Partial<Pick<TravelerProfile,
    'display_name' | 'avatar_url' | 'bio' | 'travel_style' | 'is_public'
    | 'interests' | 'languages' | 'budget_preference' | 'pace_preference'>>
): Promise<TravelerProfile> {
  return apiFetch<TravelerProfile>('/api/social/profile', {
    method: 'POST',
    body: JSON.stringify(patch),
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

// ─── Tripmate requests (PRD §10.7) ────────────────────────────────────────────

export type TripmateRequestReason =
  | 'same_destination'
  | 'same_dates'
  | 'collaborate_itinerary'
  | 'one_activity'
  | 'coffee_meetup'
  | 'ask_suggestions'
  | 'full_tripmate';

export type TripmateRequestStatus =
  | 'pending'
  | 'accepted'
  | 'declined'
  | 'expired'
  | 'cancelled';

/** Display metadata for each structured request reason. */
export const REQUEST_REASONS: { id: TripmateRequestReason; label: string; hint: string }[] = [
  { id: 'same_destination',      label: 'Same destination',      hint: "We're headed to the same place" },
  { id: 'same_dates',            label: 'Overlapping dates',     hint: 'Our travel dates line up' },
  { id: 'collaborate_itinerary', label: 'Plan together',         hint: 'Collaborate on an itinerary' },
  { id: 'one_activity',          label: 'Join one activity',     hint: 'Just one shared activity' },
  { id: 'coffee_meetup',         label: 'Meet for coffee',       hint: 'A low-pressure local meetup' },
  { id: 'ask_suggestions',       label: 'Ask for tips',          hint: 'Get local or route suggestions' },
  { id: 'full_tripmate',         label: 'Full tripmate',         hint: 'Travel together for the trip' },
];

/** Maximum characters allowed in a first-contact request message. */
export const REQUEST_MESSAGE_LIMIT = 300;

export interface TripmateRequest {
  id: string;
  from_user: string;
  to_user: string;
  reason: TripmateRequestReason;
  message: string | null;
  status: TripmateRequestStatus;
  match_score: number | null;
  expires_at: string;
  created_at: string;
  /** Direction relative to the current user. */
  direction: 'incoming' | 'outgoing';
  /** The other party's lightweight profile. */
  counterpart: Pick<TravelerProfile,
    'id' | 'display_name' | 'avatar_url' | 'verified' | 'verification_level'> | null;
}

/** Send a structured tripmate request (must precede any messaging). */
export async function sendTripmateRequest(payload: {
  toUserId: string;
  reason: TripmateRequestReason;
  message?: string;
  fromSignalId?: string;
  toSignalId?: string;
}): Promise<TripmateRequest> {
  return apiFetch<TripmateRequest>('/api/social/requests', {
    method: 'POST',
    body: JSON.stringify({
      to_user: payload.toUserId,
      reason: payload.reason,
      message: payload.message,
      from_signal: payload.fromSignalId,
      to_signal: payload.toSignalId,
    }),
  });
}

/** Cancel an outgoing pending request. */
export async function cancelTripmateRequest(requestId: string): Promise<void> {
  await apiFetch(`/api/social/requests/${requestId}`, {
    method: 'PATCH',
    body: JSON.stringify({ action: 'cancel' }),
  });
}

/** Recipient responds to an incoming request. */
export async function respondToTripmateRequest(
  requestId: string,
  action: 'accept' | 'decline'
): Promise<TripmateRequest> {
  return apiFetch<TripmateRequest>(`/api/social/requests/${requestId}`, {
    method: 'PATCH',
    body: JSON.stringify({ action }),
  });
}

/** List the current user's requests (incoming + outgoing). */
export async function listTripmateRequests(): Promise<{
  incoming: TripmateRequest[];
  outgoing: TripmateRequest[];
}> {
  return apiFetch('/api/social/requests');
}

/** Count of pending incoming requests — for nav badges. */
export async function getIncomingRequestCount(): Promise<number> {
  const data = await apiFetch<{ count: number }>('/api/social/requests/incoming/count');
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
