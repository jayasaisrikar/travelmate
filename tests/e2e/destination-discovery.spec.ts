import { expect, test, type Page } from '@playwright/test';

/**
 * E2E coverage for the destination discovery feed (Slice 3, Units B/C):
 * PublishedItinerariesSection rendered on /explore/<slug>.
 *
 * Mocks GET /api/explore/<slug>/itineraries with a mix of rated and
 * unrated items plus a rating summary, and mocks the other endpoints the
 * page calls (listTravelers -> /api/social/companions, listTripRooms ->
 * /api/social/rooms) minimally so the rest of the page renders without
 * hitting a real backend.
 *
 * Asserts: rated cards render above unrated cards (DOM order), unrated
 * cards show "Not rated yet", and the section header shows the
 * destination average + rated count.
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

const itinerariesPayload = {
  items: [
    {
      tripId: 'trip-rated-1',
      destination: 'Bali',
      ownerName: 'Maya',
      ownerAvatar: null,
      stars: 4.5,
      review: 'Loved every minute of Ubud.',
      publishedAt: new Date().toISOString(),
    },
    {
      tripId: 'trip-rated-2',
      destination: 'Bali',
      ownerName: 'Ivy',
      ownerAvatar: null,
      stars: 3.5,
      review: null,
      publishedAt: new Date().toISOString(),
    },
    {
      tripId: 'trip-unrated-1',
      destination: 'Bali',
      ownerName: 'Noah',
      ownerAvatar: null,
      stars: null,
      review: null,
      publishedAt: new Date().toISOString(),
    },
  ],
  summary: { average: 4, count: 2 },
};

async function mockExploreShell(page: Page) {
  await installSupabaseMock(page);

  await page.route('**/api/social/companions**', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });

  await page.route('**/api/social/rooms**', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });

  await page.route('**/api/explore/bali/itineraries', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(itinerariesPayload),
    });
  });
}

test('destination page shows rated itineraries above unrated ones with a summary header', async ({ page }) => {
  await mockExploreShell(page);

  await page.goto('/explore/bali');

  await expect(page.getByRole('heading', { name: 'Published itineraries' })).toBeVisible();

  // Summary: average 4.0 over 2 rated items.
  const summaryBadge = page.getByText('4.0').filter({ hasText: '4.0' });
  await expect(summaryBadge.first()).toBeVisible();
  await expect(page.getByText('(2)')).toBeVisible();

  // DOM order: rated cards (Maya, Ivy) must appear before the unrated one (Noah).
  const cardOwnerNames = page.locator('a[href^="/itinerary/"] p.truncate');
  await expect(cardOwnerNames).toHaveCount(3);
  await expect(cardOwnerNames.nth(0)).toHaveText('Maya');
  await expect(cardOwnerNames.nth(1)).toHaveText('Ivy');
  await expect(cardOwnerNames.nth(2)).toHaveText('Noah');

  // Unrated card surfaces the "Not rated yet" pill.
  await expect(page.getByText('Not rated yet')).toBeVisible();
});
