import { test, expect } from '@playwright/test';
import { isWithinTripWindow, evaluatePresence, PRESENCE_RADIUS_KM } from '../../services/presence';

test('radius constant is 50', () => {
  expect(PRESENCE_RADIUS_KM).toBe(50);
});

test('within trip window inclusive', () => {
  expect(isWithinTripWindow('2026-06-22', '2026-06-21', '2026-06-25')).toBe(true);
  expect(isWithinTripWindow('2026-06-21', '2026-06-21', '2026-06-25')).toBe(true);
  expect(isWithinTripWindow('2026-06-26', '2026-06-21', '2026-06-25')).toBe(false);
  expect(isWithinTripWindow('2026-06-22', null, '2026-06-25')).toBe(false);
});

test('evaluatePresence flags within/outside 50km', () => {
  // same point → 0 km
  const here = evaluatePresence({ destLat: 19.07, destLng: 72.87, lat: 19.07, lng: 72.87 });
  expect(here.withinRadius).toBe(true);
  expect(here.distanceKm).toBeLessThan(1);
  // ~ Delhi vs Mumbai → ~1150 km → outside
  const far = evaluatePresence({ destLat: 19.07, destLng: 72.87, lat: 28.61, lng: 77.21 });
  expect(far.withinRadius).toBe(false);
  expect(far.distanceKm).toBeGreaterThan(PRESENCE_RADIUS_KM);
});
