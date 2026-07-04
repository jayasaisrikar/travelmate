import { expect, test } from '@playwright/test';

import { formatTripMoney } from '@/lib/utils';

test.describe('formatTripMoney', () => {
  test('formats as USD when no currency metadata is present', () => {
    expect(formatTripMoney(100, null)).toBe('$100');
  });

  test('converts a destination-currency amount into the home currency', () => {
    // 1000 INR at 0.012 INR->USD = $12, displayed in the home currency (USD).
    const result = formatTripMoney(1000, { display: 'INR', home: 'USD', rateToHome: 0.012 });
    expect(result).toBe('$12');
  });

  test('leaves the amount unchanged when home and destination match', () => {
    expect(formatTripMoney(250, { display: 'USD', home: 'USD', rateToHome: 1 })).toBe('$250');
  });

  test('treats a missing/invalid rate as 1 rather than zeroing the amount', () => {
    const result = formatTripMoney(500, { display: 'INR', home: 'INR', rateToHome: 0 });
    // INR formatting in en-US uses the ₹ symbol; the amount must survive.
    expect(result).toContain('500');
  });
});
