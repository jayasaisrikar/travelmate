import { test, expect } from '@playwright/test';
import { SocialApiError } from '../../services/social';

test('SocialApiError carries status and code', () => {
  const err = new SocialApiError('verification_required', 403, 'verification_required', 'unverified');
  expect(err.status).toBe(403);
  expect(err.code).toBe('verification_required');
  expect(err.level).toBe('unverified');
});
