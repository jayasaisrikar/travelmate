import { expect, test, type Page, type Route } from '@playwright/test';

/**
 * E2E coverage for the presence-verification consent prompt (Slice 2, Unit B).
 *
 * Mounts /dashboard with a mocked GET /api/trips/presence-status returning a
 * trip that is in-window, unverified, and consent:false, and asserts the
 * LocationConsentPrompt appears and that no presence POST fires before
 * consent is granted.
 *
 * LIMITATION: Playwright's `context.grantPermissions('geolocation')` /
 * `setGeolocation` work against the browser's real Geolocation API, but in
 * this sandboxed/headless CI environment `navigator.geolocation` calls can
 * silently fail to resolve (no location provider), making the "grant then
 * assert a presence POST fires" leg flaky to rely on as a hard assertion.
 * We still attempt it (mocking the geolocation position rather than the
 * browser permission stack, by stubbing `navigator.geolocation.getCurrentPosition`
 * via an init script) so the full flow is exercised; the consent
 * show/hide assertions are the durable, unconditionally-asserted contract.
 */

function installSupabaseMock(page: Page) {
  return page.addInitScript(() => {
    window.localStorage.setItem(
      'wayflo-cookie-consent',
      JSON.stringify({
        version: 1,
        consentedAt: new Date().toISOString(),
        preferences: { essential: true, analytics: true, personalization: true },
      })
    );

    const listeners = new Set<(event: string, session: unknown) => void>();
    const session = {
      access_token: 'access-e2e',
      token_type: 'bearer',
      user: {
        id: 'user-e2e',
        email: 'traveler@example.com',
        email_confirmed_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        last_sign_in_at: new Date().toISOString(),
      },
    };

    (window as Window & { __WAYFLO_SUPABASE_MOCK__?: unknown }).__WAYFLO_SUPABASE_MOCK__ = {
      auth: {
        async getSession() {
          return { data: { session }, error: null };
        },
        async getUser() {
          return { data: { user: session.user }, error: null };
        },
        onAuthStateChange(callback: (event: string, session: unknown) => void) {
          listeners.add(callback);
          return {
            data: {
              subscription: {
                unsubscribe() {
                  listeners.delete(callback);
                },
              },
            },
          };
        },
      },
    };
  });
}

function stubGeolocation(page: Page) {
  return page.addInitScript(() => {
    Object.defineProperty(window.navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition: (success: PositionCallback) => {
          success({
            coords: {
              latitude: -8.4095,
              longitude: 115.1889,
              accuracy: 10,
              altitude: null,
              altitudeAccuracy: null,
              heading: null,
              speed: null,
            },
            timestamp: Date.now(),
          } as GeolocationPosition);
        },
      },
    });
  });
}

async function mockDashboardShell(page: Page) {
  await page.route('**/api/auth/me', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user: {
          id: 'user-e2e',
          email: 'traveler@example.com',
          email_confirmed_at: new Date().toISOString(),
          last_sign_in_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        },
        isAdmin: false,
      }),
    });
  });

  await page.route('**/api/trips', route => {
    if (route.request().method() !== 'GET') {
      route.fallback();
      return;
    }
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ trips: [] }),
    });
  });
}

const today = new Date();
const startDate = new Date(today.getTime() - 86400000).toISOString().slice(0, 10);
const endDate = new Date(today.getTime() + 86400000).toISOString().slice(0, 10);

const presenceTrip = {
  id: 'trip-presence-1',
  trip_start_date: startDate,
  trip_end_date: endDate,
  verified: false,
};

test('consent prompt appears when an in-window trip is unverified and unconsented, and no presence POST fires beforehand', async ({
  page,
}) => {
  await installSupabaseMock(page);
  await mockDashboardShell(page);

  let presencePostFired = false;
  await page.route('**/api/trips/presence-status', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ trips: [presenceTrip], consent: false }),
    });
  });
  await page.route('**/api/trips/trip-presence-1/presence', route => {
    presencePostFired = true;
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
  });

  await page.goto('/dashboard');

  await expect(page.getByText("Confirm you're on your trip?")).toBeVisible();
  expect(presencePostFired).toBe(false);
});

test('consent prompt is absent when consent is already granted', async ({ page }) => {
  await installSupabaseMock(page);
  await mockDashboardShell(page);

  await page.route('**/api/trips/presence-status', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ trips: [presenceTrip], consent: true }),
    });
  });

  await page.goto('/dashboard');
  // Give the presence-status effect a beat to resolve and (not) render the prompt.
  await page.waitForTimeout(500);

  await expect(page.getByText("Confirm you're on your trip?")).not.toBeVisible();
});

test('granting consent triggers a presence POST with the captured coordinates', async ({ page }) => {
  await installSupabaseMock(page);
  await stubGeolocation(page);
  await mockDashboardShell(page);

  await page.route('**/api/trips/presence-status', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ trips: [presenceTrip], consent: false }),
    });
  });

  await page.route('**/api/profile/location-consent', route => {
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
  });

  let presenceBody: unknown = null;
  const presencePostPromise = new Promise<void>(resolve => {
    page.route('**/api/trips/trip-presence-1/presence', (route: Route) => {
      presenceBody = route.request().postDataJSON();
      resolve();
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
    });
  });

  await page.goto('/dashboard');
  await expect(page.getByText("Confirm you're on your trip?")).toBeVisible();
  await page.getByRole('button', { name: 'Allow location' }).click();

  await Promise.race([presencePostPromise, page.waitForTimeout(5000)]);

  expect(presenceBody).toEqual({ lat: -8.4095, lng: 115.1889 });
});
