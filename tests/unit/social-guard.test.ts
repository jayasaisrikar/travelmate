import { test, expect } from '@playwright/test';
import { isVerifiedLevel } from '../../services/social-guard';

test('trusted and high_trust are verified', () => {
  expect(isVerifiedLevel('trusted')).toBe(true);
  expect(isVerifiedLevel('high_trust')).toBe(true);
});

test('lower levels and unknowns are not verified', () => {
  expect(isVerifiedLevel('unverified')).toBe(false);
  expect(isVerifiedLevel('basic')).toBe(false);
  expect(isVerifiedLevel(null)).toBe(false);
  expect(isVerifiedLevel(undefined)).toBe(false);
});
