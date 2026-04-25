import { randomBytes } from 'crypto';

import { supabase } from '@/services/supabase';
import { lookupDestinationPhotoUrl } from '@/services/place-photo';
import type {
  GeneratedItinerary,
  TripShareRecord,
  TripSuggestionRecord,
} from '@/lib/travel-types';

export interface TripRow {
  id: string;
  user_id: string | null;
  destination: string;
  duration: number;
  budget: string;
  interests: string[];
  itinerary: GeneratedItinerary;
  cover_image_url: string | null;
  created_at: string;
  updated_at: string;
}

export function createShareToken() {
  return randomBytes(24).toString('base64url');
}

export async function buildSharePreview(trip: Pick<TripRow, 'destination' | 'duration' | 'cover_image_url'>) {
  const destination = trip.destination.trim();
  const imageUrl = trip.cover_image_url ?? (await lookupDestinationPhotoUrl(destination));

  return {
    title: `${destination} trip on wayflo`,
    description: `Check out my ${trip.duration}-day trip to ${destination} and leave suggestions on wayflo.`,
    imageUrl,
  };
}

export function buildPublicShareUrl(baseUrl: string, token: string) {
  return new URL(`/share/${encodeURIComponent(token)}`, baseUrl).toString();
}

export async function getTripShareByTripId(tripId: string, ownerUserId: string) {
  const { data, error } = await supabase
    .from('trip_shares')
    .select('*')
    .eq('trip_id', tripId)
    .eq('owner_user_id', ownerUserId)
    .maybeSingle();

  if (error) {
    return { share: null as TripShareRecord | null, error };
  }

  return { share: (data ?? null) as TripShareRecord | null, error: null };
}

export async function getTripShareByToken(token: string) {
  const { data, error } = await supabase
    .from('trip_shares')
    .select('*')
    .eq('token', token)
    .is('revoked_at', null)
    .maybeSingle();

  if (error) {
    return { share: null as TripShareRecord | null, error };
  }

  return { share: (data ?? null) as TripShareRecord | null, error: null };
}

export async function createOrRefreshTripShare(trip: TripRow, ownerUserId: string) {
  const preview = await buildSharePreview(trip);
  const token = createShareToken();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('trip_shares')
    .upsert(
      {
        trip_id: trip.id,
        owner_user_id: ownerUserId,
        token,
        share_title: preview.title,
        share_description: preview.description,
        share_image_url: preview.imageUrl,
        revoked_at: null,
        updated_at: now,
      },
      { onConflict: 'trip_id' }
    )
    .select('*')
    .single();

  if (error || !data) {
    return { share: null as TripShareRecord | null, error };
  }

  return { share: data as TripShareRecord, error: null };
}

export async function revokeTripShare(tripId: string, ownerUserId: string) {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('trip_shares')
    .update({
      revoked_at: now,
      updated_at: now,
    })
    .eq('trip_id', tripId)
    .eq('owner_user_id', ownerUserId)
    .select('*')
    .maybeSingle();

  if (error) {
    return { share: null as TripShareRecord | null, error };
  }

  return { share: (data ?? null) as TripShareRecord | null, error: null };
}

export async function listTripSuggestionsByTripId(tripId: string, ownerUserId: string) {
  const { data, error } = await supabase
    .from('trip_suggestions')
    .select('*')
    .eq('trip_id', tripId)
    .eq('owner_user_id', ownerUserId)
    .order('created_at', { ascending: false });

  if (error) {
    return { suggestions: [] as TripSuggestionRecord[], error };
  }

  return { suggestions: (data ?? []) as TripSuggestionRecord[], error: null };
}

export async function countTripSuggestionsByShareId(shareId: string) {
  const { count, error } = await supabase
    .from('trip_suggestions')
    .select('*', { count: 'exact', head: true })
    .eq('share_id', shareId);

  if (error) {
    return { count: 0, error };
  }

  return { count: count ?? 0, error: null };
}

export async function createTripSuggestion(input: {
  share: TripShareRecord;
  tripId: string;
  guestName: string | null;
  guestEmail: string | null;
  message: string;
}) {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('trip_suggestions')
    .insert({
      share_id: input.share.id,
      trip_id: input.tripId,
      owner_user_id: input.share.owner_user_id,
      guest_name: input.guestName,
      guest_email: input.guestEmail,
      message: input.message,
      created_at: now,
      updated_at: now,
    })
    .select('*')
    .single();

  if (error || !data) {
    return { suggestion: null as TripSuggestionRecord | null, error };
  }

  return { suggestion: data as TripSuggestionRecord, error: null };
}
