import { test, expect } from '@playwright/test';
import type { Trip } from '../../lib/supabase-trips';

test('Trip type includes publish fields', () => {
  const t: Pick<Trip, 'is_published' | 'published_at' | 'destination_slug'> = {
    is_published: true,
    published_at: '2026-06-20T00:00:00Z',
    destination_slug: 'mumbai',
  };
  expect(t.is_published).toBe(true);
  expect(t.destination_slug).toBe('mumbai');
});
