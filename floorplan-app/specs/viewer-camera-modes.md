# Viewer Camera Modes Test Plan

## Seed Reference
- **Seed file:** `tests/seed.spec.ts`
- **Authentication:** Required (uses `loginAsDevUser`)

## Test Cases

### 1. Camera Controls Access
- **WHEN** user opens viewer
- **THEN** camera mode controls are accessible

### 2. Perspective Mode (Default)
- **WHEN** viewer initializes
- **THEN** perspective camera is active by default

### 3. Orthographic Mode
- **WHEN** user switches to orthographic
- **THEN** view changes to orthographic projection
- **AND** controls adapt appropriately

### 4. Isometric Mode
- **WHEN** user switches to isometric
- **THEN** view changes to isometric projection
- **AND** camera is positioned correctly

## Expected Selectors
- `role=button[name=/perspective|orthographic|isometric/i]` - Mode buttons
- `canvas` - WebGL canvas

## Notes
- Allow 15s timeout for WebGL initialization
- Mode switching should be instant
