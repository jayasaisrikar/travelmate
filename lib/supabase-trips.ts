import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ''

// Only create client if credentials exist — createClient('','') throws and crashes the app
let supabase: SupabaseClient | null = null
try {
  if (supabaseUrl && supabaseAnonKey) {
    supabase = createClient(supabaseUrl, supabaseAnonKey)
  }
} catch (err) {
  console.warn('Supabase init failed, using localStorage fallback', err)
}

export { supabase }

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

export async function saveTrip(tripData: Omit<Trip, 'id' | 'created_at' | 'updated_at'>) {
  const tripId = Date.now().toString()

  if (supabase) {
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
      if (!error && data) return data as Trip
    } catch (err) {
      console.warn('Supabase save failed, using localStorage', err)
    }
  }

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

export async function loadTrip(tripId: string): Promise<Trip | null> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .eq('id', tripId)
        .single()
      if (!error && data) return data as Trip
    } catch (err) {
      console.warn('Supabase load failed, trying localStorage', err)
    }
  }

  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(`trip-${tripId}`)
    if (stored) return JSON.parse(stored) as Trip
  }
  return null
}

export async function listTrips(): Promise<Trip[]> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .order('created_at', { ascending: false })
      if (!error && data) return data as Trip[]
    } catch (err) {
      console.warn('Supabase list failed, trying localStorage', err)
    }
  }

  if (typeof window !== 'undefined') {
    const trips: Trip[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith('trip-')) {
        const stored = localStorage.getItem(key)
        if (stored) trips.push(JSON.parse(stored))
      }
    }
    return trips.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }
  return []
}

export async function deleteTrip(tripId: string): Promise<boolean> {
  if (supabase) {
    try {
      const { error } = await supabase.from('trips').delete().eq('id', tripId)
      if (!error) return true
    } catch (err) {
      console.warn('Supabase delete failed, trying localStorage', err)
    }
  }

  if (typeof window !== 'undefined') {
    localStorage.removeItem(`trip-${tripId}`)
    return true
  }
  return false
}
