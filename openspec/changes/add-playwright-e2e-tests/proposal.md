# Add Playwright E2E Tests with Test Agents

## Why

The floorplan-app SolidStart application lacks automated end-to-end UI testing. Manual testing is error-prone and doesn't scale as the application grows. Playwright's new Test Agents feature (Planner, Generator, Healer) provides AI-assisted test generation and self-healing capabilities that reduce test maintenance burden.

## What Changes

- Add Playwright as a dev dependency with test agent support
- Initialize Playwright test agents (planner, generator, healer) for VS Code/Cursor
- Create seed test that handles dev-login authentication bypass
- Generate test plans for core user journeys:
  - Landing page and navigation
  - Dev login flow
  - Dashboard viewing and project list
  - Project creation and editing
  - 3D viewer interaction
  - Username selection flow
  - Version management (create, switch, mutable URLs)
  - Snapshot permalinks (immutable URLs, copy to clipboard)
  - Project sharing (public/private toggle, unauthenticated access)
  - Collaboration (invite by username, share links, revoke access)
  - Project forking (fork public/shared projects)
- Generate test plans for floorplan-viewer-core:
  - Camera modes (perspective, orthographic, isometric)
  - Keyboard controls (WASD navigation, zoom, view presets)
  - Selection interactions (click, shift-click, marquee)
  - Floor visibility controls
  - Annotation toggle and display
  - Theme switching (light/dark)
- Establish E2E test directory structure and conventions
- Add npm scripts for running E2E tests
- Configure CI/CD integration for E2E tests

## Impact

- **Affected specs:** New capability `e2e-testing`
- **Affected code:**
  - `floorplan-app/package.json` - new dev dependencies
  - `floorplan-app/playwright.config.ts` - Playwright configuration
  - `floorplan-app/tests/` - E2E test files
  - `floorplan-app/specs/` - Markdown test plans
  - `.github/workflows/` - CI integration
