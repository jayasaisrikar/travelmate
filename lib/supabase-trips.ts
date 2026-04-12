import { getSupabaseBrowser } from '@/services/supabase-browser'
import type { TravelerPreferences, TripShareRecord, TripSuggestion } from '@/lib/travel-types'

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
  itinerary: any
  created_at: string
  updated_at: string
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
