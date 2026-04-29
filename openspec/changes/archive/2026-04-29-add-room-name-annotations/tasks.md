## 1. AnnotationManager Core

- [x] 1.1 Add `showRoomName: boolean` to `AnnotationState` interface with default `true`
- [x] 1.2 Add `roomNameLabels: CSS2DObject[]` tracking array to `AnnotationManager`
- [x] 1.3 Implement `updateRoomNameAnnotations()`: clear existing labels, bail if `!showRoomName || !floorplanData`, create CSS2DObjects per room using `room.label ?? room.name`
- [x] 1.4 Position each label at `(room.x + room.width/2, elevation + 0.7, room.z + room.height/2)` to clear area labels at +0.5
- [x] 1.5 Call `updateRoomNameAnnotations()` at the start of `updateAll()`
- [x] 1.6 Clean up `roomNameLabels` in `clearAllAnnotations()` (remove from parent, remove DOM element, clear array)

## 2. Vanilla JS UI

- [x] 2.1 Add `initialShowRoomName?: boolean` to `AnnotationControlsUIOptions`
- [x] 2.2 Add `onShowRoomNameChange?: (show: boolean) => void` to `AnnotationControlsUIOptions`
- [x] 2.3 Add `showRoomNameCheckbox: HTMLInputElement` to `AnnotationControlsUI` return type
- [x] 2.4 Create checkbox row "Show Room Names" in `createAnnotationControlsUI` (before area row)
- [x] 2.5 Return `showRoomNameCheckbox` from `createAnnotationControlsUI`

## 3. Solid UI Component

- [x] 3.1 Add `showRoomName?: boolean` to `AnnotationControlsProps`
- [x] 3.2 Add `onShowRoomNameChange?: (show: boolean) => void` to `AnnotationControlsProps`
- [x] 3.3 Add `<Checkbox id="show-room-name" label="Show Room Names" ...>` in `AnnotationControls`, checked by default

## 4. CSS Styling

- [x] 4.1 Add `.room-name-label` rule to `shared-styles.css` (dark semi-transparent pill, white text, 11 px bold, capitalised, pointer-events none)
- [x] 4.2 Add matching `.room-name-label` rule to `styles.ts`

## 5. Wiring

- [x] 5.1 Add `onShowRoomNameChange` callback to `createAnnotationControlsUI` call in `floorplan-viewer/src/main.ts`
- [x] 5.2 Add `onShowRoomNameChange` callback to annotation controls in `floorplan-app/src/components/viewer/ControlPanels.tsx`
