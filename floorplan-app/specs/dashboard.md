# Dashboard Test Plan

## Seed Reference
- **Seed file:** `tests/seed.spec.ts`
- **Authentication:** Required (uses `loginAsDevUser`)

## Test Cases

### 1. Dashboard Heading
- **WHEN** authenticated user visits `/dashboard`
- **THEN** dashboard heading (h1) is visible

### 2. New Project Button
- **WHEN** user views dashboard
- **THEN** "New Project" button/link is visible
- **AND** clicking it navigates to `/new`

### 3. Project List Section
- **WHEN** user views dashboard
- **THEN** project list section is visible
- **AND** may show empty state for new users

### 4. Stats Cards
- **WHEN** user views dashboard
- **THEN** project-related statistics are displayed
- **AND** may show "0 projects" for empty state

## Expected Selectors
- `role=heading[level=1]` - Dashboard title
- `role=link[name=/new project/i]` - New project button
- `[data-testid='project-list']` - Project list container
- `text=/project/i` - Stats indicators
