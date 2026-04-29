## Why

The 3D viewer already supported area labels and dimension annotations but had no way to display the room's name (or its `label` override) as an overlay. Users needed to constantly cross-reference the DSL text to identify rooms while orbiting the model. Adding a toggleable room-name label improves at-a-glance orientation inside multi-room floorplans.

## What Changed

### AnnotationManager (`floorplan-viewer-core`)

- Added `showRoomName: boolean` to `AnnotationState` (default `true`).
- Added `roomNameLabels: CSS2DObject[]` tracking array for proper lifecycle management.
- Added `updateRoomNameAnnotations()` public method: iterates `floorplanData.floors[].rooms`, creates a `CSS2DObject` with class `room-name-label` above each room centre (Y = elevation + 0.7 to clear the area label at +0.5), and attaches it to the corresponding floor group.
- Wired `updateRoomNameAnnotations()` into `updateAll()` so it is refreshed on every annotation update.
- Added cleanup of `roomNameLabels` in `clearAllAnnotations()` to prevent memory leaks.
- Room display name uses `room.label ?? room.name` (respects DSL `label` overrides).

### UI — Vanilla JS (`floorplan-viewer-core`)

- Added `initialShowRoomName?: boolean` and `onShowRoomNameChange?: (show: boolean) => void` to `AnnotationControlsUIOptions`.
- Added `showRoomNameCheckbox: HTMLInputElement` to the `AnnotationControlsUI` return type.
- Inserted a "Show Room Names" checkbox row in `createAnnotationControlsUI`, before the area label checkbox.

### UI — Solid component (`floorplan-viewer-core`)

- Added `showRoomName?: boolean` and `onShowRoomNameChange?: (show: boolean) => void` to `AnnotationControlsProps`.
- Added corresponding `<Checkbox>` in `AnnotationControls` (checked by default).

### CSS (`floorplan-viewer-core`)

- Added `.room-name-label` styles in both `shared-styles.css` and `styles.ts`: semi-transparent dark pill, white text, 11 px bold, capitalised, `pointer-events: none`.

### Wiring (`floorplan-viewer` + `floorplan-app`)

- `floorplan-viewer/src/main.ts`: added `onShowRoomNameChange` callback to `createAnnotationControlsUI`.
- `floorplan-app/src/components/viewer/ControlPanels.tsx`: added `onShowRoomNameChange` callback.

## Capabilities

- **New**: `room-name-annotations` — CSS2D room-name labels, toggled via the Annotations panel, shown by default.

## Impact

- **floorplan-viewer-core** — `AnnotationState` gains `showRoomName`; `AnnotationControlsUIOptions` gains two new optional fields; `AnnotationControlsUI` return type gains `showRoomNameCheckbox`. Consumers that spread or destructure these interfaces may need updates if they exhaustively type-check the fields.
- No breaking changes for existing callers that ignore the new fields.
- Labels are visible by default; users can toggle them off via the Annotations panel.
