// Currency localisation: map a place to its currency and convert between
// currencies using free, no-key, daily-updated exchange rates.
//
// Primary rate source : fawazahmed0 currency-api (jsDelivr CDN, no key, no rate
//                       limit, covers every fiat + crypto).
// Fallback rate source: Frankfurter (ECB data, no key, ~30 major currencies).
//
// Item costs in a trip are denominated in the destination's currency; the budget
// total is converted to the traveler's home currency for a familiar headline.

import type { TripCurrency } from '@/lib/travel-types';

const RATES_PRIMARY_URL =
  'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json';
const RATES_FALLBACK_URL = 'https://api.frankfurter.dev/v1/latest?base=USD';

const RATES_TTL_MS = 12 * 60 * 60 * 1000; // rates move slowly; refresh twice a day

// ISO 3166-1 alpha-2 country code -> ISO 4217 currency code. Covers the common
// travel markets; anything unmapped falls back to USD.
const COUNTRY_TO_CURRENCY: Record<string, string> = {
  us: 'USD', ca: 'CAD', mx: 'MXN', br: 'BRL', ar: 'ARS', cl: 'CLP', co: 'COP', pe: 'PEN',
  gb: 'GBP', ie: 'EUR', fr: 'EUR', de: 'EUR', es: 'EUR', pt: 'EUR', it: 'EUR', nl: 'EUR',
  be: 'EUR', at: 'EUR', gr: 'EUR', fi: 'EUR', lu: 'EUR', sk: 'EUR', si: 'EUR', ee: 'EUR',
  lv: 'EUR', lt: 'EUR', cy: 'EUR', mt: 'EUR', hr: 'EUR',
  ch: 'CHF', no: 'NOK', se: 'SEK', dk: 'DKK', is: 'ISK', pl: 'PLN', cz: 'CZK', hu: 'HUF',
  ro: 'RON', bg: 'BGN', ua: 'UAH', ru: 'RUB', tr: 'TRY',
  in: 'INR', pk: 'PKR', bd: 'BDT', lk: 'LKR', np: 'NPR',
  cn: 'CNY', jp: 'JPY', kr: 'KRW', tw: 'TWD', hk: 'HKD', mo: 'MOP',
  th: 'THB', vn: 'VND', id: 'IDR', my: 'MYR', sg: 'SGD', ph: 'PHP', kh: 'KHR', la: 'LAK',
  mm: 'MMK',
  ae: 'AED', sa: 'SAR', qa: 'QAR', kw: 'KWD', bh: 'BHD', om: 'OMR', jo: 'JOD', il: 'ILS',
  lb: 'LBP', eg: 'EGP', ma: 'MAD', tn: 'TND', za: 'ZAR', ng: 'NGN', ke: 'KES', gh: 'GHS',
  tz: 'TZS', et: 'ETB', ug: 'UGX',
  au: 'AUD', nz: 'NZD', fj: 'FJD',
};

let ratesCache: { fetchedAt: number; usdRates: Record<string, number> } | null = null;

function normalizeCode(code: string | null | undefined): string {
  return (code ?? '').trim().toUpperCase();
}

export function currencyForCountryCode(countryCode: string | null | undefined): string {
  const key = (countryCode ?? '').trim().toLowerCase();
  return COUNTRY_TO_CURRENCY[key] ?? 'USD';
}

async function fetchUsdRates(): Promise<Record<string, number>> {
  if (ratesCache && Date.now() - ratesCache.fetchedAt < RATES_TTL_MS) {
    return ratesCache.usdRates;
  }

  const fetchWithTimeout = async (url: string, timeoutMs: number) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, { signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }
  };

  // Primary: { date, usd: { inr: 95.2, eur: 0.86, ... } } (lowercase codes)
  try {
    const response = await fetchWithTimeout(RATES_PRIMARY_URL, 6_000);
    if (response.ok) {
      const data = (await response.json()) as { usd?: Record<string, number> };
      if (data.usd && Object.keys(data.usd).length > 0) {
        const usdRates: Record<string, number> = {};
        for (const [code, value] of Object.entries(data.usd)) {
          if (typeof value === 'number' && Number.isFinite(value)) {
            usdRates[code.toUpperCase()] = value;
          }
        }
        usdRates.USD = 1;
        ratesCache = { fetchedAt: Date.now(), usdRates };
        return usdRates;
      }
    }
  } catch {
    // fall through to Frankfurter
  }

  // Fallback: { base: 'USD', rates: { INR: 95.1, EUR: 0.86, ... } } (uppercase codes)
  try {
    const response = await fetchWithTimeout(RATES_FALLBACK_URL, 6_000);
    if (response.ok) {
      const data = (await response.json()) as { rates?: Record<string, number> };
      if (data.rates && Object.keys(data.rates).length > 0) {
        const usdRates: Record<string, number> = { USD: 1 };
        for (const [code, value] of Object.entries(data.rates)) {
          if (typeof value === 'number' && Number.isFinite(value)) {
            usdRates[code.toUpperCase()] = value;
          }
        }
        ratesCache = { fetchedAt: Date.now(), usdRates };
        return usdRates;
      }
    }
  } catch {
    // fall through to empty
  }

  return ratesCache?.usdRates ?? { USD: 1 };
}

/**
 * Conversion factor: `amount in {from}` * factor = `amount in {to}`.
 * Returns 1 when either currency is unknown so callers degrade gracefully.
 */
export async function getConversionRate(from: string, to: string): Promise<number> {
  const fromCode = normalizeCode(from);
  const toCode = normalizeCode(to);

  if (!fromCode || !toCode || fromCode === toCode) {
    return 1;
  }

  const usdRates = await fetchUsdRates();
  const fromPerUsd = usdRates[fromCode];
  const toPerUsd = usdRates[toCode];

  if (!fromPerUsd || !toPerUsd) {
    return 1;
  }

  return toPerUsd / fromPerUsd;
}

/**
 * Resolve the currency metadata for a trip: the destination currency that item
 * costs use, the traveler's home currency, and the factor to convert a
 * destination-currency total into the home currency.
 */
export async function resolveTripCurrency(options: {
  destinationCountryCode?: string | null;
  destinationCurrency?: string | null;
  homeCurrency?: string | null;
}): Promise<TripCurrency> {
  const display = normalizeCode(
    options.destinationCurrency || currencyForCountryCode(options.destinationCountryCode)
  ) || 'USD';
  const home = normalizeCode(options.homeCurrency) || 'USD';
  const rateToHome = await getConversionRate(display, home);

  return { display, home, rateToHome };
}
