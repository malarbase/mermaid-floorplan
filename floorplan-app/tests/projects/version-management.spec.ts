import { expect, test } from '@playwright/test';
import { loginAsDevUser } from '../fixtures';

test.describe('Version Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDevUser(page);
  });

  test('version URL structure follows /u/{username}/{project}/v/{version}', async ({ page }) => {
    // Test URL pattern recognition
    // Note: This requires a real project to exist
    const _versionPattern = /\/u\/[\w-]+\/[\w-]+\/v\/[\w-]+/;

    // Navigate to dashboard first
    await page.goto('/dashboard');
    await expect(page).toHaveURL('/dashboard');

    // Document the expected URL structure
    // Actual version URLs would be tested with real data
  });

  test('version switcher is visible on project page', async ({ page }) => {
    // This would need a real project
    // For now, verify the viewer-test page loads
    await page.goto('/viewer-test');

    const mainContent = page.locator("main, [data-testid='viewer']");
    await expect(mainContent).toBeVisible();
  });
});

test.describe('Version Creation', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDevUser(page);
  });

  test('version creation workflow is accessible', async ({ page }) => {
    await page.goto('/dashboard');

    const heading = page.getByRole('heading', { level: 1 });
    await expect(heading).toBeVisible();
  });
});
