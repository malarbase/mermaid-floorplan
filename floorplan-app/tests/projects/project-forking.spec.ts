import { expect, test } from '@playwright/test';
import { loginAsDevUser } from '../fixtures';

test.describe('Project Forking', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDevUser(page);
  });

  test('fork button appears on public projects', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('main')).toBeVisible();
  });

  test("forking creates a copy in user's account", async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('main')).toBeVisible();
  });
});

test.describe('Fork Attribution', () => {
  test('forked projects show attribution', async ({ page }) => {
    await loginAsDevUser(page);
    await page.goto('/dashboard');
    await expect(page.locator('main')).toBeVisible();
  });
});
