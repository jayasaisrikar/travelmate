import { supabase } from '@/services/supabase';
import { createOrRefreshTripShare, type TripRow } from '@/services/trip-sharing';
import { saveTravelerPreferences } from '@/services/traveler-preferences';
import type { GeneratedItinerary, TravelerPreferences, TripShareRecord } from '@/lib/travel-types';

export async function createTripForUser(input: {
  id: string;
  userId: string;
  destination: string;
  duration: number;
  budget: string;
  interests: string[];
  itinerary: GeneratedItinerary;
  preferences?: TravelerPreferences | null;
  userEmail?: string | null;
}): Promise<{ trip: TripRow; share: TripShareRecord | null }> {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('trips')
    .insert({
      id: input.id,
      user_id: input.userId,
      destination: input.destination,
      duration: input.duration,
      budget: input.budget,
      interests: input.interests,
      itinerary: input.itinerary,
      created_at: now,
      updated_at: now,
    })
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Failed to save trip');
  }

  if (input.preferences) {
    const savedPreferences = await saveTravelerPreferences({
      userId: input.userId,
      email: input.userEmail ?? null,
      preferences: input.preferences,
    });

    if (!savedPreferences) {
      console.warn('[trip-writer] preference save failed', {
        tripId: data.id,
        userId: input.userId,
      });
    }
  }

  const { share, error: shareError } = await createOrRefreshTripShare(data as TripRow, input.userId);

  if (shareError) {
    console.warn('[trip-writer] share precreate failed', {
      tripId: data.id,
      error: shareError.message,
      code: shareError.code,
    });
  }

  return {
    trip: data as TripRow,
    share,
  };
}
