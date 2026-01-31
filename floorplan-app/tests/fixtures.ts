import type { Page } from "@playwright/test";

/**
 * Authentication fixture for use in tests.
 * Handles dev-login authentication bypass.
 */
export async function loginAsDevUser(page: Page) {
  await page.goto("/dev-login");
  await page.getByRole("button", { name: "Login as Dev User" }).click();
  await page.waitForURL("/dashboard");
}
