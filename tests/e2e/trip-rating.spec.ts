import { expect, test, type Page } from '@playwright/test';

/**
 * E2E coverage for the post-trip rating gate (Slice 2, Unit C).
 *
 * Mounts /trip/<id> with a mocked GET /api/trips/:id (and its supporting
 * suggestions/currency endpoints) so the page renders far enough to show
 * RatingCard, then mocks GET /api/trips/:id/rating per eligibility state to
 * assert the gated copy, and finally exercises the happy path (star pick +
 * submit) against a mocked POST.
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

test('rating gate shows verification-required copy and hides the star form', async ({ page }) => {
  await mockTripShell(page);

  await page.route('**/api/trips/trip-1/rating', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        mine: null,
        aggregate: { average: 0, count: 0 },
        eligibility: { ok: false, reason: 'verification_required' },
      }),
    });
  });

  await page.goto('/trip/trip-1');

  await expect(page.getByText('Verify your identity to rate')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Verify with Didit' })).toBeVisible();
  await expect(page.getByRole('radiogroup', { name: 'Star rating' })).not.toBeVisible();
});

test('rating gate shows presence-required copy', async ({ page }) => {
  await mockTripShell(page);

  await page.route('**/api/trips/trip-1/rating', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        mine: null,
        aggregate: { average: 0, count: 0 },
        eligibility: { ok: false, reason: 'presence_required' },
      }),
    });
  });

  await page.goto('/trip/trip-1');

  await expect(page.getByText("We couldn't confirm you visited Bali")).toBeVisible();
  await expect(page.getByRole('radiogroup', { name: 'Star rating' })).not.toBeVisible();
});

test('rating gate shows trip-not-ended copy', async ({ page }) => {
  await mockTripShell(page);

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

  await page.goto('/trip/trip-1');

  await expect(page.getByText('Rate after your trip ends')).toBeVisible();
  await expect(page.getByRole('radiogroup', { name: 'Star rating' })).not.toBeVisible();
});

test('eligible traveler can pick 5 stars and submit a rating', async ({ page }) => {
  await mockTripShell(page);

  await page.route('**/api/trips/trip-1/rating', route => {
    if (route.request().method() === 'POST') {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ stars: 5, review: null }),
      });
      return;
    }
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        mine: null,
        aggregate: { average: 0, count: 0 },
        eligibility: { ok: true },
      }),
    });
  });

  await page.goto('/trip/trip-1');

  const radiogroup = page.getByRole('radiogroup', { name: 'Star rating' });
  await expect(radiogroup).toBeVisible();

  await page.getByRole('radio', { name: '5 stars' }).click();
  await page.getByRole('button', { name: 'Submit rating' }).click();

  await expect(page.getByText('Saved ✓')).toBeVisible();
});
