import { getSupabaseBrowser } from '@/services/supabase-browser'
import type {
  BookingConfirmationExtraction,
  GeneratedItinerary,
  TravelerPreferences,
  TripShareRecord,
  TripSuggestion,
  ItineraryGenerationInput,
} from '@/lib/travel-types'

function createTripId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}`
}

export interface Trip {
  id: string
  user_id?: string
  destination: string
  duration: number
  budget: string
  interests: string[]
  itinerary: GeneratedItinerary
  cover_image_url?: string | null
  created_at: string
  updated_at: string
  trip_start_date?: string | null
  trip_end_date?: string | null
  dest_lat?: number | null
  dest_lng?: number | null
  is_published?: boolean
  published_at?: string | null
  destination_slug?: string | null
}

export interface TripSharePayload {
  id: string
  trip_id: string
  owner_user_id: string
  token: string
  share_title: string | null
  share_description: string | null
  share_image_url: string | null
  revoked_at: string | null
  created_at: string
  updated_at: string
  shareUrl: string
}

export interface TripLoadResponse {
  trip: Trip | null
  share: TripSharePayload | null
  shareUrl: string | null
}

async function fetchTripApi<T>(path: string, init?: RequestInit): Promise<T> {
  const { data: sessionData } = await getSupabaseBrowser().auth.getSession()
  const accessToken = sessionData.session?.access_token

  const response = await fetch(path, {
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(init?.headers || {}),
    },
    ...init,
  })

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(payload?.error || `Trip API request failed with status ${response.status}`)
  }

  return payload as T
}

export async function saveTrip(
  tripData: Omit<Trip, 'id' | 'created_at' | 'updated_at'> & {
    preferences?: TravelerPreferences | null;
  }
): Promise<Trip> {
  return fetchTripApi<Trip>('/api/trips', {
    method: 'POST',
    body: JSON.stringify({
      id: createTripId(),
      ...tripData,
    }),
  })
}

export async function updateTripItinerary(
  tripId: string,
  itinerary: Trip['itinerary']
): Promise<Trip> {
  const data = await fetchTripApi<{ trip: Trip }>(`/api/trips/${encodeURIComponent(tripId)}`, {
    method: 'PATCH',
    body: JSON.stringify({ itinerary }),
  })

  return data.trip
}

export async function updateTripDates(
  tripId: string,
  dates: { trip_start_date: string; trip_end_date: string }
): Promise<Trip> {
  const data = await fetchTripApi<{ trip: Trip }>(`/api/trips/${encodeURIComponent(tripId)}`, {
    method: 'PATCH',
    body: JSON.stringify(dates),
  })

  return data.trip
}

export async function updateTripDetails(
  tripId: string,
  input: Partial<Pick<Trip, 'destination' | 'duration' | 'budget' | 'interests' | 'itinerary'>>
): Promise<{ trip: Trip; shareUrl: string | null; shareToken: string | null }> {
  const data = await fetchTripApi<{
    trip: Trip
    shareUrl: string | null
    share?: { token?: string | null } | null
  }>(`/api/trips/${encodeURIComponent(tripId)}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })

  return {
    trip: data.trip,
    shareUrl: data.shareUrl ?? null,
    shareToken: data.share?.token ?? null,
  }
}

export async function regenerateFullTrip(
  tripId: string,
  input: ItineraryGenerationInput & {
    preferences?: TravelerPreferences | null;
  }
): Promise<{ trip: Trip; shareUrl: string | null; shareToken: string | null }> {
  const data = await fetchTripApi<{
    trip: Trip
    shareUrl: string | null
    share?: { token?: string | null } | null
  }>(`/api/trips/${encodeURIComponent(tripId)}/regenerate`, {
    method: 'POST',
    body: JSON.stringify({
      scope: 'full',
      ...input,
    }),
  })

  return {
    trip: data.trip,
    shareUrl: data.shareUrl ?? null,
    shareToken: data.share?.token ?? null,
  }
}

export async function loadTrip(tripId: string): Promise<TripLoadResponse> {
  return fetchTripApi<TripLoadResponse>(`/api/trips/${encodeURIComponent(tripId)}`)
}

export async function listTrips(): Promise<Trip[]> {
  const data = await fetchTripApi<{ trips: Trip[] }>('/api/trips')
  return data.trips || []
}

export async function deleteTrip(tripId: string): Promise<boolean> {
  await fetchTripApi<{ success: boolean }>(`/api/trips/${encodeURIComponent(tripId)}`, {
    method: 'DELETE',
  })

  return true
}

export async function retryTripStay(
  tripId: string,
  payload: {
    budgetRange: string;
    preferredLocation: string;
  }
): Promise<Trip> {
  const data = await fetchTripApi<{ trip: Trip }>(`/api/trips/${encodeURIComponent(tripId)}/stay`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })

  return data.trip
}

export async function createTripShare(
  tripId: string,
  regenerate = false
): Promise<{ shareUrl: string; shareToken: string }> {
  const data = await fetchTripApi<{ share: TripShareRecord | null; shareUrl: string | null }>(
    `/api/trips/${encodeURIComponent(tripId)}/share`,
    {
      method: 'POST',
      body: JSON.stringify({ regenerate }),
    }
  )

  return {
    shareUrl: data.shareUrl || '',
    shareToken: data.share?.token || '',
  }
}

export async function getTripShare(tripId: string): Promise<TripShareRecord | null> {
  const data = await fetchTripApi<{ share: TripShareRecord | null }>(
    `/api/trips/${encodeURIComponent(tripId)}/share`
  )
  return data.share
}

export async function revokeTripShare(tripId: string): Promise<boolean> {
  await fetchTripApi<{ success: boolean }>(`/api/trips/${encodeURIComponent(tripId)}/share`, {
    method: 'DELETE',
  })

  return true
}

export async function loadTripSuggestions(tripId: string): Promise<TripSuggestion[]> {
  const data = await fetchTripApi<{ suggestions: TripSuggestion[] }>(
    `/api/trips/${encodeURIComponent(tripId)}/suggestions`
  )
  return data.suggestions || []
}

export async function parseBookingConfirmation(input: {
  subject?: string;
  from?: string;
  text?: string;
  html?: string;
  receivedAt?: string;
}): Promise<BookingConfirmationExtraction> {
  const data = await fetchTripApi<{ parsedConfirmation: BookingConfirmationExtraction }>(
    '/api/booking-confirmations/parse',
    {
      method: 'POST',
      body: JSON.stringify(input),
    }
  )

  return data.parsedConfirmation
}

export async function importBookingConfirmation(input: {
  subject?: string;
  from?: string;
  text?: string;
  html?: string;
  receivedAt?: string;
  parsedConfirmation?: BookingConfirmationExtraction | null;
  tripId?: string;
}): Promise<{
  parsedConfirmation: BookingConfirmationExtraction;
  trip: Trip;
  share: TripShareRecord | null;
  shareUrl: string | null;
}> {
  return fetchTripApi<{
    parsedConfirmation: BookingConfirmationExtraction;
    trip: Trip;
    share: TripShareRecord | null;
    shareUrl: string | null;
  }>('/api/booking-confirmations/import', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function regenerateTripItinerarySection(input: {
  tripId: string;
  scope: 'day' | 'cluster';
  dayIndex: number;
  activityIndex?: number | null;
  instruction: string;
}): Promise<Trip> {
  const data = await fetchTripApi<{ trip: Trip }>(
    `/api/trips/${encodeURIComponent(input.tripId)}/regenerate`,
    {
      method: 'POST',
      body: JSON.stringify({
        scope: input.scope,
        dayIndex: input.dayIndex,
        activityIndex: input.activityIndex ?? null,
        instruction: input.instruction,
      }),
    }
  )

  return data.trip
}
