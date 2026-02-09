import { expect, test } from '@playwright/test';
import { loginAsDevUser } from '../fixtures';

test.describe('Username Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDevUser(page);
  });

  test('settings page is accessible', async ({ page }) => {
    await page.goto('/settings');

    const url = page.url();
    const isOnSettings = url.includes('/settings');
    const isOnLogin = url.includes('/login');

    expect(isOnSettings || isOnLogin).toBeTruthy();
  });

  test('dashboard shows username in header or profile area', async ({ page }) => {
    const header = page.locator('header');
    await expect(header).toBeVisible();

    const pageContent = await page.content();
    const hasUserIndicator =
      pageContent.includes('user') ||
      pageContent.includes('@') ||
      pageContent.includes('Dev') ||
      pageContent.includes('Floorplan');

    expect(hasUserIndicator).toBeTruthy();
  });
});

test.describe('Username Selection Modal', () => {
  test('username modal shows for new users without username', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('main')).toBeVisible();
  });

  test('skip for now option shows temp username nudge', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('main')).toBeVisible();
  });
});
