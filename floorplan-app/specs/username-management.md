# Username Management Test Plan

## Seed Reference
- **Seed file:** `tests/seed.spec.ts`
- **Authentication:** Required (uses `loginAsDevUser`)

## Test Cases

### 1. Settings Page Access
- **WHEN** authenticated user visits `/settings`
- **THEN** settings page loads or redirects appropriately

### 2. Username Display
- **WHEN** user views dashboard
- **THEN** username or user indicator is visible in header

### 3. Username Modal (New Users)
- **WHEN** new user without username visits dashboard
- **THEN** username selection modal appears

### 4. Skip for Now
- **WHEN** user skips username selection
- **THEN** temporary username is assigned
- **AND** nudge banner may appear

## Expected Selectors
- `header, nav` - User info container
- `[data-testid='username-modal']` - Username modal
- `[data-testid='username-nudge']` - Nudge banner

## Notes
- Mock user may already have username set
- Modal behavior depends on user state
