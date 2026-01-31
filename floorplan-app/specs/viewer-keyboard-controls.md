# Viewer Keyboard Controls Test Plan

## Seed Reference
- **Seed file:** `tests/seed.spec.ts`
- **Authentication:** Required (uses `loginAsDevUser`)

## Test Cases

### 1. WASD Navigation
- **WHEN** user presses W/A/S/D keys
- **THEN** camera moves forward/left/backward/right

### 2. Zoom Controls
- **WHEN** user presses E/Q (or +/-)
- **THEN** camera zooms in/out

### 3. View Presets
- **WHEN** user presses number keys (1-9)
- **THEN** camera switches to preset positions

### 4. Escape Deselection
- **WHEN** user presses Escape
- **THEN** current selection is cleared

## Key Mappings
- `W` - Move forward
- `A` - Move left
- `S` - Move backward
- `D` - Move right
- `E` - Zoom in
- `Q` - Zoom out
- `1-9` - View presets
- `Escape` - Deselect

## Notes
- Canvas must have focus for keyboard events
- Test each key individually for isolation
