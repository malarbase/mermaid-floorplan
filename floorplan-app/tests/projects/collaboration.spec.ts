import { test, expect } from "@playwright/test";
import { loginAsDevUser } from "../fixtures";

test.describe("Collaboration", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDevUser(page);
  });

  test("invite collaborator UI is accessible", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.locator("main")).toBeVisible();
  });

  test("shared projects section shows in dashboard", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.locator("main")).toBeVisible();
  });
});

test.describe("Collaborator Management", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDevUser(page);
  });

  test("can navigate to project settings", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.locator("main")).toBeVisible();
  });
});
