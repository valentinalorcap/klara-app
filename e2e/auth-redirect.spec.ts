import { test, expect } from '@playwright/test';

const PROTECTED_ROUTES = ['/today', '/chat', '/history', '/library', '/products', '/settings'];

test.describe('unauthenticated redirects', () => {
  for (const route of PROTECTED_ROUTES) {
    test(`${route} redirects to /login`, async ({ page }) => {
      await page.goto(route);
      await expect(page).toHaveURL(/\/login/);
    });
  }
});
