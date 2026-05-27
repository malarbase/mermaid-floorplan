# Plan: 3D Label Occlusion via Raycasting

## Goal
Make CSS2D labels (room names, areas, dimensions, stair info) hide behind walls, floors, stairs, and other opaque geometry instead of floating through them. This eliminates the visual confusion where labels appear to tag elements on the far side of the building.

## Background

The viewer uses `CSS2DRenderer` to draw HTML labels over the WebGL canvas. `CSS2DRenderer` renders DOM elements in a separate layer with `position: absolute` — it has no depth buffer and cannot depth-test against Three.js geometry. Labels therefore always draw on top, even when the entity they describe is occluded by walls or floors.

The fix is a **per-frame raycast occlusion pass**: for each label, cast a ray from the active camera to the label’s world position. If an opaque mesh is hit before the label, hide the label’s DOM element.

## Files to change

| File | Change |
|------|--------|
| `floorplan-viewer-core/src/annotation-manager.ts` | Add `updateOcclusion(camera, scene)` method; add `private raycaster` and vector caches |
| `floorplan-viewer-core/src/base-viewer.ts` | Call `annotationManager.updateOcclusion(...)` before `labelRenderer.render(...)` in the animation loop |
| `floorplan-viewer-core/src/annotation-manager.ts` | Optionally: add `occlusionEnabled` toggle to `AnnotationState` and wire into controls UI |

## Implementation steps

### Step 1 — Add occlusion method to AnnotationManager

In `annotation-manager.ts`:

1. Add a `private raycaster = new THREE.Raycaster()` field.
2. Add `private _occlusionOrigin = new THREE.Vector3()` and `private _occlusionDir = new THREE.Vector3()` to avoid per-frame allocations.
3. Implement `updateOcclusion(camera: THREE.Camera, scene: THREE.Scene): void`:
   - Collect all tracked labels into a flat array: `roomLabels`, `stairLabels`, `stairDimensionLabels`, `dimensionLabels`.
   - For each label:
     - `label.getWorldPosition(this._occlusionOrigin)`.
     - Compute distance from camera to origin.
     - Compute normalized direction from camera to origin.
     - `raycaster.set(cameraPos, dir)`.
     - Set `raycaster.near = 0.1` and `raycaster.far = dist - 0.05` (stop just before the label to avoid self-occlusion flicker).
     - `raycaster.intersectObjects(scene.children, true)`.
     - If any hit exists, `label.element.style.visibility = 'hidden'`; else `label.element.style.visibility = 'visible'`.

4. Add `occlusionEnabled: boolean` to `AnnotationState` (default `true`).
5. Early-return from `updateOcclusion` if `!this.state.occlusionEnabled`.

### Step 2 — Wire into the render loop

In `base-viewer.ts`, method `animate()` (around line 731):

Change:
```typescript
this._renderer.render(this._scene, this._cameraManager.activeCamera);
this.labelRenderer.render(this._scene, this._cameraManager.activeCamera);
```

To:
```typescript
this._renderer.render(this._scene, this._cameraManager.activeCamera);
this._annotationManager.updateOcclusion(this._cameraManager.activeCamera, this._scene);
this.labelRenderer.render(this._scene, this._cameraManager.activeCamera);
```

### Step 3 — Optional: add UI toggle

In `annotation-controls-ui.ts`, add a checkbox row:
- Label: "Occlude Labels"
- Checked by default
- On change: `viewer.annotationManager.state.occlusionEnabled = checked; viewer.annotationManager.updateOcclusion(...)` or simply let the next frame handle it.

Also update `AnnotationState` type export if consumers (e.g., `floorplan-app`) mirror the state shape.

### Step 4 — Test

1. Load `ImprovedTriplexVilla.floorplan`.
2. Enable room names + dimensions.
3. Orbit the camera to the back of the building.
4. Confirm labels on the far side are hidden while labels on the near side remain visible.
5. Confirm no flicker when labels sit exactly on wall planes (the `dist - 0.05` epsilon should prevent this).
6. Confirm toggling the occlusion checkbox immediately shows/hides the behavior.

## Performance budget

- Typical floorplan: 20–50 labels.
- One raycast per label per frame.
- `three.js` `Raycaster` with BVH-accelerated meshes is fast enough for <100 labels at 60 fps on modern hardware.
- If profiling shows cost, future optimizations:
  - Skip labels outside the viewport frustum.
  - Run occlusion every Nth frame (e.g., 2 or 3) and lerp visibility.
  - Skip occlusion in top-down orthographic mode where it is rarely needed.

## Risks and mitigations

| Risk | Mitigation |
|------|------------|
| Flicker when label sits on a wall plane | `raycaster.far = dist - 0.05` stops the ray just before the label position |
| Performance on very large floorplans | Frustum culling + frame skipping (future optimization) |
| Labels hidden by transparent or wireframe meshes | Raycaster hits all meshes; if transparent meshes should not occlude, filter by `material.opacity > 0.9` or `material.transparent === false` |
| Camera inside a room hides all interior labels | This is correct behavior — labels outside the room (through walls) should be hidden. Interior labels remain visible because the ray reaches them before hitting the enclosing wall from the inside. |

## Out of scope

- Replacing `CSS2DRenderer` with `CSS3DRenderer` — does not solve occlusion (CSS3D also lacks depth testing against WebGL geometry).
- Rendering labels inside the WebGL pipeline (e.g., `troika-three-text`) — tracked separately in `docs/gaps/webgl-text-troika-three-text.md`.
- Occlusion for the 2D SVG overlay — the overlay is a separate feature with its own visibility model.

## Acceptance criteria

1. Room name labels are hidden when a wall, floor slab, or stair mesh lies between the camera and the label.
2. Dimension labels (width, depth, height) follow the same occlusion rules.
3. Stair info and stair dimension labels follow the same occlusion rules.
4. No visible flicker at standard camera distances.
5. The occlusion behavior can be disabled via a checkbox in the Annotations panel.
6. No regression in existing annotation tests.
