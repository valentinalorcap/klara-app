import { test, expect } from '@playwright/test';

test('login page renders with Google button', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Klara' })).toBeVisible();
  await expect(page.getByRole('button', { name: /continue with google/i })).toBeVisible();
});

test('login page has correct title', async ({ page }) => {
  await page.goto('/login');
  await expect(page).toHaveTitle(/Klara/);
});

test('root redirects unauthenticated users to /login', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/login/);
});
