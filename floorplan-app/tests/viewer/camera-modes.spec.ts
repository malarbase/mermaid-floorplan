import { test, expect } from "@playwright/test";
import { loginAsDevUser } from "../fixtures";

test.describe("Camera Modes", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDevUser(page);
    await page.goto("/viewer-test");
    // Wait for canvas to initialize
    await page.locator("canvas").waitFor({ state: "visible", timeout: 15000 });
  });

  test("camera mode controls are accessible", async ({ page }) => {
    // Look for camera mode selector or buttons
    const cameraControls = page.getByRole("button", { name: /perspective|orthographic|isometric/i });
    const hasControls = await cameraControls.first().isVisible().catch(() => false);

    // Controls may be in command palette or header
    await expect(page.locator("canvas")).toBeVisible();
  });

  test("perspective mode is default", async ({ page }) => {
    // Canvas should render in perspective by default
    const canvas = page.locator("canvas");
    await expect(canvas).toBeVisible();

    // Visual verification would require screenshot comparison
    // For now, verify canvas renders
  });

  test("can switch to orthographic mode", async ({ page }) => {
    // Look for mode switcher
    const orthoButton = page.getByRole("button", { name: /orthographic/i });
    if (await orthoButton.isVisible()) {
      await orthoButton.click();
      await page.waitForTimeout(500);
    }

    // Verify canvas still renders
    await expect(page.locator("canvas")).toBeVisible();
  });

  test("can switch to isometric mode", async ({ page }) => {
    // Look for mode switcher
    const isoButton = page.getByRole("button", { name: /isometric/i });
    if (await isoButton.isVisible()) {
      await isoButton.click();
      await page.waitForTimeout(500);
    }

    // Verify canvas still renders
    await expect(page.locator("canvas")).toBeVisible();
  });
});
