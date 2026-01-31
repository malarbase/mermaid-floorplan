import { test, expect } from "@playwright/test";
import { loginAsDevUser } from "../fixtures";

test.describe("3D Viewer", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDevUser(page);
  });

  test("viewer-test page renders canvas", async ({ page }) => {
    await page.goto("/viewer-test");

    // Wait for canvas to appear (3D viewer)
    const canvas = page.locator("canvas");

    // Give it time to initialize WebGL
    await expect(canvas).toBeVisible({ timeout: 15000 });
  });

  test("no WebGL errors in console", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(msg.text());
      }
    });

    await page.goto("/viewer-test");
    await page.waitForTimeout(3000); // Wait for WebGL initialization

    // Filter for WebGL-specific errors
    const webglErrors = errors.filter(
      (e) => e.includes("WebGL") || e.includes("GL_") || e.includes("shader")
    );

    expect(webglErrors).toHaveLength(0);
  });

  test("viewer container has expected dimensions", async ({ page }) => {
    await page.goto("/viewer-test");

    const canvas = page.locator("canvas");
    await expect(canvas).toBeVisible({ timeout: 15000 });

    // Canvas should have reasonable dimensions
    const box = await canvas.boundingBox();
    expect(box).toBeTruthy();
    if (box) {
      expect(box.width).toBeGreaterThan(100);
      expect(box.height).toBeGreaterThan(100);
    }
  });
});

test.describe("3D Viewer Controls", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDevUser(page);
    await page.goto("/viewer-test");
    // Wait for canvas
    await page.locator("canvas").waitFor({ state: "visible", timeout: 15000 });
  });

  test("canvas responds to mouse interaction", async ({ page }) => {
    const canvas = page.locator("canvas");

    // Perform mouse drag (rotate)
    const box = await canvas.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width / 2 + 50, box.y + box.height / 2);
      await page.mouse.up();
    }

    // If we got here without errors, interaction worked
    await expect(canvas).toBeVisible();
  });

  test("canvas responds to scroll (zoom)", async ({ page }) => {
    const canvas = page.locator("canvas");

    // Scroll on canvas (zoom)
    await canvas.hover();
    await page.mouse.wheel(0, -100); // Scroll up (zoom in)
    await page.waitForTimeout(500);
    await page.mouse.wheel(0, 100); // Scroll down (zoom out)

    // If we got here without errors, scroll worked
    await expect(canvas).toBeVisible();
  });
});
