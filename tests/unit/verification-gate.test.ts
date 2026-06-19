import { test, expect } from '@playwright/test';
import { isVerificationRequiredError } from '../../hooks/useVerificationGate';
import { SocialApiError } from '../../services/social';

test('detects a verification_required SocialApiError', () => {
  expect(isVerificationRequiredError(new SocialApiError('x', 403, 'verification_required'))).toBe(true);
});

test('ignores other errors', () => {
  expect(isVerificationRequiredError(new SocialApiError('x', 500, 'boom'))).toBe(false);
  expect(isVerificationRequiredError(new Error('plain'))).toBe(false);
});
