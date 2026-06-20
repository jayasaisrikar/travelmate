import { expect, test, type Page } from '@playwright/test';

/**
 * E2E coverage for the trip publish gate (Slice 3, Unit D: PublishToggle).
 *
 * Mounts /trip/<id> with a mocked GET /api/trips/:id (and its supporting
 * suggestions/currency/rating endpoints) so the page renders far enough to
 * show PublishToggle, then mocks POST /api/trips/:id/publish to exercise:
 *   1. the verification-gated rollback path (403 verification_required ->
 *      VerifyToUnlock dialog + switch rolls back to aria-checked=false), and
 *   2. the happy path (200 {is_published:true} -> switch flips to
 *      aria-checked=true and "Copy public link" appears).
 *
 * Public-route coverage (`/itinerary/<id>`) is INTENTIONALLY LIMITED: that
 * route is a Server Component which fetches directly from Supabase inside
 * the route module (see app/itinerary/[id]/page.tsx -> loadPublished()).
 * Playwright's page.route() only intercepts requests issued from the
 * browser context; it cannot intercept the server-side Supabase client call
 * made during the Next.js server render, so we cannot mock that data fetch
 * from this test file the way we mock the client-side fetches above. The
 * test below only asserts the thing we CAN verify end-to-end without a real
 * database: requesting an id that does not exist/is not published renders
 * Next's notFound() 404. This does NOT cover the "trip found + published"
 * render branch of that page (owner name, rating header, PublicTripShare
 * body) — that branch is covered at the unit/component level instead, not
 * here. Do not read this test as full coverage of the public route.
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

const baseTrip = {
  id: 'trip-1',
  destination: 'Bali',
  duration: 5,
  budget: '$2,000',
  interests: ['food', 'culture'],
  itinerary: {
    dailyPlans: [],
    totalEstimatedCost: '1500',
  },
  trip_start_date: '2026-01-01',
  trip_end_date: '2026-01-06',
  is_published: false,
  published_at: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

async function mockTripShell(page: Page) {
  await installSupabaseMock(page);

  await page.route('**/api/trips/trip-1/suggestions', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ suggestions: [] }),
    });
  });

  await page.route('**/api/locale/currency', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ currency: 'USD', usdToHome: 1 }),
    });
  });

  await page.route('**/api/trips/trip-1/rating', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        mine: null,
        aggregate: { average: 0, count: 0 },
        eligibility: { ok: false, reason: 'trip_not_ended' },
      }),
    });
  });

  await page.route('**/api/trips/trip-1', route => {
    if (route.request().method() !== 'GET') {
      route.fallback();
      return;
    }
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ trip: baseTrip, shareUrl: '', share: null }),
    });
  });
}

test('publish toggle rolls back and shows VerifyToUnlock when verification is required', async ({ page }) => {
  await mockTripShell(page);

  await page.route('**/api/trips/trip-1/publish', route => {
    route.fulfill({
      status: 403,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'verification_required' }),
    });
  });

  await page.goto('/trip/trip-1');

  const switchControl = page.getByRole('switch', { name: 'Publish trip' });
  await expect(switchControl).toBeVisible();
  await expect(switchControl).toHaveAttribute('aria-checked', 'false');

  await switchControl.click();

  await expect(page.getByRole('dialog', { name: 'Verify to unlock Open Trips' })).toBeVisible();
  await expect(switchControl).toHaveAttribute('aria-checked', 'false');
  await expect(page.getByRole('button', { name: 'Copy public link' })).not.toBeVisible();
});

test('publish toggle publishes the trip for a trusted traveler', async ({ page }) => {
  await mockTripShell(page);

  await page.route('**/api/trips/trip-1/publish', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ is_published: true }),
    });
  });

  await page.goto('/trip/trip-1');

  const switchControl = page.getByRole('switch', { name: 'Publish trip' });
  await expect(switchControl).toBeVisible();
  await expect(switchControl).toHaveAttribute('aria-checked', 'false');

  await switchControl.click();

  await expect(switchControl).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByRole('button', { name: /copy public link/i })).toBeVisible();
});

test('public itinerary route 404s for an unknown/unpublished trip id', async ({ page }) => {
  // No server-side mocking is possible here (see file header). This only
  // confirms the route's graceful-degradation path against whatever
  // backend the e2e environment is wired to: an id with no matching
  // published trip must render Next's notFound() page, not crash.
  const response = await page.goto('/itinerary/definitely-not-a-real-trip-id');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { name: 'This page could not be found.' })).toBeVisible();
});
