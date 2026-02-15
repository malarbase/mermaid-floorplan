# 3D Viewer Test Plan

## Seed Reference
- **Seed file:** `tests/seed.spec.ts`
- **Authentication:** Required (uses `loginAsDevUser`)

## Test Cases

### 1. Canvas Rendering
- **WHEN** user opens `/viewer-test`
- **THEN** WebGL canvas is rendered and visible
- **AND** canvas has reasonable dimensions (>100px)

### 2. No WebGL Errors
- **WHEN** page loads and initializes
- **THEN** no WebGL or shader errors appear in console

### 3. Mouse Rotation
- **WHEN** user drags on canvas
- **THEN** camera rotates without errors

### 4. Scroll Zoom
- **WHEN** user scrolls on canvas
- **THEN** camera zooms in/out without errors

## Expected Selectors
- `canvas` - WebGL rendering surface
- `main` - Container element

## Notes
- Allow 15s timeout for WebGL initialization
- Filter console for WebGL/GL_/shader errors
