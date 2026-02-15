# Viewer Theme Test Plan

## Seed Reference
- **Seed file:** `tests/seed.spec.ts`
- **Authentication:** Required (uses `loginAsDevUser`)

## Test Cases

### 1. Theme Toggle Access
- **WHEN** user opens viewer
- **THEN** theme toggle is accessible (light/dark)

### 2. Dark Theme
- **WHEN** user selects dark theme
- **THEN** `data-theme="dark"` is set on `<html>`
- **AND** UI updates to dark colors

### 3. Light Theme
- **WHEN** user selects light theme
- **THEN** `data-theme="light"` is set on `<html>`
- **AND** UI updates to light colors

### 4. Theme Persistence
- **WHEN** user sets theme and navigates away
- **THEN** theme preference persists on return

### 5. 3D Scene Theme
- **WHEN** theme changes
- **THEN** 3D scene background and materials update
- **AND** visual contrast is maintained

## Expected Selectors
- `role=button[name=/theme|dark|light/i]` - Theme toggle
- `html[data-theme]` - Theme attribute

## Notes
- Theme affects both UI components and 3D scene
- Use DaisyUI theme variables for consistency
