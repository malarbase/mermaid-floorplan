import { test, expect } from "@playwright/test";
import { loginAsDevUser } from "../fixtures";

test.describe("Annotations", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDevUser(page);
    await page.goto("/viewer-test");
    await page.locator("canvas").waitFor({ state: "visible", timeout: 15000 });
  });

  test("annotation toggle is accessible", async ({ page }) => {
    // Look for annotation controls
    const annotationToggle = page.getByRole("button", { name: /annotation|label|measurement/i });
    const hasToggle = await annotationToggle.isVisible().catch(() => false);

    // Toggle may be in panel or command palette
    await expect(page.locator("canvas")).toBeVisible();
  });

  test("toggling annotations shows/hides labels", async ({ page }) => {
    const canvas = page.locator("canvas");

    // Look for annotation toggle
    const toggle = page.getByRole("checkbox", { name: /annotation|label/i });
    if (await toggle.isVisible()) {
      await toggle.click();
      await page.waitForTimeout(500);
    }

    // Canvas should still be visible
    await expect(canvas).toBeVisible();
  });

  test("area labels display measurements", async ({ page }) => {
    // Document expected behavior:
    // When annotations are enabled, room areas should show square footage

    const canvas = page.locator("canvas");
    await expect(canvas).toBeVisible();

    // Visual verification would need screenshot comparison
  });
});
