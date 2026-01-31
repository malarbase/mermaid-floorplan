# Landing Page Test Plan

## Seed Reference
- **Seed file:** `tests/seed.spec.ts`
- **Authentication:** Not required for landing page

## Test Cases

### 1. Hero Section Display
- **WHEN** user navigates to `/`
- **THEN** the page title contains "floorplan"
- **AND** the hero section is visible

### 2. Navigation Buttons
- **WHEN** user views the landing page
- **THEN** "Get Started" or "Log in" buttons are visible
- **AND** buttons are clickable

### 3. Login Navigation
- **WHEN** user clicks "Log in"
- **THEN** user is navigated to `/login` or `/dev-login`

## Expected Selectors
- `main` - Hero content container
- `role=link[name=/get started/i]` - Get Started button
- `role=link[name=/log in/i]` - Login button
