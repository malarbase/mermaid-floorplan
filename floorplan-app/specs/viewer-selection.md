# Viewer Selection Test Plan

## Seed Reference
- **Seed file:** `tests/seed.spec.ts`
- **Authentication:** Required (uses `loginAsDevUser`)

## Test Cases

### 1. Click Selection
- **WHEN** user clicks on a room in the canvas
- **THEN** room is selected
- **AND** selection is visually indicated

### 2. Shift-Click Multi-Select
- **WHEN** user shift-clicks on additional rooms
- **THEN** rooms are added to selection
- **AND** multiple rooms show selection state

### 3. Marquee Selection
- **WHEN** user drags to create selection rectangle
- **THEN** all rooms within rectangle are selected

### 4. Click Empty Space
- **WHEN** user clicks empty area
- **THEN** selection is cleared

## Interaction Patterns
- Single click: Select one, deselect others
- Shift+click: Add to selection
- Click+drag: Marquee selection
- Click empty: Deselect all
- Escape key: Deselect all

## Notes
- Selection state may be shown in properties panel
- Visual feedback should be immediate
