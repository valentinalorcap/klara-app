import { test, expect } from '@playwright/test';

test('login page renders with Google button', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Klara' })).toBeVisible();
  await expect(page.getByRole('button', { name: /continue with google/i })).toBeVisible();
});
