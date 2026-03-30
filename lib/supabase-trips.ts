import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase credentials missing - trips will use localStorage fallback')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export interface Trip {
  id: string
  destination: string
  duration: number
  budget: string
  interests: string[]
  itinerary: any
  created_at: string
  updated_at: string
}

// Save trip to Supabase (with localStorage fallback)
export async function saveTrip(tripData: Omit<Trip, 'id' | 'created_at' | 'updated_at'>) {
  const tripId = Date.now().toString()
  
  // Try Supabase first
  if (supabaseUrl && supabaseAnonKey) {
    try {
      const { data, error } = await supabase
        .from('trips')
        .insert({
          id: tripId,
          ...tripData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (!error && data) {
        return data
      }
    } catch (err) {
      console.warn('Supabase save failed, using localStorage fallback', err)
    }
  }

  // Fallback: localStorage
  const trip: Trip = {
    id: tripId,
    ...tripData,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
  
  if (typeof window !== 'undefined') {
    localStorage.setItem(`trip-${tripId}`, JSON.stringify(trip))
  }
  
  return trip
}

// Load trip from Supabase (with localStorage fallback)
export async function loadTrip(tripId: string) {
  // Try Supabase first
  if (supabaseUrl && supabaseAnonKey) {
    try {
      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .eq('id', tripId)
        .single()

      if (!error && data) {
        return data as Trip
      }
    } catch (err) {
      console.warn('Supabase load failed, trying localStorage fallback', err)
    }
  }

  // Fallback: localStorage
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(`trip-${tripId}`)
    if (stored) {
      return JSON.parse(stored) as Trip
    }
  }

  return null
}

// List all trips for user (with localStorage fallback)
export async function listTrips() {
  // Try Supabase first
  if (supabaseUrl && supabaseAnonKey) {
    try {
      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .order('created_at', { ascending: false })

      if (!error && data) {
        return data as Trip[]
      }
    } catch (err) {
      console.warn('Supabase list failed, trying localStorage fallback', err)
    }
  }

  // Fallback: localStorage
  if (typeof window !== 'undefined') {
    const trips: Trip[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith('trip-')) {
        const stored = localStorage.getItem(key)
        if (stored) {
          trips.push(JSON.parse(stored))
        }
      }
    }
    return trips.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }

  return []
}

// Delete trip from Supabase (with localStorage fallback)
export async function deleteTrip(tripId: string) {
  // Try Supabase first
  if (supabaseUrl && supabaseAnonKey) {
    try {
      const { error } = await supabase
        .from('trips')
        .delete()
        .eq('id', tripId)

      if (!error) {
        return true
      }
    } catch (err) {
      console.warn('Supabase delete failed, trying localStorage fallback', err)
    }
  }

  // Fallback: localStorage
  if (typeof window !== 'undefined') {
    localStorage.removeItem(`trip-${tripId}`)
    return true
  }

  return false
}
