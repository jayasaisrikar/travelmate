import { defineConfig } from '@playwright/test';

// Pure-logic unit tests for the itinerary-generation pipeline.
// No browser, no dev server, no Supabase env — these specs import the pure
// helpers directly and assert on their output. Run with:
//   npx playwright test --config=playwright.unit.config.ts
export default defineConfig({
  testDir: './tests/unit',
  fullyParallel: true,
  reporter: 'line',
  retries: 0,
});
