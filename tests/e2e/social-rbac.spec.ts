import { expect, test, type Page } from '@playwright/test';

/**
 * Verifies the client-side RBAC upsell divergence on /dashboard/community:
 * an unverified traveler clicking "Create" on the Open Trips panel sees the
 * VerifyToUnlock dialog, while a trusted traveler sees the create-trip modal.
 *
 * The verification_level on the mocked traveler profile drives this branch
 * (see hooks/useVerificationGate.ts -> isTrustedVerificationLevel).
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

function profileBody(level: 'unverified' | 'basic' | 'trusted' | 'high_trust') {
  return {
    id: 'user-e2e',
    display_name: 'Jordan',
    avatar_url: null,
    bio: null,
    travel_style: 'solo',
    is_public: true,
    verified: level === 'trusted' || level === 'high_trust',
    verification_provider: level === 'unverified' ? null : 'didit',
    verification_level: level,
    verification_status: level === 'unverified' ? 'not_started' : 'approved',
    verification_session_id: null,
    verification_requested_at: null,
    verified_at: null,
    last_seen_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  };
}

async function mockCommunityShell(page: Page, level: 'unverified' | 'basic' | 'trusted' | 'high_trust') {
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
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(profileBody(level)),
    });
  });

  await page.route('**/api/social/rooms**', route => {
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
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

test('unverified traveler is gated by VerifyToUnlock when creating an Open Trip', async ({ page }) => {
  await mockCommunityShell(page, 'unverified');

  await page.goto('/dashboard/community');

  await expect(page.getByText('Open Trips', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Create' }).click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('Verify to unlock Open Trips')).toBeVisible();
});

test('trusted traveler opens the create-trip modal instead of the verification gate', async ({ page }) => {
  await mockCommunityShell(page, 'trusted');

  await page.goto('/dashboard/community');

  await expect(page.getByText('Open Trips', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Create' }).click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('heading', { name: 'Create an Open Trip' })).toBeVisible();
  await expect(dialog.getByLabel('Destination')).toBeVisible();
});
