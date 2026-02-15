# Project Operations Test Plan

## Seed Reference
- **Seed file:** `tests/seed.spec.ts`
- **Authentication:** Required (uses `loginAsDevUser`)

## Test Cases

### 1. New Project Page
- **WHEN** user navigates to `/new`
- **THEN** project creation form is visible
- **AND** name input field is present

### 2. Form Fields
- **WHEN** user views new project form
- **THEN** required fields are visible
- **AND** form accepts input

### 3. Name Input
- **WHEN** user fills project name
- **THEN** name is reflected in preview/form state

### 4. Project Viewer
- **WHEN** user opens a project (e.g., `/viewer-test`)
- **THEN** 3D canvas or viewer content is visible

## Expected Selectors
- `role=heading` - Page heading
- `role=textbox[name=/name/i]` - Name input
- `input[type='text']` - Text inputs
- `canvas` - 3D viewer canvas
