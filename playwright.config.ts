import { defineConfig, devices } from '@playwright/test';

const baseURL = 'http://127.0.0.1:3000';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  reporter: 'line',
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL,
    trace: 'on-first-retry',
    viewport: { width: 1440, height: 1080 },
  },
  webServer: {
    command: 'npm run dev',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
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
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
