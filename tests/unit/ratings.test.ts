import { test, expect } from '@playwright/test';
import { canRateTrip, summarizeRatings } from '../../services/ratings';

const ended = { tripEndDate: '2026-06-19', today: '2026-06-20' };

test('verification checked first', () => {
  expect(canRateTrip({ isVerified: false, hasPresence: false, ...ended })).toEqual({ ok: false, reason: 'verification_required' });
});
test('then presence', () => {
  expect(canRateTrip({ isVerified: true, hasPresence: false, ...ended })).toEqual({ ok: false, reason: 'presence_required' });
});
test('then trip must have ended', () => {
  expect(canRateTrip({ isVerified: true, hasPresence: true, tripEndDate: '2026-06-25', today: '2026-06-20' })).toEqual({ ok: false, reason: 'trip_not_ended' });
  expect(canRateTrip({ isVerified: true, hasPresence: true, tripEndDate: null, today: '2026-06-20' })).toEqual({ ok: false, reason: 'trip_not_ended' });
});
test('all conditions pass', () => {
  expect(canRateTrip({ isVerified: true, hasPresence: true, ...ended })).toEqual({ ok: true });
});
test('summarize', () => {
  expect(summarizeRatings([{ stars: 5 }, { stars: 4 }, { stars: 4 }])).toEqual({ average: 4.3, count: 3 });
  expect(summarizeRatings([])).toEqual({ average: 0, count: 0 });
});
