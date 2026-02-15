# E2E Testing Capability

## ADDED Requirements

### Requirement: Playwright Test Infrastructure

The system SHALL provide Playwright-based end-to-end testing infrastructure for the floorplan-app.

#### Scenario: Playwright is installed and configured

- **WHEN** a developer runs `npm install` in floorplan-app
- **THEN** Playwright and its dependencies are installed
- **AND** `playwright.config.ts` exists with proper base URL and browser configuration

#### Scenario: E2E tests can be executed

- **WHEN** a developer runs `npm run test:e2e`
- **THEN** Playwright executes all tests in the `tests/` directory
- **AND** test results are reported to the console

### Requirement: Playwright Test Agents

The system SHALL support Playwright test agents (planner, generator, healer) for AI-assisted test development.

#### Scenario: Test agents are initialized

- **WHEN** a developer runs `npx playwright init-agents --loop=vscode`
- **THEN** agent definition files are created in `.github/`
- **AND** agents can be invoked from VS Code or Claude

#### Scenario: Planner agent generates test plans

- **WHEN** the planner agent is invoked with a seed test
- **THEN** a Markdown test plan is generated in `specs/`
- **AND** the plan includes steps, expected results, and seed reference

#### Scenario: Generator agent creates tests from plans

- **WHEN** the generator agent is invoked with a spec file
- **THEN** executable Playwright tests are generated in `tests/`
- **AND** tests include verified selectors and assertions

#### Scenario: Healer agent repairs failing tests

- **WHEN** a test fails due to selector or UI changes
- **THEN** the healer agent can be invoked to auto-repair the test
- **AND** the repaired test passes or is skipped with explanation

### Requirement: Seed Test with Dev Authentication

The system SHALL provide a seed test that handles authentication using the dev-login bypass.

#### Scenario: Seed test authenticates successfully

- **WHEN** the seed test is executed
- **THEN** it navigates to `/dev-login`
- **AND** clicks the "Login as Dev User" button
- **AND** waits for navigation to `/dashboard`
- **AND** the page shows the authenticated dashboard

#### Scenario: Seed test is reusable by generated tests

- **WHEN** a generated test references the seed test
- **THEN** the test inherits the authenticated session
- **AND** can interact with protected routes

### Requirement: Core User Journey Tests

The system SHALL include E2E tests for core user journeys.

#### Scenario: Landing page tests exist

- **WHEN** E2E tests are executed
- **THEN** tests verify the landing page loads correctly
- **AND** navigation elements are accessible
- **AND** "Get Started" and "Log in" buttons are visible

#### Scenario: Dashboard tests exist

- **WHEN** an authenticated user visits the dashboard
- **THEN** tests verify the project list loads
- **AND** "New Project" button is accessible
- **AND** stats cards display (total projects, public, private, shared)

#### Scenario: Project operations tests exist

- **WHEN** E2E tests are executed
- **THEN** tests verify project creation works
- **AND** project editing (name, visibility) works
- **AND** project deletion works with confirmation

#### Scenario: 3D viewer tests exist

- **WHEN** a user opens a project
- **THEN** tests verify the 3D canvas renders
- **AND** camera controls (rotate, zoom) are interactive
- **AND** no WebGL errors appear in console

#### Scenario: Version management tests exist

- **WHEN** E2E tests are executed
- **THEN** tests verify creating a named version works
- **AND** switching between versions loads correct content
- **AND** version URL shows updated content after save

#### Scenario: Snapshot permalink tests exist

- **WHEN** E2E tests are executed
- **THEN** tests verify snapshot permalinks are generated
- **AND** "Copy Permalink" copies URL to clipboard
- **AND** permalink URL shows original content after edits

#### Scenario: Username management tests exist

- **WHEN** E2E tests are executed
- **THEN** tests verify username selection modal on first login
- **AND** username availability check works in real-time
- **AND** "Skip for now" assigns temporary username with nudge banner

#### Scenario: Project sharing tests exist

- **WHEN** E2E tests are executed
- **THEN** tests verify toggling "Make Public" works
- **AND** public projects are viewable without authentication
- **AND** private projects return 404 for unauthenticated users

#### Scenario: Collaboration tests exist

- **WHEN** E2E tests are executed
- **THEN** tests verify inviting collaborator by username works
- **AND** shared projects appear in collaborator's list
- **AND** removing collaborator revokes access immediately

#### Scenario: Project forking tests exist

- **WHEN** E2E tests are executed
- **THEN** tests verify forking a public project creates a copy
- **AND** fork shows "Forked from @owner/project" attribution
- **AND** forking inaccessible project is denied

### Requirement: Viewer-Core E2E Tests

The system SHALL include E2E tests for floorplan-viewer-core functionality.

#### Scenario: Camera mode switching tests exist

- **WHEN** E2E tests are executed
- **THEN** tests verify switching between perspective, orthographic, and isometric modes
- **AND** each mode renders correctly with appropriate controls

#### Scenario: Keyboard controls tests exist

- **WHEN** E2E tests are executed
- **THEN** tests verify WASD navigation moves the camera
- **AND** keyboard zoom (E/Q or +/-) works
- **AND** view presets (1-9 keys) switch camera positions

#### Scenario: Selection interaction tests exist

- **WHEN** E2E tests are executed
- **THEN** tests verify clicking a room selects it
- **AND** Shift+click adds to selection
- **AND** marquee selection (drag) selects multiple objects

#### Scenario: Floor visibility tests exist

- **WHEN** E2E tests are executed
- **THEN** tests verify floor visibility controls work
- **AND** toggling floors shows/hides respective floor geometry

#### Scenario: Annotation toggle tests exist

- **WHEN** E2E tests are executed
- **THEN** tests verify toggling annotations shows/hides labels
- **AND** area labels display correct measurements

#### Scenario: Theme switching tests exist

- **WHEN** E2E tests are executed
- **THEN** tests verify toggling between light and dark themes
- **AND** UI components update to match the selected theme
- **AND** 3D scene materials reflect theme changes

### Requirement: CI/CD Integration

The system SHALL run E2E tests in continuous integration.

#### Scenario: E2E tests run in GitHub Actions

- **WHEN** a pull request is opened or updated
- **THEN** E2E tests are executed in the CI workflow
- **AND** test results are reported as check status
- **AND** failing tests block merge

#### Scenario: Test artifacts are preserved

- **WHEN** a test fails in CI
- **THEN** trace files, screenshots, and videos are uploaded as artifacts
- **AND** developers can download and debug failures

### Requirement: npm Scripts for E2E Testing

The system SHALL provide convenient npm scripts for E2E testing.

#### Scenario: test:e2e runs all tests

- **WHEN** a developer runs `npm run test:e2e`
- **THEN** all Playwright tests execute in headless mode
- **AND** results are displayed in the terminal

#### Scenario: test:e2e:ui runs tests in UI mode

- **WHEN** a developer runs `npm run test:e2e:ui`
- **THEN** Playwright's interactive UI opens
- **AND** developers can run, debug, and trace tests visually

#### Scenario: test:e2e:headed runs tests with browser visible

- **WHEN** a developer runs `npm run test:e2e:headed`
- **THEN** tests execute with visible browser windows
- **AND** developers can observe test execution in real-time
