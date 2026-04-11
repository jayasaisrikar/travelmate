import { getSupabaseBrowser } from '@/services/supabase-browser'

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
  tripData: Omit<Trip, 'id' | 'created_at' | 'updated_at'>
): Promise<Trip> {
  return fetchTripApi<Trip>('/api/trips', {
    method: 'POST',
    body: JSON.stringify({
      id: createTripId(),
      ...tripData,
    }),
  })
}

export async function loadTrip(tripId: string): Promise<Trip | null> {
  const data = await fetchTripApi<{ trip: Trip | null }>(`/api/trips/${encodeURIComponent(tripId)}`)
  return data.trip
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
