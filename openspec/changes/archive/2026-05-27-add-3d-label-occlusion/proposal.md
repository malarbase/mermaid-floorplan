## Why

CSS2D labels (room names, areas, dimensions, stair info) rendered by `CSS2DRenderer` always draw on top of the WebGL canvas because the DOM overlay has no depth buffer. This creates visual confusion: labels for rooms on the far side of a building float through walls and appear to tag elements they do not describe.

## What Changed

- **`AnnotationManager.updateOcclusion(camera, scene)`** in `floorplan-viewer-core/src/annotation-manager.ts`:
  - Added a per-frame raycast occlusion pass. For each label, a ray is cast from the active camera to the label's world position.
  - `raycaster.far = dist - 0.05` stops just before the label to prevent self-occlusion flicker.
  - Hits are filtered with `isObjectVisible()` which walks the entire ancestor chain, so hidden floors (or any invisible parent group) no longer spuriously occlude labels.
  - When `occlusionEnabled` is toggled off, all labels are restored to `visibility = 'visible'` immediately.

- **`AnnotationState.occlusionEnabled`** (default `true`):
  - Added to the shared `AnnotationState` interface so all consumers (viewer, editor, app) share the same toggle shape.

- **UI toggles across all three surfaces:**
  - Vanilla `annotation-controls-ui.ts` — new checkbox "Occlude Labels" with `onOcclusionEnabledChange` callback.
  - Solid.js `ControlPanels.tsx` — new `occlusionEnabled` prop + `onOcclusionEnabledChange` callback.
  - `floorplan-viewer/src/main.ts` — wired callback to `viewer.annotationManager.state.occlusionEnabled`.
  - `floorplan-editor/index.html` + `main.ts` — added HTML checkbox and wired into `updateAnnotations()`.
  - `floorplan-app/src/components/viewer/ControlPanels.tsx` — wired callback to `viewer.annotationManager.state.occlusionEnabled`.

- **`BaseViewer.animate()`** — called `annotationManager.updateOcclusion(...)` between WebGL render and CSS2D label render.

## Acceptance Criteria

1. Room name labels are hidden when a wall, floor slab, or stair mesh lies between the camera and the label.
2. Dimension labels (width, depth, height) follow the same occlusion rules.
3. Stair info and stair dimension labels follow the same occlusion rules.
4. No visible flicker at standard camera distances.
5. The occlusion behavior can be disabled via a checkbox in the Annotations panel.
6. Hidden floors do not contribute to occlusion.
7. No regression in existing annotation tests.
