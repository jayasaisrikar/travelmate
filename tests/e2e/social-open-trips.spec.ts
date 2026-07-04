import { expect, test, type Page } from '@playwright/test';

/**
 * Verifies the Open Trips list renders mocked rooms and links to the room
 * detail page, and that the detail page renders the Join control for a
 * trusted (verified) traveler who is not yet a member.
 */

function installSupabaseMock(page: Page) {
  return page.addInitScript(() => {
    window.localStorage.setItem(
      'wayflo-cookie-consent',
      JSON.stringify({
        version: 1,
        consentedAt: new Date().toISOString(),
        preferences: {
          essential: true,
          analytics: true,
          personalization: true,
        },
      })
    );

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
    const user = session.user;

    (window as Window & { __WAYFLO_SUPABASE_MOCK__?: unknown }).__WAYFLO_SUPABASE_MOCK__ = {
      auth: {
        async getSession() {
          return { data: { session }, error: null };
        },
        async getUser() {
          return { data: { user }, error: null };
        },
        async signInWithPassword() {
          return { data: { session, user }, error: null };
        },
        async signOut() {
          return { error: null };
        },
        onAuthStateChange() {
          return { data: { subscription: { unsubscribe() {} } } };
        },
      },
    };
  });
}

const trustedProfile = {
  id: 'user-e2e',
  display_name: 'Jordan',
  avatar_url: null,
  bio: null,
  travel_style: 'solo',
  is_public: true,
  verified: true,
  verification_provider: 'didit',
  verification_level: 'trusted',
  verification_status: 'approved',
  verification_session_id: null,
  verification_requested_at: null,
  verified_at: new Date().toISOString(),
  last_seen_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
};

const sampleRoom = {
  id: 'room-open-1',
  created_by: 'someone-else',
  destination: 'Lisbon',
  destination_slug: 'lisbon',
  title: 'Lisbon explorers',
  travel_month: 'August 2026',
  max_members: 6,
  is_open: true,
  member_count: 2,
  is_member: false,
  current_user_role: null,
  created_at: new Date().toISOString(),
};

async function mockCommunityShell(page: Page) {
  await installSupabaseMock(page);

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

  await page.route('**/api/social/profile', route => {
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(trustedProfile) });
  });

  await page.route('**/api/social/rooms/mine**', route => {
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
  });

  await page.route('**/api/social/rooms', route => {
    if (route.request().method() !== 'GET') {
      route.fallback();
      return;
    }
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([sampleRoom]) });
  });

  await page.route('**/api/trips**', route => {
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ trips: [] }) });
  });

  await page.route('**/api/social/signals**', route => {
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
  });

  await page.route('**/api/social/messages**', route => {
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
  });
}

test('Open Trips panel lists a mocked room and links to its detail page', async ({ page }) => {
  await mockCommunityShell(page);

  await page.goto('/dashboard/community');

  await expect(page.getByText('Open Trips', { exact: true })).toBeVisible();
  await expect(page.getByText('Lisbon explorers')).toBeVisible();

  const roomLink = page.getByRole('link', { name: /Lisbon explorers/i });
  await expect(roomLink).toHaveAttribute('href', `/rooms/${sampleRoom.id}`);
});

test('Open Trip detail page shows the Join control for a non-member trusted traveler', async ({ page }) => {
  await mockCommunityShell(page);

  await page.route(`**/api/social/rooms/${sampleRoom.id}`, route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ...sampleRoom, members: [] }),
    });
  });

  await page.goto(`/rooms/${sampleRoom.id}`);

  await expect(page.getByRole('heading', { name: 'Lisbon explorers' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Join room' })).toBeVisible();
});
