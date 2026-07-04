import { expect, test } from '@playwright/test';

test('landing shows "Plan with more flow."', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Plan with more flow.')).toBeVisible();
});
