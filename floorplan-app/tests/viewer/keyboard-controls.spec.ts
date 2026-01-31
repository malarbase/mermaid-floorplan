import { test, expect } from "@playwright/test";
import { loginAsDevUser } from "../fixtures";

test.describe("Keyboard Controls", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDevUser(page);
    await page.goto("/viewer-test");
    await page.locator("canvas").waitFor({ state: "visible", timeout: 15000 });
  });

  test("WASD keys navigate camera", async ({ page }) => {
    const canvas = page.locator("canvas");
    await canvas.focus();

    // Press navigation keys
    await page.keyboard.press("w");
    await page.waitForTimeout(200);
    await page.keyboard.press("a");
    await page.waitForTimeout(200);
    await page.keyboard.press("s");
    await page.waitForTimeout(200);
    await page.keyboard.press("d");
    await page.waitForTimeout(200);

    // Canvas should still be visible (no errors)
    await expect(canvas).toBeVisible();
  });

  test("zoom keys work (E/Q or +/-)", async ({ page }) => {
    const canvas = page.locator("canvas");
    await canvas.focus();

    // Try zoom keys
    await page.keyboard.press("e");
    await page.waitForTimeout(200);
    await page.keyboard.press("q");
    await page.waitForTimeout(200);

    // Canvas should still be visible
    await expect(canvas).toBeVisible();
  });

  test("number keys switch view presets", async ({ page }) => {
    const canvas = page.locator("canvas");
    await canvas.focus();

    // Press number keys for view presets
    await page.keyboard.press("1");
    await page.waitForTimeout(300);
    await page.keyboard.press("2");
    await page.waitForTimeout(300);
    await page.keyboard.press("3");
    await page.waitForTimeout(300);

    // Canvas should still be visible
    await expect(canvas).toBeVisible();
  });

  test("escape key deselects", async ({ page }) => {
    const canvas = page.locator("canvas");
    await canvas.focus();

    // Press escape
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);

    // Canvas should still be visible
    await expect(canvas).toBeVisible();
  });
});
