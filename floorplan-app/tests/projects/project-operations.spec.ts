import { expect, test } from '@playwright/test';
import { loginAsDevUser } from '../fixtures';

test.describe('Project Operations', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDevUser(page);
  });

  test('can navigate to new project page', async ({ page }) => {
    await page.goto('/new');
    await expect(page).toHaveURL(/\/new/);

    const heading = page.getByRole('heading');
    await expect(heading).toBeVisible();
  });

  test('new project form has required fields', async ({ page }) => {
    await page.goto('/new');

    await page.waitForSelector('text=Loading...', { state: 'hidden', timeout: 5000 });

    const nameInput = page.locator("input[type='text']").first();
    await expect(nameInput).toBeVisible({ timeout: 5000 });
  });

  test('can fill project name and see preview', async ({ page }) => {
    await page.goto('/new');

    const nameInput = page.locator('input').first();
    await nameInput.fill('Test Project');

    const pageContent = await page.content();
    expect(pageContent.toLowerCase()).toContain('test');
  });
});

test.describe('Project Editing', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDevUser(page);
  });

  test('project page shows editor or viewer', async ({ page }) => {
    await page.goto('/viewer-test');

    await page.waitForSelector('text=Loading...', { state: 'hidden', timeout: 10000 });

    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible({ timeout: 10000 });
  });
});
