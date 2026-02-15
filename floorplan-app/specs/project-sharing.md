# Project Sharing Test Plan

## Seed Reference
- **Seed file:** `tests/seed.spec.ts`
- **Authentication:** Varies by test case

## Test Cases

### 1. Visibility Toggle
- **WHEN** owner views project settings
- **THEN** visibility toggle (public/private) is accessible

### 2. Public Project Access
- **WHEN** unauthenticated user visits public project URL
- **THEN** project content is viewable

### 3. Private Project Access
- **WHEN** unauthenticated user visits private project URL
- **THEN** 404 error is shown OR user is redirected to login

## Expected Selectors
- `role=checkbox[name=/public|private|visibility/i]` - Visibility toggle

## Notes
- Requires real project URLs for full testing
- Private projects should not leak existence
