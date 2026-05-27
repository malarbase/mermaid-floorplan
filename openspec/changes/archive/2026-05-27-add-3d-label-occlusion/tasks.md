## 1. Core Occlusion Logic

- [x] 1.1 Add `occlusionEnabled: boolean` to `AnnotationState` (default `true`)
- [x] 1.2 Add `private raycaster`, `private _occlusionOrigin`, `private _occlusionDir`, `private _cameraPos` fields to `AnnotationManager`
- [x] 1.3 Implement `updateOcclusion(camera, scene)` — raycast from camera to each label, hide if opaque mesh hit before label
- [x] 1.4 Set `raycaster.far = dist - 0.05` to prevent self-occlusion flicker
- [x] 1.5 Add `isObjectVisible(object)` helper — walk ancestor chain to respect hidden floors/parents
- [x] 1.6 Restore all labels to `visibility = 'visible'` when `occlusionEnabled` is toggled off

## 2. Render Loop Integration

- [x] 2.1 Call `annotationManager.updateOcclusion(camera, scene)` in `BaseViewer.animate()` between WebGL and CSS2D renders

## 3. Vanilla UI Controls

- [x] 3.1 Add `initialOcclusionEnabled` and `onOcclusionEnabledChange` to `AnnotationControlsUIOptions`
- [x] 3.2 Add `occlusionEnabledCheckbox` to `AnnotationControlsUI` return type
- [x] 3.3 Render "Occlude Labels" checkbox in `createAnnotationControlsUI`
- [x] 3.4 Wire `#occlusion-enabled` change listener in `AnnotationManager.setupControls()`

## 4. Solid.js UI Controls

- [x] 4.1 Add `occlusionEnabled` and `onOcclusionEnabledChange` to `AnnotationControlsProps`
- [x] 4.2 Render `<Checkbox id="occlusion-enabled" label="Occlude Labels" />` in `AnnotationControls`

## 5. UI Surfaces

- [x] 5.1 Wire `onOcclusionEnabledChange` in `floorplan-viewer/src/main.ts`
- [x] 5.2 Add HTML checkbox to `floorplan-editor/index.html` Annotations section
- [x] 5.3 Wire `occlusionEnabled` change listener in `floorplan-editor/src/main.ts`
- [x] 5.4 Wire `onOcclusionEnabledChange` in `floorplan-app/src/components/viewer/ControlPanels.tsx`

## 6. Build & Test

- [x] 6.1 `floorplan-viewer-core` builds without errors
- [x] 6.2 All 55 viewer-core tests pass
- [x] 6.3 Full workspace build succeeds
- [x] 6.4 `npm test` passes (323 language + 33 MCP tests)
