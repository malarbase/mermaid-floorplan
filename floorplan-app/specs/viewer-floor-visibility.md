# Viewer Floor Visibility Test Plan

## Seed Reference
- **Seed file:** `tests/seed.spec.ts`
- **Authentication:** Required (uses `loginAsDevUser`)

## Test Cases

### 1. Floor Controls Access
- **WHEN** user opens viewer
- **THEN** floor visibility controls are accessible

### 2. Floor Toggle
- **WHEN** user toggles floor visibility
- **THEN** floor geometry shows/hides accordingly
- **AND** toggle state is reflected in UI

### 3. Multi-Floor Support
- **WHEN** floorplan has multiple floors
- **THEN** each floor can be toggled independently

## Expected Selectors
- `role=button[name=/floor|level/i]` - Floor controls
- `role=checkbox[name=/floor|level/i]` - Floor toggles

## Notes
- Floor controls may be in panel or command palette
- Single-floor plans may not show floor controls
