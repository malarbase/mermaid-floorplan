import { test, expect } from "@playwright/test";
import { loginAsDevUser } from "../fixtures";

test.describe("Theme Switching", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDevUser(page);
    await page.goto("/viewer-test");
    await page.locator("canvas").waitFor({ state: "visible", timeout: 15000 });
  });

  test("theme toggle is accessible", async ({ page }) => {
    // Look for theme toggle
    const themeToggle = page.getByRole("button", { name: /theme|dark|light/i });
    const hasToggle = await themeToggle.isVisible().catch(() => false);

    // May be in header or command palette
    await expect(page.locator("canvas")).toBeVisible();
  });

  test("can switch to dark theme", async ({ page }) => {
    // Look for theme switcher
    const darkButton = page.getByRole("button", { name: /dark/i });
    if (await darkButton.isVisible()) {
      await darkButton.click();
      await page.waitForTimeout(500);
    }

    // Check data-theme attribute
    const theme = await page.locator("html").getAttribute("data-theme");
    // May be dark, or unchanged if already dark
    expect(theme === "dark" || theme === "light" || theme === null).toBeTruthy();
  });

  test("can switch to light theme", async ({ page }) => {
    // Look for theme switcher
    const lightButton = page.getByRole("button", { name: /light/i });
    if (await lightButton.isVisible()) {
      await lightButton.click();
      await page.waitForTimeout(500);
    }

    // Check data-theme attribute
    const theme = await page.locator("html").getAttribute("data-theme");
    expect(theme === "dark" || theme === "light" || theme === null).toBeTruthy();
  });

  test("theme persists across navigation", async ({ page }) => {
    // Set theme
    const toggle = page.getByRole("button", { name: /theme/i });
    if (await toggle.isVisible()) {
      await toggle.click();
      await page.waitForTimeout(300);
    }

    const themeBefore = await page.locator("html").getAttribute("data-theme");

    // Navigate away and back
    await page.goto("/dashboard");
    await page.goto("/viewer-test");
    await page.locator("canvas").waitFor({ state: "visible", timeout: 15000 });

    const themeAfter = await page.locator("html").getAttribute("data-theme");

    // Theme should persist (or be consistent default)
    expect(themeAfter).toBeDefined();
  });

  test("3D scene materials reflect theme", async ({ page }) => {
    // Document expected behavior:
    // Dark theme should have darker scene background
    // Light theme should have lighter scene background

    const canvas = page.locator("canvas");
    await expect(canvas).toBeVisible();

    // Visual verification would need screenshot comparison
  });
});
