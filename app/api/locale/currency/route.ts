import { NextRequest, NextResponse } from 'next/server';

import { currencyForCountryCode, getConversionRate } from '@/services/currency';
import { resolveDestination } from '@/services/places';

// Resolves the traveler's home currency for onboarding. Precise GPS coordinates
// are used when available; otherwise we fall back to IP-based geolocation so the
// currency still reflects the user's actual location without any permission
// prompt. Always returns a currency so callers can degrade to USD.

async function fetchJson(url: string, timeoutMs = 5_000): Promise<Record<string, unknown> | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const response = await fetch(url, { signal: controller.signal }).finally(() => clearTimeout(timeout));
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function currencyFromIp(request: NextRequest): Promise<{ countryCode: string | null; currency: string } | null> {
  // On Vercel/Cloudflare the edge adds a country header for free — no call needed.
  const headerCountry =
    request.headers.get('x-vercel-ip-country') || request.headers.get('cf-ipcountry');
  if (headerCountry && headerCountry.length === 2) {
    return { countryCode: headerCountry.toLowerCase(), currency: currencyForCountryCode(headerCountry) };
  }

  // Local dev / self-hosted: free, no-key IP geolocation. ipwho.is (https) first,
  // ip-api.com (http) as a backup; both detect the country from the request IP.
  const ipwho = await fetchJson('https://ipwho.is/');
  const ipwhoCountry = typeof ipwho?.country_code === 'string' ? ipwho.country_code : null;
  if (ipwho && ipwho.success !== false && ipwhoCountry) {
    const currencyObject = ipwho.currency as { code?: string } | undefined;
    return {
      countryCode: ipwhoCountry.toLowerCase(),
      currency:
        typeof currencyObject?.code === 'string' && currencyObject.code.length === 3
          ? currencyObject.code.toUpperCase()
          : currencyForCountryCode(ipwhoCountry),
    };
  }

  const ipApi = await fetchJson('http://ip-api.com/json/?fields=status,countryCode,currency');
  const ipApiCountry = typeof ipApi?.countryCode === 'string' ? ipApi.countryCode : null;
  if (ipApi?.status === 'success' && ipApiCountry) {
    return {
      countryCode: ipApiCountry.toLowerCase(),
      currency:
        typeof ipApi.currency === 'string' && ipApi.currency.length === 3
          ? (ipApi.currency as string).toUpperCase()
          : currencyForCountryCode(ipApiCountry),
    };
  }

  return null;
}

async function resolveHome(request: NextRequest): Promise<{ countryCode: string | null; currency: string; source: string }> {
  const lat = Number.parseFloat(request.nextUrl.searchParams.get('lat') ?? '');
  const lon = Number.parseFloat(request.nextUrl.searchParams.get('lon') ?? '');

  // Precise path: reverse-geocode the granted GPS coordinates.
  if (Number.isFinite(lat) && Number.isFinite(lon)) {
    try {
      const destination = await resolveDestination('home location', { latitude: lat, longitude: lon });
      return {
        countryCode: destination.countryCode ?? null,
        currency: currencyForCountryCode(destination.countryCode),
        source: 'gps',
      };
    } catch {
      // fall through to IP
    }
  }

  // Permission-free path: infer from the request IP.
  const byIp = await currencyFromIp(request);
  if (byIp) {
    return { ...byIp, source: 'ip' };
  }

  return { countryCode: null, currency: 'USD', source: 'default' };
}

export async function GET(request: NextRequest) {
  const home = await resolveHome(request);
  // Conversion factor from USD into the home currency — lets the client backfill
  // older trips (whose costs were generated in USD) into the home currency.
  const usdToHome = await getConversionRate('USD', home.currency);
  return NextResponse.json({ ...home, usdToHome });
}
