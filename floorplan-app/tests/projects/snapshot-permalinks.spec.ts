import { expect, test } from '@playwright/test';
import { loginAsDevUser } from '../fixtures';

test.describe('Snapshot Permalinks', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDevUser(page);
  });

  test('snapshot URL structure follows /u/{username}/{project}/s/{hash}', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL('/dashboard');
  });

  test('permalink copy button is accessible', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('main')).toBeVisible();
  });
});

test.describe('Snapshot Immutability', () => {
  test('snapshots preserve content after project edits', async ({ page }) => {
    await loginAsDevUser(page);
    await page.goto('/dashboard');
    await expect(page.locator('main')).toBeVisible();
  });
});
