import type { Trip } from '@/lib/supabase-trips'

export type TripStatusTone = 'draft' | 'upcoming' | 'live' | 'completed'

export interface TripStatus {
  label: string
  tone: TripStatusTone
}

/**
 * Derive a human, calendar-aware status for a trip. Pure + total.
 * `today` is an ISO YYYY-MM-DD string (defaults to the current date).
 */
export function getTripStatus(trip: Pick<Trip, 'trip_start_date' | 'trip_end_date'>, today: string = isoToday()): TripStatus {
  const start = trip.trip_start_date ?? null
  const end = trip.trip_end_date ?? null
  if (!start || !end) return { label: 'Draft', tone: 'draft' }
  if (today < start) return { label: 'Upcoming', tone: 'upcoming' }
  if (today > end) return { label: 'Completed', tone: 'completed' }
  return { label: 'On trip', tone: 'live' }
}

/** Days until a trip starts; null when no start date or already started. */
export function daysUntilStart(trip: Pick<Trip, 'trip_start_date'>, today: string = isoToday()): number | null {
  const start = trip.trip_start_date ?? null
  if (!start || start <= today) return null
  const ms = Date.parse(start) - Date.parse(today)
  if (Number.isNaN(ms)) return null
  return Math.round(ms / 86_400_000)
}

/** Compact human date range, e.g. "21–25 Jun" or "21 Jun – 3 Jul". Null when dates missing. */
export function formatTripDateRange(trip: Pick<Trip, 'trip_start_date' | 'trip_end_date'>): string | null {
  const start = trip.trip_start_date ?? null
  const end = trip.trip_end_date ?? null
  if (!start || !end) return null
  const s = new Date(start)
  const e = new Date(end)
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return null
  const day = (d: Date) => d.getUTCDate()
  const mon = (d: Date) => d.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' })
  const yr = (d: Date) => d.getUTCFullYear()
  if (yr(s) === yr(e) && mon(s) === mon(e)) return `${day(s)}–${day(e)} ${mon(s)}`
  if (yr(s) === yr(e)) return `${day(s)} ${mon(s)} – ${day(e)} ${mon(e)}`
  return `${day(s)} ${mon(s)} ${yr(s)} – ${day(e)} ${mon(e)} ${yr(e)}`
}

function isoToday(): string {
  return new Date().toISOString().slice(0, 10)
}
