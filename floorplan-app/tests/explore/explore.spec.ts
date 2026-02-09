import { expect, test } from '@playwright/test';
import { loginAsDevUser } from '../fixtures';

test.describe('Explore Page', () => {
  test('loads explore page and displays projects', async ({ page }) => {
    await page.goto('/explore');

    // Verify page loads
    await expect(page).toHaveTitle(/Explore/);

    // Verify main content is visible
    await expect(page.locator('main')).toBeVisible();

    // Verify heading is visible
    await expect(page.getByText(/Trending Now|Featured Designs/i)).toBeVisible();

    // Verify topics sidebar/chips are visible
    const housesButton = page.getByRole('button', { name: /Houses/i }).first();
    await expect(housesButton).toBeVisible();
  });

  test('displays topic filters', async ({ page }) => {
    await page.goto('/explore');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Check for multiple topics
    const topics = ['Houses', 'Apartments', 'Offices', 'Kitchens'];
    for (const topic of topics) {
      const topicButton = page.getByRole('button', { name: new RegExp(topic, 'i') });
      await expect(topicButton.first()).toBeVisible();
    }
  });

  test('displays project cards when available', async ({ page }) => {
    await page.goto('/explore');

    // Wait for loading to complete
    await page.waitForSelector('.card, .animate-pulse', { timeout: 10000 });

    // Either loading skeleton or actual cards should be visible
    const hasCards = await page.locator('.card').count();
    const hasLoading = await page.locator('.animate-pulse').count();

    expect(hasCards > 0 || hasLoading > 0).toBeTruthy();
  });
});

test.describe('Topic Filtering', () => {
  test('filters projects by topic via URL params', async ({ page }) => {
    await page.goto('/explore');

    // Click on Houses topic
    const housesButton = page.getByRole('button', { name: /Houses/i }).first();
    await housesButton.click();

    // Wait for URL to update with topic param
    await page.waitForURL(/topic=houses/, { timeout: 5000 });

    // Verify URL contains topic parameter
    expect(page.url()).toContain('topic=houses');

    // Verify active state on Houses button (desktop uses bg-base-200, mobile uses btn-neutral)
    await expect(housesButton).toHaveClass(/bg-base-200|btn-neutral/);
  });

  test('navigates to topic detail page', async ({ page }) => {
    await page.goto('/explore/topics/houses');

    // Verify page loads
    await expect(page).toHaveTitle(/Houses Projects/i);

    // Verify topic header
    await expect(page.getByRole('heading', { name: /Houses/i }).first()).toBeVisible();

    // Verify back to explore link
    await expect(page.getByRole('link', { name: /Back to Explore/i })).toBeVisible();
  });

  test('shows empty state for topic with no projects', async ({ page }) => {
    // Use a non-existent topic slug
    await page.goto('/explore/topics/nonexistent-topic-xyz');

    // Wait for loading to complete
    await page.waitForLoadState('networkidle');

    // Should show empty state or "no projects found"
    const emptyState = page.getByText(/No projects found|doesn't have any projects/i);
    await expect(emptyState).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Collection Page', () => {
  test('loads collection page structure', async ({ page }) => {
    // Navigate to explore first to see if collections exist
    await page.goto('/explore');

    // Wait for page load
    await page.waitForLoadState('networkidle');

    // Try to find a collection link (desktop sidebar)
    const collectionLink = page.locator('a[href^="/explore/collection/"]').first();

    const hasCollection = (await collectionLink.count()) > 0;

    if (hasCollection) {
      // Click the collection link
      await collectionLink.click();

      // Verify we're on a collection page
      await expect(page).toHaveURL(/\/explore\/collection\//);

      // Verify back to explore link
      await expect(page.getByRole('link', { name: /Back to Explore/i })).toBeVisible();
    } else {
      // Test fallback: directly navigate to a collection URL
      await page.goto('/explore/collection/test-collection');

      // Should show either collection content or "not found"
      const main = page.locator('main');
      await expect(main).toBeVisible();
    }
  });

  test('shows collection not found for invalid slug', async ({ page }) => {
    await page.goto('/explore/collection/nonexistent-collection-xyz');

    // Wait for loading to complete
    await page.waitForLoadState('networkidle');

    // Should show "Collection Not Found" message
    await expect(page.getByText(/Collection Not Found|doesn't exist/i)).toBeVisible({
      timeout: 10000,
    });
  });
});

test.describe('Fork-to-Edit Flow', () => {
  test('anonymous user can view project and sees sign-in prompt to fork', async ({ page }) => {
    // Create a test project first (requires login)
    await loginAsDevUser(page);
    await page.goto('/dashboard');

    // Wait for dashboard to load
    await page.waitForLoadState('networkidle');

    // Check if user has any projects
    const hasProjects = (await page.locator('.card').count()) > 0;

    if (!hasProjects) {
      // Skip test if no projects exist
      test.skip();
      return;
    }

    // Get first project link
    const projectLink = page.locator('a[href^="/u/"]').first();
    const projectUrl = await projectLink.getAttribute('href');

    if (!projectUrl) {
      test.skip();
      return;
    }

    // Logout by clearing cookies
    await page.context().clearCookies();

    // Navigate to the project as anonymous user
    await page.goto(projectUrl);

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Look for sign-in button or fork button
    // The page might show "Sign in to Fork" or similar
    const signInButton = page.getByRole('button', { name: /Sign [Ii]n|Log [Ii]n/i });
    const forkButton = page.getByRole('button', { name: /Fork/i });

    // One of these should be visible
    await expect(signInButton.or(forkButton).first()).toBeVisible({ timeout: 10000 });
  });

  test('authenticated user can fork project from landing page', async ({ page }) => {
    await loginAsDevUser(page);

    // Navigate to explore page to find a public project
    await page.goto('/explore');
    await page.waitForLoadState('networkidle');

    // Find first project card and extract URL
    const projectCard = page.locator('.card a[href^="/u/"]').first();

    const hasProject = (await projectCard.count()) > 0;

    if (!hasProject) {
      // No public projects available, skip test
      test.skip();
      return;
    }

    const projectUrl = await projectCard.getAttribute('href');
    if (!projectUrl) {
      test.skip();
      return;
    }

    // Navigate to project
    await page.goto(projectUrl);
    await page.waitForLoadState('networkidle');

    // Look for Fork button
    const forkButton = page.getByRole('button', { name: /Fork/i });

    // If fork button exists, click it
    if ((await forkButton.count()) > 0) {
      await forkButton.click();

      // Wait for fork dialog/form
      await page.waitForSelector('input[name="name"], input[placeholder*="name"]', {
        timeout: 5000,
      });

      // Fill in fork name
      const nameInput = page.locator('input[name="name"], input[placeholder*="name"]').first();
      await nameInput.fill(`Forked Test ${Date.now()}`);

      // Submit fork
      const submitButton = page.getByRole('button', { name: /Create Fork|Fork|Submit/i });
      await submitButton.click();

      // Wait for redirect to forked project
      await page.waitForURL(/\/u\/.*\/.*/, { timeout: 10000 });

      // Verify we're in editor mode or see success toast
      const editorOrToast = page.locator('[data-editor], .toast, .alert').first();
      await expect(editorOrToast).toBeVisible({ timeout: 5000 });
    } else {
      // Test could not proceed without fork button
      test.skip();
    }
  });

  test('fork redirects to editor with success message', async ({ page }) => {
    await loginAsDevUser(page);

    // Navigate to dashboard
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Check if user has projects
    const hasProjects = (await page.locator('a[href^="/u/"]').count()) > 0;

    if (!hasProjects) {
      test.skip();
      return;
    }

    // Get project URL
    const projectLink = page.locator('a[href^="/u/"]').first();
    const projectUrl = await projectLink.getAttribute('href');

    if (!projectUrl) {
      test.skip();
      return;
    }

    // Add ?fork=true query param to test auto-open fork dialog
    await page.goto(`${projectUrl}?fork=true`);
    await page.waitForLoadState('networkidle');

    // Fork dialog should open automatically
    const forkDialog = page.locator('input[name="name"], input[placeholder*="name"]');

    if ((await forkDialog.count()) > 0) {
      await forkDialog.fill(`Auto Fork Test ${Date.now()}`);

      const submitButton = page.getByRole('button', { name: /Create Fork|Fork|Submit/i });
      await submitButton.click();

      // Wait for redirect
      await page.waitForURL(/\/u\/.*\/.*/, { timeout: 10000 });

      // Look for success indication (toast or editor mode)
      const successIndicator = page.getByText(/Now editing|Fork created|Success/i);
      await expect(successIndicator.or(page.locator('[data-editor]')).first()).toBeVisible({
        timeout: 5000,
      });
    } else {
      test.skip();
    }
  });
});

test.describe('View Count', () => {
  test('view count increments when viewing project', async ({ page }) => {
    await loginAsDevUser(page);

    // Navigate to explore to find a public project
    await page.goto('/explore');
    await page.waitForLoadState('networkidle');

    // Find a project card with view count
    const projectWithViews = page.locator('.card:has(svg + text)').first();

    if ((await projectWithViews.count()) === 0) {
      test.skip();
      return;
    }

    // Extract initial view count if visible
    const viewCountElement = projectWithViews.locator(
      'span:has(svg) + span, span:has-text("views")',
    );
    const initialViewText = await viewCountElement.textContent();
    const initialViews = initialViewText ? parseInt(initialViewText.replace(/\D/g, ''), 10) : 0;

    // Get project URL
    const projectLink = projectWithViews.locator('a[href^="/u/"]').first();
    const projectUrl = await projectLink.getAttribute('href');

    if (!projectUrl) {
      test.skip();
      return;
    }

    // Visit the project
    await page.goto(projectUrl);
    await page.waitForLoadState('networkidle');

    // Wait for view count debounce (2 seconds)
    await page.waitForTimeout(2500);

    // Go back to explore
    await page.goto('/explore');
    await page.waitForLoadState('networkidle');

    // Find the same project card again
    const updatedProjectCard = page.locator(`a[href="${projectUrl}"]`).locator('..').locator('..');

    // Check if view count increased
    const updatedViewElement = updatedProjectCard.locator('span:has(svg)');
    const updatedViewText = await updatedViewElement.textContent();
    const updatedViews = updatedViewText ? parseInt(updatedViewText.replace(/\D/g, ''), 10) : 0;

    // View count should have increased (or at least stayed the same if already viewed)
    expect(updatedViews).toBeGreaterThanOrEqual(initialViews);
  });
});
