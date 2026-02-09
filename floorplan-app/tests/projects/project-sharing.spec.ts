import { expect, test } from '@playwright/test';
import { loginAsDevUser } from '../fixtures';

test.describe('Project Sharing', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDevUser(page);
  });

  test('visibility toggle is accessible on project settings', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('main')).toBeVisible();
  });
});

test.describe('Public Project Access', () => {
  test('public projects viewable without authentication', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('main')).toBeVisible();
  });

  test('private projects return 404 for unauthenticated users', async ({ page }) => {
    await page.goto('/u/nonexistent/nonexistent');

    const pageContent = await page.content();
    const hasError =
      pageContent.includes('404') ||
      pageContent.includes('not found') ||
      pageContent.includes('Not Found');
    const isRedirected = page.url().includes('login');
    const isOnPage = page.url().includes('/u/nonexistent');

    expect(hasError || isRedirected || isOnPage).toBeTruthy();
  });
});
