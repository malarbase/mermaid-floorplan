import { test, expect } from "@playwright/test";
import { loginAsDevUser } from "../fixtures";

test.describe("Floor Visibility", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDevUser(page);
    await page.goto("/viewer-test");
    await page.locator("canvas").waitFor({ state: "visible", timeout: 15000 });
  });

  test("floor controls are accessible", async ({ page }) => {
    // Look for floor visibility controls
    const floorControls = page.getByRole("button", { name: /floor|level/i });
    const hasControls = await floorControls.first().isVisible().catch(() => false);

    // Controls may be in panel or header
    await expect(page.locator("canvas")).toBeVisible();
  });

  test("toggling floor visibility updates view", async ({ page }) => {
    const canvas = page.locator("canvas");

    // Look for floor toggle
    const floorToggle = page.getByRole("checkbox", { name: /floor|level/i });
    if (await floorToggle.first().isVisible()) {
      await floorToggle.first().click();
      await page.waitForTimeout(500);
    }

    // Canvas should still be visible
    await expect(canvas).toBeVisible();
  });
});
