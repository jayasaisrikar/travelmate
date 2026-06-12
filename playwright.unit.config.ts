import { defineConfig } from '@playwright/test';

/**
 * Lightweight config for pure-logic unit specs (no browser, no dev server).
 * Run with:  npx playwright test --config=playwright.unit.config.ts
 */
export default defineConfig({
  testDir: './tests/unit',
  fullyParallel: true,
  reporter: 'line',
});
