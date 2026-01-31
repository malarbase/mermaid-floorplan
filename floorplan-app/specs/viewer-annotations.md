# Viewer Annotations Test Plan

## Seed Reference
- **Seed file:** `tests/seed.spec.ts`
- **Authentication:** Required (uses `loginAsDevUser`)

## Test Cases

### 1. Annotation Toggle Access
- **WHEN** user opens viewer
- **THEN** annotation toggle is accessible

### 2. Show/Hide Annotations
- **WHEN** user toggles annotations
- **THEN** room labels show/hide accordingly

### 3. Area Labels
- **WHEN** annotations are enabled
- **THEN** rooms display area measurements (sq ft/m²)

### 4. Label Positioning
- **WHEN** annotations are visible
- **THEN** labels are positioned within room bounds
- **AND** labels are readable (contrast, size)

## Expected Selectors
- `role=button[name=/annotation|label|measurement/i]` - Toggle button
- `role=checkbox[name=/annotation|label/i]` - Toggle checkbox

## Notes
- Annotations may include: room names, areas, dimensions
- Labels should not overlap or clip
