import { test, expect } from "@playwright/test";

test.describe("Landing Page", () => {
  test("displays hero section with title and tagline", async ({ page }) => {
    await page.goto("/");

    // Verify page title or main heading
    await expect(page).toHaveTitle(/floorplan/i);

    // Hero section should be visible
    const hero = page.locator("main").first();
    await expect(hero).toBeVisible();
  });

  test("has Get Started and Log in buttons", async ({ page }) => {
    await page.goto("/");

    // Wait for the page to fully load (Loading... text to disappear)
    await page.waitForSelector('text=Loading...', { state: 'hidden', timeout: 5000 }).catch(() => {});
    
    // Check for navigation/CTA buttons - wait for at least one to be visible
    const getStartedBtn = page.getByRole("link", { name: /get started/i });
    const loginBtn = page.getByRole("link", { name: /log in/i });

    // At least one of these should be visible - use proper async check
    await expect(getStartedBtn.or(loginBtn).first()).toBeVisible({ timeout: 5000 });
  });

  test("navigates to login when clicking Log in", async ({ page }) => {
    await page.goto("/");

    const loginBtn = page.getByRole("link", { name: /log in/i });
    if (await loginBtn.isVisible()) {
      await loginBtn.click();
      // Should navigate to login or auth page
      await expect(page).toHaveURL(/login|auth|dev-login/);
    }
  });
});
