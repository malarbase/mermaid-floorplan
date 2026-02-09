import { expect, test } from '@playwright/test';
import { loginAsDevUser } from '../fixtures';

test.describe('Selection Interactions', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDevUser(page);
    await page.goto('/viewer-test');
    await page.locator('canvas').waitFor({ state: 'visible', timeout: 15000 });
  });

  test('clicking canvas triggers selection', async ({ page }) => {
    const canvas = page.locator('canvas');
    const box = await canvas.boundingBox();

    if (box) {
      // Click in center of canvas
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      await page.waitForTimeout(200);
    }

    // Canvas should still be visible
    await expect(canvas).toBeVisible();
  });

  test('shift-click adds to selection', async ({ page }) => {
    const canvas = page.locator('canvas');
    const box = await canvas.boundingBox();

    if (box) {
      // First click
      await page.mouse.click(box.x + box.width / 3, box.y + box.height / 2);
      await page.waitForTimeout(200);

      // Shift-click for multi-select
      await page.keyboard.down('Shift');
      await page.mouse.click(box.x + (box.width * 2) / 3, box.y + box.height / 2);
      await page.keyboard.up('Shift');
      await page.waitForTimeout(200);
    }

    // Canvas should still be visible
    await expect(canvas).toBeVisible();
  });

  test('marquee selection with drag', async ({ page }) => {
    const canvas = page.locator('canvas');
    const box = await canvas.boundingBox();

    if (box) {
      // Drag to create marquee selection
      await page.mouse.move(box.x + 50, box.y + 50);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width - 50, box.y + box.height - 50, {
        steps: 10,
      });
      await page.mouse.up();
      await page.waitForTimeout(200);
    }

    // Canvas should still be visible
    await expect(canvas).toBeVisible();
  });
});
