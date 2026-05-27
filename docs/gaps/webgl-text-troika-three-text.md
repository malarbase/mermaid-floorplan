# Gap: WebGL Text Rendering Alternative via troika-three-text

**Type:** Architectural alternative / future exploration
**Area:** `floorplan-viewer-core` — annotation rendering pipeline
**Status:** Not implemented. Documented as a long-term alternative to CSS2D labels if occlusion, styling limits, or performance become blockers.

---

## Symptom

The current annotation system uses `CSS2DRenderer` + `CSS2DObject` to display room names, areas, dimensions, and stair info. This approach has inherent limitations:

1. **No depth testing** — labels float through walls and floors (see [`3d-label-occlusion.md`](./3d-label-occlusion.md)).
2. **No WebGL effects** — labels cannot receive shadows, be affected by fog, or participate in post-processing (bloom, SSAO, tone mapping).
3. **Z-index fighting with UI** — the CSS2D layer is a single DOM overlay; labels and UI widgets share the same compositing space, making it hard to interleave labels behind modal dialogs but above the canvas.
4. **Performance ceiling** — each label is a real DOM element. Hundreds of labels stress the browser's layout engine, not just the GPU.

These limitations are acceptable for the current feature set but may become blockers for:
- Dense floorplans with 100+ rooms per floor.
- VR/AR viewers where DOM overlays are unavailable or expensive.
- Advanced visual effects (architectural walkthroughs with post-processing).

---

## Where it lives

The CSS2D label pipeline is centralized in two files:

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

```318:324:floorplan-viewer-core/src/annotation-manager.ts
        const label = new CSS2DObject(wrapper);
        label.position.set(
          room.x + room.width / 2,
          (room.elevation || 0) + 0.6,
          room.z + room.height / 2,
        );
        floors[floorIndex]?.add(label);
```

All label styling is CSS-driven:

```312:400:floorplan-viewer-core/src/ui/styles.ts
/* === Annotation Labels (CSS2D) === */
.room-label {
  display: flex;
  ...
}

.room-label__name {
  background: rgba(30, 30, 30, 0.72);
  ...
}

.dimension-label {
  color: white;
  ...
}
```

---

## Root cause hypotheses

1. **CSS2DRenderer is a convenience renderer, not a production annotation system.** It was designed for simple labels (object names, debug info) where depth testing is unnecessary. Architectural floorplans need richer, depth-aware annotations.
2. **The DOM is the wrong layer for world-space text.** Browsers are optimized for document layout, not for hundreds of positioned labels in a 3D scene. The DOM-to-GPU bridge (compositing) adds overhead that pure WebGL text avoids.
3. **The styling investment is real.** The project has ~100 lines of CSS for labels (backgrounds, shadows, padding, responsive colors). Any WebGL text replacement must replicate or exceed this visual quality.

---

## Suggested fix shape

Replace (or supplement) the CSS2D label pipeline with [`troika-three-text`](https://www.npmjs.com/package/troika-three-text), a WebGL text renderer that:

- Renders text as a `THREE.Mesh` using signed-distance-field (SDF) glyphs.
- Participates fully in the WebGL pipeline: depth testing, shadows, fog, post-processing.
- Supports rich styling: font loading, outline, stroke, fill, curve radius, anchor positioning.
- Uses a custom shader for high-quality anti-aliasing at any scale.
- Is actively maintained and widely used in the Three.js ecosystem.

### Architecture comparison

| Aspect | CSS2D (current) | troika-three-text (proposed) |
|--------|-----------------|------------------------------|
| Depth testing | None — manual raycast workaround needed | Native — labels occlude automatically |
| Shadows / fog | No | Yes |
| Post-processing | No | Yes |
| DOM element count | One per label | Zero — pure WebGL |
| Font loading | System fonts + CSS | Any TTF/OTF/WOFF via `font=` attribute |
| Styling | Full CSS (backgrounds, borders, flexbox) | Shader-driven (fill, outline, stroke, opacity) |
| Background shapes | Easy — CSS `border-radius`, `box-shadow` | Hard — requires separate mesh geometry |
| Multi-line layout | Easy — HTML block layout | Limited — manual line breaks or multiple instances |
| Accessibility | Native — screen readers see DOM | Poor — requires ARIA overlay or alt text strategy |
| Performance (few labels) | Fast | Fast |
| Performance (many labels) | DOM layout bottleneck | GPU-bound — scales better |

### Implementation sketch

#### 1. Add dependency

```bash
npm install troika-three-text
```

#### 2. Create a WebGL label renderer

```ts
// floorplan-viewer-core/src/webgl-label-renderer.ts
import { Text } from 'troika-three-text';
import * as THREE from 'three';

interface WebGLLabel {
  textMesh: Text;
  backgroundMesh?: THREE.Mesh; // optional quad behind text
}

export class WebGLLabelRenderer {
  private labels: WebGLLabel[] = [];
  private fontUrl: string;

  constructor(fontUrl = '/fonts/Inter-Regular.woff') {
    this.fontUrl = fontUrl;
  }

  createLabel(
    text: string,
    position: THREE.Vector3,
    style: LabelStyle,
    parent: THREE.Object3D,
  ): WebGLLabel {
    const textMesh = new Text();
    textMesh.text = text;
    textMesh.fontSize = style.fontSize ?? 0.15;
    textMesh.color = style.color ?? 0xffffff;
    textMesh.anchorX = style.anchorX ?? 'center';
    textMesh.anchorY = style.anchorY ?? 'middle';
    textMesh.font = this.fontUrl;
    textMesh.position.copy(position);
    textMesh.sync(); // triggers SDF generation

    parent.add(textMesh);

    let backgroundMesh: THREE.Mesh | undefined;
    if (style.backgroundColor !== undefined) {
      // Compute text bounds after sync, then create a quad
      // This requires a frame delay or bounding-box callback
      backgroundMesh = this.createBackground(textMesh, style);
      parent.add(backgroundMesh);
    }

    const label = { textMesh, backgroundMesh };
    this.labels.push(label);
    return label;
  }

  dispose(): void {
    for (const label of this.labels) {
      label.textMesh.dispose();
      label.backgroundMesh?.geometry.dispose();
      (label.backgroundMesh?.material as THREE.Material)?.dispose();
    }
    this.labels = [];
  }
}
```

#### 3. Adapt AnnotationManager

Replace `CSS2DObject` creation with `WebGLLabelRenderer.createLabel()` calls. The `AnnotationManager` would hold a `WebGLLabelRenderer` instance instead of arrays of `CSS2DObject`.

Key changes:
- `updateRoomLabels()` creates `Text` meshes instead of `div` + `CSS2DObject`.
- `updateDimensionLabels()` creates `Text` meshes for width/depth/height labels.
- `updateStairLabels()` and `updateStairDimensionLabels()` follow the same pattern.
- `dispose()` calls `webglLabelRenderer.dispose()`.

#### 4. Background shapes

`troika-three-text` renders text only — no background rectangle. For the current label designs (`room-label__name` has a dark rounded background), options are:

1. **Separate mesh**: After `textMesh.sync()`, read `textMesh.geometry.boundingBox`, create a `THREE.PlaneGeometry` or `THREE.RoundedBoxGeometry` slightly larger than the text bounds, and place it behind the text mesh (`z - 0.001`).
2. **SDF outline**: Use `textMesh.outlineWidth` and `textMesh.outlineColor` to simulate a border. This is cheaper but cannot produce the pill-shaped rounded backgrounds used today.
3. **Hybrid**: Keep CSS2D for complex multi-element labels (room name + area badge) and use WebGL text only for simple single-line labels.

#### 5. Theming

Current labels use CSS variables (`var(--fp-text-secondary)`, `var(--fp-accent)`). A WebGL text pipeline would need:
- A theme-to-color mapping utility that converts CSS variable values to `THREE.Color` hex values.
- Reactive theme updates that re-sync text colors when the user toggles light/dark mode.

---

## Pros

- **True depth testing** — no manual raycasting, no floating labels.
- **Shadows and fog** — labels naturally dim in fog or cast/receive shadows if desired.
- **Post-processing compatibility** — labels appear in bloom, SSAO, and tone mapping passes.
- **No DOM overhead** — scales to hundreds of labels without browser layout thrashing.
- **Custom fonts** — load any WOFF/OTF font instead of relying on system fonts.
- **VR/AR ready** — no DOM layer needed; works in WebXR contexts.

## Cons

- **Background shapes are harder** — rounded pill backgrounds require separate geometry, not just CSS.
- **Multi-element labels are harder** — the current `room-label` contains a `room-label__name` div and a `room-label__area` div stacked with flexbox. Replicating this in WebGL requires either multiple `Text` instances or a single instance with manual layout.
- **Accessibility loss** — screen readers cannot read WebGL text. An ARIA overlay or hidden DOM fallback is needed.
- **Font loading complexity** — `troika-three-text` needs the font file available at runtime (or bundled). The current system uses system fonts for free.
- **Build size** — `troika-three-text` adds ~50 KB gzipped.
- **Migration cost** — every label type (room, stair, dimension, floor summary) needs re-implementation.

---

## Acceptance criteria (if pursued)

1. Room name labels render with visual parity to current CSS2D labels (font, size, color, background shape).
2. Labels are naturally occluded by walls, floors, and stairs without a manual raycast pass.
3. Labels remain readable in both light and dark themes.
4. No DOM elements are created per label.
5. Existing annotation toggle controls (Show Room Names, Show Areas, etc.) continue to work.
6. Performance is equal or better than CSS2D for `ImprovedTriplexVilla.floorplan` on a mid-range laptop.

---

## Out of scope

- **Full migration in one pass** — the CSS2D pipeline should remain functional; WebGL text can be introduced behind a feature flag or for specific label types first.
- **Text editing in 3D** — making labels editable inline in the viewport is a separate feature.
- **Billboarding** — labels that always face the camera. `troika-three-text` meshes can be billboards, but this is an optional enhancement.
- **Label collision avoidance** — preventing overlapping labels is a separate algorithmic problem.

---

## Cross-links

- [`3d-label-occlusion.md`](./3d-label-occlusion.md) — the short-term raycast fix for CSS2D labels. If that fix proves insufficient (performance, accuracy, or maintenance burden), this gap becomes the migration target.
- [`language-primitive-registry-codegen.md`](./language-primitive-registry-codegen.md) — if annotations become descriptor-driven, the renderer choice (CSS2D vs WebGL text) should be a descriptor-level configuration.
