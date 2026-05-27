# Gap: 3D CSS2D labels float through walls because CSS2DRenderer lacks depth testing

**Type:** Feature / UX fix
**Area:** `floorplan-viewer-core` — `annotation-manager.ts`, `base-viewer.ts`
**Status:** Not implemented. Labels always render on top of the WebGL canvas, causing visual confusion about which room or stair they actually describe.

---

## Symptom

When orbiting a floorplan in 3D, room name labels, area labels, dimension labels, and stair info labels remain visible even when the entity they tag is on the far side of a wall or floor slab. The labels appear to "float" through solid geometry, making it hard to tell whether a label belongs to a visible room or an occluded one behind it.

This is especially confusing in multi-floor buildings (`ImprovedTriplexVilla.floorplan`) where labels from lower floors bleed through upper floor slabs.

---

## Where it lives

The viewer uses `CSS2DRenderer` from `three/examples/jsm/renderers/CSS2DRenderer.js`:

```232:241:floorplan-viewer-core/src/base-viewer.ts
    // Init CSS2D renderer for labels
    this.labelRenderer = new CSS2DRenderer();
    this.labelRenderer.setSize(
      container.clientWidth || window.innerWidth,
      container.clientHeight || window.innerHeight,
    );
    this.labelRenderer.domElement.style.position = 'absolute';
    this.labelRenderer.domElement.style.top = '0px';
    this.labelRenderer.domElement.style.pointerEvents = 'none';
    container.appendChild(this.labelRenderer.domElement);
```

Labels are created as `CSS2DObject` instances and attached to the scene graph:

```318:324:floorplan-viewer-core/src/annotation-manager.ts
        const label = new CSS2DObject(wrapper);
        label.position.set(
          room.x + room.width / 2,
          (room.elevation || 0) + 0.6,
          room.z + room.height / 2,
        );
        floors[floorIndex]?.add(label);
```

The render loop draws WebGL first, then CSS2D on top:

```731:732:floorplan-viewer-core/src/base-viewer.ts
    this._renderer.render(this._scene, this._cameraManager.activeCamera);
    this.labelRenderer.render(this._scene, this._cameraManager.activeCamera);
```

Because `CSS2DRenderer` renders HTML elements in a separate DOM layer, there is no depth buffer interaction with the WebGL scene. Labels are always composited on top.

---

## Root cause hypotheses

1. **CSS2DRenderer is designed for HUD-style labels**, not for world-space labels that need to respect scene depth. Three.js documentation explicitly notes that CSS2D/CSS3D renderers do not depth-test against WebGL geometry.
2. **The annotation manager has no occlusion logic.** It creates labels, positions them, and shows/hides them based on toggle state, but never checks whether the label’s world position is visible from the camera.
3. **Switching to CSS3DRenderer would not help.** CSS3D transforms DOM elements in 3D space, but they are still rendered in a separate DOM layer without depth testing against the canvas.

---

## Suggested fix shape

Add a **per-frame raycast occlusion pass** in the animation loop.

### Module sketch

```ts
// In AnnotationManager
private raycaster = new THREE.Raycaster();
private _occlusionOrigin = new THREE.Vector3();
private _occlusionDir = new THREE.Vector3();

updateOcclusion(camera: THREE.Camera, scene: THREE.Scene): void {
  if (!this.state.occlusionEnabled) return;

  const allLabels = [
    ...this.roomLabels,
    ...this.stairLabels,
    ...this.stairDimensionLabels,
    ...this.dimensionLabels,
  ];

  const cameraPos = camera.position;

  for (const label of allLabels) {
    label.getWorldPosition(this._occlusionOrigin);
    const dist = cameraPos.distanceTo(this._occlusionOrigin);
    this._occlusionDir.subVectors(this._occlusionOrigin, cameraPos).normalize();

    this.raycaster.set(cameraPos, this._occlusionDir);
    this.raycaster.near = 0.1;
    this.raycaster.far = dist - 0.05; // stop just before the label

    const hits = this.raycaster.intersectObjects(scene.children, true);
    label.element.style.visibility = hits.length > 0 ? 'hidden' : 'visible';
  }
}
```

### Render loop change

```ts
// In BaseViewer.animate()
this._renderer.render(this._scene, this._cameraManager.activeCamera);
this._annotationManager.updateOcclusion(this._cameraManager.activeCamera, this._scene);
this.labelRenderer.render(this._scene, this._cameraManager.activeCamera);
```

### Why this works

- `CSS2DObject` has no geometry, so the raycaster never hits the labels themselves.
- The ray stops `0.05` units before the label position, preventing flicker when a label sits exactly on a wall plane.
- Only opaque scene meshes (walls, floors, stairs) produce hits.
- The cost is one raycast per label per frame — acceptable for typical floorplans with 20–50 labels.

### Optional toggle

Add `occlusionEnabled: boolean` to `AnnotationState` (default `true`) and surface it as a checkbox in the Annotations panel.

---

## Performance considerations

| Scenario | Cost | Mitigation |
|----------|------|------------|
| 20–50 labels | Negligible at 60 fps | None needed |
| 100+ labels | May drop frames on low-end GPUs | Frustum cull labels first; run occlusion every 2nd frame |
| Top-down orthographic | Occlusion rarely needed | Skip when camera angle is near-vertical |

---

## Acceptance criteria

1. Room name labels are hidden when a wall, floor slab, or stair mesh lies between the camera and the label.
2. Dimension labels (width, depth, height) follow the same occlusion rules.
3. Stair info and stair dimension labels follow the same occlusion rules.
4. No visible flicker at standard camera distances.
5. The occlusion behavior can be disabled via a checkbox in the Annotations panel.
6. No regression in existing annotation tests.

---

## Out of scope

- **CSS3DRenderer migration** — does not solve the depth-testing problem.
- **WebGL text rendering** (e.g., `troika-three-text`) — a separate, larger architectural change tracked in [`webgl-text-troika-three-text.md`](./webgl-text-troika-three-text.md).
- **2D SVG overlay occlusion** — the overlay is a separate feature with its own visibility model.
- **Per-label fade transitions** — nice-to-have; can be added later with CSS transitions on `opacity`.

---

## Cross-links

- [`webgl-text-troika-three-text.md`](./webgl-text-troika-three-text.md) — alternative approach: render labels inside the WebGL pipeline for true depth testing, at the cost of losing CSS styling.
- [`ui-render-layer-toggles.md`](./ui-render-layer-toggles.md) — related visibility work; layer toggles control which mesh categories exist, while occlusion controls whether labels are visible through those meshes.
