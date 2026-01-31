# Design: Playwright E2E Testing with Test Agents

## Context

The floorplan-app is a SolidStart full-stack application with:
- Better Auth for authentication (Google OAuth)
- Convex for real-time database
- Dev-login bypass for local development (mock auth in localStorage)
- 3D floorplan viewer using Three.js

E2E tests need to work with the dev-login bypass to avoid OAuth complexity in CI.

## Goals / Non-Goals

**Goals:**
- Automate critical user journey testing (auth, dashboard, project CRUD, viewer)
- Leverage Playwright test agents for AI-assisted test generation
- Self-healing tests that adapt to UI changes
- Fast CI execution with parallel tests

**Non-Goals:**
- Testing real OAuth flow (use dev-login bypass)
- Testing against production Convex (use mock mode or self-hosted)
- Visual regression testing for pixel-perfect accuracy (focus on functional tests first)

## Decisions

### Decision 1: Use Playwright Test Agents

**Why:** Playwright 1.50+ includes three AI agents (planner, generator, healer) that:
- Automatically explore the app and generate test plans
- Convert plans to executable tests with verified selectors
- Self-repair failing tests when UI changes

**Alternatives considered:**
- Manual test writing: Higher maintenance burden, slower coverage growth
- Cypress: Good tool but lacks AI-assisted generation and self-healing

### Decision 2: Dev-Login for Authentication

**Why:** The existing dev-login page sets a mock session in localStorage, bypassing OAuth. This provides:
- Deterministic test setup without OAuth tokens
- Works in CI without credentials
- Matches how developers test locally

**Implementation:**
```typescript
// tests/seed.spec.ts
test('seed', async ({ page }) => {
  await page.goto('/dev-login');
  await page.click('button:has-text("Login as Dev User")');
  await page.waitForURL('/dashboard');
});
```

### Decision 3: Mock Convex Mode for CI

**Why:** CI shouldn't depend on cloud Convex. Two options:
1. **VITE_MOCK_MODE=true**: Components return mock data, no Convex connection
2. **Self-hosted Convex in Docker**: Full database behavior but requires more CI setup

**Initial approach:** Use mock mode for simplicity. Add self-hosted Convex later if deeper integration testing is needed.

### Decision 4: Directory Structure

```
floorplan-app/
├── tests/
│   ├── seed.spec.ts              # Authentication seed
│   ├── landing/
│   │   └── landing.spec.ts
│   ├── auth/
│   │   └── auth-flow.spec.ts
│   ├── dashboard/
│   │   └── dashboard.spec.ts
│   ├── projects/
│   │   ├── project-operations.spec.ts
│   │   ├── version-management.spec.ts
│   │   ├── snapshot-permalinks.spec.ts
│   │   ├── project-sharing.spec.ts
│   │   ├── collaboration.spec.ts
│   │   └── project-forking.spec.ts
│   ├── username/
│   │   └── username-management.spec.ts
│   └── viewer/
│       ├── 3d-viewer.spec.ts
│       ├── camera-modes.spec.ts
│       ├── keyboard-controls.spec.ts
│       ├── selection.spec.ts
│       ├── floor-visibility.spec.ts
│       ├── annotations.spec.ts
│       └── theme.spec.ts
├── specs/                         # Markdown test plans (AI-generated)
│   ├── landing-page.md
│   ├── auth-flow.md
│   ├── dashboard.md
│   ├── project-operations.md
│   ├── version-management.md
│   ├── snapshot-permalinks.md
│   ├── username-management.md
│   ├── project-sharing.md
│   ├── collaboration.md
│   ├── project-forking.md
│   ├── viewer-camera-modes.md
│   ├── viewer-keyboard-controls.md
│   ├── viewer-selection.md
│   ├── viewer-floor-visibility.md
│   ├── viewer-annotations.md
│   └── viewer-theme.md
├── playwright.config.ts
└── .github/
    └── agent-definitions/         # Playwright test agent prompts
```

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| AI-generated tests may have brittle selectors | Use healer agent to auto-repair; prefer role-based locators |
| Mock mode tests don't catch real Convex bugs | Phase 2: Add self-hosted Convex tests for integration |
| 3D viewer tests hard to assert | Focus on canvas existence and control interactions, not visual output |
| CI takes too long | Run tests in parallel, shard across workers |

### Decision 5: Commit Generated Test Plans

**Why:** AI-generated test plans may vary between runs. Committing `specs/` ensures:
- Reproducible CI runs
- Human review of planned coverage
- Git history of test evolution

**Implementation:**
```bash
# Regenerate when UI changes significantly
npx playwright test --planner
git add specs/
git commit -m "chore: update AI-generated test plans"
```

### Decision 6: Flaky Test Policy

**Why:** E2E tests can be flaky due to timing, network, animations. Need a policy to maintain CI reliability.

**Implementation:**
```typescript
// playwright.config.ts
export default defineConfig({
  retries: 2,  // Retry failed tests twice before marking failed
  expect: {
    timeout: 10000,  // Generous timeout for assertions
  },
});
```

**Quarantine policy:** If a test fails intermittently >3 times in a week despite retries, move it to `tests/quarantine/` and investigate. Don't delete - fix or replace.

### Decision 7: Visual Debugging in Development

**Why:** Developers need to see what tests are doing for debugging and confidence.

**Implementation:**
```bash
# Watch tests run in real browser
npx playwright test --headed

# Interactive UI with step-through debugging
npx playwright test --ui

# Generate trace for post-mortem debugging (enabled on retry by default)
npx playwright test --trace on
```

CI runs headless for speed; local development uses headed/UI mode for visibility.
