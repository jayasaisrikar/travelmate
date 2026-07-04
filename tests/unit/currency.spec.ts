import { expect, test } from '@playwright/test';

import { currencyForCountryCode, getConversionRate, resolveTripCurrency } from '@/services/currency';

test.describe('currencyForCountryCode', () => {
  test('maps known countries to their currency', () => {
    expect(currencyForCountryCode('in')).toBe('INR');
    expect(currencyForCountryCode('jp')).toBe('JPY');
    expect(currencyForCountryCode('US')).toBe('USD'); // case-insensitive
    expect(currencyForCountryCode('fr')).toBe('EUR');
    expect(currencyForCountryCode('gb')).toBe('GBP');
  });

  test('falls back to USD for unknown or missing codes', () => {
    expect(currencyForCountryCode('zz')).toBe('USD');
    expect(currencyForCountryCode(null)).toBe('USD');
    expect(currencyForCountryCode(undefined)).toBe('USD');
  });
});

test.describe('getConversionRate', () => {
  test('returns 1 for identical or empty currencies without a network call', async () => {
    expect(await getConversionRate('USD', 'USD')).toBe(1);
    expect(await getConversionRate('INR', 'inr')).toBe(1);
    expect(await getConversionRate('', 'USD')).toBe(1);
  });

  test('returns a positive finite factor for cross-currency conversion', async () => {
    // Network-tolerant: a live rate when online, 1 when the fetch fails.
    const rate = await getConversionRate('USD', 'INR');
    expect(rate).toBeGreaterThan(0);
    expect(Number.isFinite(rate)).toBe(true);
  });
});

test.describe('resolveTripCurrency', () => {
  test('derives the destination currency from the country code', async () => {
    const currency = await resolveTripCurrency({
      destinationCountryCode: 'in',
      homeCurrency: 'INR',
    });
    expect(currency.display).toBe('INR');
    expect(currency.home).toBe('INR');
    expect(currency.rateToHome).toBe(1); // same currency, no conversion
  });

  test('defaults to USD when nothing is known', async () => {
    const currency = await resolveTripCurrency({});
    expect(currency.display).toBe('USD');
    expect(currency.home).toBe('USD');
    expect(currency.rateToHome).toBe(1);
  });

  test('explicit destination currency overrides the country lookup', async () => {
    const currency = await resolveTripCurrency({
      destinationCountryCode: 'in',
      destinationCurrency: 'EUR',
      homeCurrency: 'EUR',
    });
    expect(currency.display).toBe('EUR');
  });
});
