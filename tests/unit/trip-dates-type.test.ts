import { test, expect } from '@playwright/test';
import type { Trip } from '../../lib/supabase-trips';

test('Trip type includes date and coordinate fields', () => {
  const t: Pick<Trip, 'trip_start_date' | 'trip_end_date' | 'dest_lat' | 'dest_lng'> = {
    trip_start_date: '2026-06-21',
    trip_end_date: '2026-06-25',
    dest_lat: 19.07,
    dest_lng: 72.87,
  };
  expect(t.trip_start_date).toBe('2026-06-21');
  expect(t.dest_lat).toBeCloseTo(19.07);
});
