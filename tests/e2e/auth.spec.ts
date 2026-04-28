import { expect, test } from '@playwright/test';

test.describe('auth verification flow', () => {
  test('signup returns a verification link and login works after visiting it', async ({ page, baseURL }) => {
    await page.addInitScript(() => {
      const listeners = new Set<(event: string, session: unknown) => void>();
      let session: {
        access_token: string;
        token_type: 'bearer';
        user: {
          id: string;
          email: string;
          email_confirmed_at: string;
          created_at: string;
          last_sign_in_at: string;
        };
      } | null = null;
      let user = null as null | {
        id: string;
        email: string;
        email_confirmed_at: string;
        created_at: string;
        last_sign_in_at: string;
      };

      const emit = (event: string) => {
        for (const listener of listeners) {
          listener(event, session);
        }
      };

      (window as Window & { __WAYFLO_SUPABASE_MOCK__?: unknown }).__WAYFLO_SUPABASE_MOCK__ = {
        auth: {
          async getSession() {
            return { data: { session }, error: null };
          },
          async getUser() {
            return { data: { user }, error: null };
          },
          async signInWithPassword({ email }: { email: string; password: string }) {
            const verified = new URL(window.location.href).searchParams.get('e2e') === 'verified';

            if (!verified) {
              return {
                data: { session: null, user: null },
                error: new Error('Email not confirmed'),
              };
            }

            const now = new Date().toISOString();
            user = {
              id: `user-${email}`,
              email,
              email_confirmed_at: now,
              created_at: now,
              last_sign_in_at: now,
            };
            session = {
              access_token: `access-${email}`,
              token_type: 'bearer',
              user,
            };
            emit('SIGNED_IN');

            return { data: { session, user }, error: null };
          },
          async signOut() {
            session = null;
            user = null;
            emit('SIGNED_OUT');

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

    await page.route('**/api/auth/me', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 'user-e2e@example.com',
            email: 'user-e2e@example.com',
            email_confirmed_at: new Date().toISOString(),
            last_sign_in_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
          },
          isAdmin: true,
        }),
      });
    });

    await page.route('**/api/admin/overview', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          stats: {
            trips: 0,
            shares: 0,
            activeShares: 0,
            suggestions: 0,
            users: 1,
            confirmedUsers: 1,
          },
          trips: [],
          shares: [],
          suggestions: [],
          users: [],
          profiles: [],
        }),
      });
    });

    await page.goto('/signup');

    const email = `e2e-${Date.now()}@example.com`;
    const password = 'Password123!';

    await expect(page.getByPlaceholder('you@example.com')).toBeVisible();
    await expect(page.getByPlaceholder('At least 6 characters')).toBeVisible();

    await page.getByPlaceholder('you@example.com').fill(email);
    await page.getByPlaceholder('At least 6 characters').fill(password);
    const signupResponsePromise = page.waitForResponse(response =>
      response.url().includes('/api/auth/signup') && response.request().method() === 'POST'
    );

    await Promise.all([
      signupResponsePromise,
      page.getByRole('button', { name: 'Create Account' }).click(),
    ]);

    const signupPayload = await (await signupResponsePromise).json();
    expect(signupPayload.verificationLink).toContain(baseURL ?? '');

    await expect(page).toHaveURL(/\/login\?message=verify-email/);
    await expect(page.getByText('Check your email to confirm your account before logging in.')).toBeVisible();

    await page.goto(signupPayload.verificationLink);
    await expect(page).toHaveURL(/\/login\?message=verify-email&e2e=verified/);
    await expect(page.getByText('Check your email to confirm your account before logging in.')).toBeVisible();

    await page.getByPlaceholder('you@example.com').fill(email);
    await page.getByPlaceholder('At least 6 characters').fill(password);
    await page.getByRole('button', { name: 'Log In' }).click();

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByText('Manage every wayflo surface from one place.')).toBeVisible();
  });
});
