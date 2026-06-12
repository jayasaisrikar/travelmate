import { defineConfig, devices } from '@playwright/test';

/**
 * Visual A/B config — captures full-page screenshots of key routes for the
 * theme comparison (old indigo vs new sunset). Each invocation boots its own
 * dev server against whatever code is currently checked out, so the A/B runner
 * (scripts/visual-ab.mjs) can git-stash between the two variants.
 *
 * Run via:  node scripts/visual-ab.mjs
 * Or a single variant:  WAYFLO_VARIANT=sunset npx playwright test --config=playwright.visual.config.ts
 */
const baseURL = 'http://127.0.0.1:3000';

export default defineConfig({
  testDir: './tests/visual',
  fullyParallel: false,
  workers: 1,
  reporter: 'line',
  retries: 0,
  timeout: 90_000,
  use: {
    baseURL,
    viewport: { width: 1440, height: 1080 },
    // reduced motion is emulated per-page in the spec (page.emulateMedia)
  },
  webServer: {
    command: 'npm run dev',
    url: baseURL,
    reuseExistingServer: false, // fresh server per variant -> serves checked-out code
    timeout: 120_000,
    env: {
      NODE_ENV: 'development',
      PORT: '3000',
      E2E_TEST_MODE: '1',
      NEXT_PUBLIC_APP_URL: baseURL,
      NEXT_PUBLIC_SUPABASE_URL: 'https://example.invalid',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'e2e-test-anon-key',
      SUPABASE_URL: 'https://example.invalid',
      SUPABASE_SERVICE_ROLE_KEY: 'e2e-test-service-role-key',
      RESEND_API_KEY: 'e2e-test-resend-key',
      EMAIL_FROM: 'Wayflo <no-reply@example.com>',
    },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
