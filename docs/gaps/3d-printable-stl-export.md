# Gap: 3D-Printable STL/3MF Export

**Type:** Feature
**Area:** `floorplan-3d-core` — no STL/3MF export path exists today; if added naively the scene geometry is non-manifold and fails strict mesh validators.
**Status:** Not implemented. The scene as built is **slicer-printable** (PrusaSlicer / OrcaSlicer / Cura / Bambu Studio handle overlapping meshes correctly via per-layer 2D contour union) but **not validator-printable** (Meshmixer "Analyze", Netfabb, Microsoft 3D Builder flag non-manifold edges and overlapping volumes).

---

## Symptom

A user who wants to physically 3D-print a floorplan today has no entrypoint to do so. The only architectural exporter in the codebase is DXF (2D CAD), driven by [`scripts/export-dxf.ts`](../../scripts/export-dxf.ts). There is no STL/3MF/OBJ export.

If we naively wire up `THREE.STLExporter` to dump every mesh in the scene, the resulting file:

- Loads and slices correctly in mainstream FDM/SLA slicers — they slice each mesh per layer and union the contours, so the `~0.2 mm` corner overlaps disappear in the slice output.
- **Fails** strict mesh validators because the union of all wall meshes contains non-manifold edges (4+ faces sharing one edge at chevron apices) and thin volumetric overlaps.
- Requires the user to round-trip through a repair tool (Meshmixer, Netfabb, 3D Builder auto-repair) before getting a clean print.

For casual users this is friction; for users who want to feed the model into a CAD/CAM pipeline downstream it's a hard blocker.

---

## Where it lives

The non-manifoldness is **structural**, not a bug. Each wall edge is its own closed extrusion (manifold per-mesh):

```1198:1210:mermaid-floorplan/floorplan-3d-core/src/wall-network.ts
  shape.moveTo(-halfL, -halfT);
  shape.lineTo(halfL, -halfT);
  shape.lineTo(halfL, halfT);
  shape.lineTo(-halfL, halfT);
  shape.lineTo(-halfL, -halfT);
```

Adjacent edges are deliberately overlapped by a tiny embed at every shared node to defeat z-fighting:

```95:99:mermaid-floorplan/floorplan-3d-core/src/constants.ts
    WALL_CORNER_EMBED: 0.0001,
```

This trick is used in both engines:

- Legacy: vertical walls embed `WALL_CORNER_EMBED` into horizontal walls at every corner ([`wall-builder.ts` lines 1004-1016](../../floorplan-3d-core/src/wall-builder.ts)).
- Network (slanted mitre, after the [`slanted_mitre_fill`](../../../.cursor/plans/slanted_mitre_fill_243f609c.plan.md) plan lands): each slant face extends `WALL_CORNER_EMBED` past the bisector into the neighbour's body.

Walls also do not bond to the floor slab — they sit on top as separate meshes:

```{around 230}:{around 270}:mermaid-floorplan/floorplan-3d-core/src/scene-builder.ts
// floorGroup contains:
//   - floor slab (one mesh, with CSG cutouts for stairs)
//   - wallsGroup (N separate wall_edge_* meshes)
//   - stairs / lifts (independent groups)
```

---

## Root cause hypotheses

The renderer is optimised for **interactive use**, not for physical fabrication. Specifically:

1. **Per-edge meshes preserve per-edge identity.** The mesh registry, layer-toggle UI, hover/selection, and per-face material classification (`reassignNormalsToEdgeMaterials` over LEFT/RIGHT/TOP/BOTTOM groups) all assume each `wall_edge_*` mesh stays a separate `THREE.Mesh`. Fusing them via CSG union destroys these properties.
2. **Z-fighting prevention requires overlap.** Both engines deliberately introduce `~0.1 mm` overlap at corner seams to keep the depth buffer happy. That overlap is geometrically essential for the renderer and geometrically fatal for a strict-manifold validator.
3. **Doors and windows are CSG-subtracted from individual edges.** `three-bvh-csg` produces clean output per-edge but doesn't unify across edges.
4. **The floor slab uses CSG SUBTRACT for stair cutouts**, but is otherwise independent of walls. There is no "build the entire floor as one watertight body" pass.

Each of these decisions is correct for the visual renderer; together they preclude direct STL export of a printable body.

---

## Suggested fix shape

Add a separate **printable-export** module rather than changing the visual renderer. The renderer keeps its per-edge meshes and embed overlap; the export path produces a different, fused geometry on demand.

### Module sketch

```
mermaid-floorplan/floorplan-3d-core/src/
  printable-export.ts                 // new
  printable-export.test.ts            // new
mermaid-floorplan/scripts/
  export-stl.ts                       // new CLI wrapper, sibling of export-dxf.ts
```

```ts
export interface PrintableExportOptions {
  /** Per-floor or whole-building. Default: per-floor (one STL per floor). */
  granularity: "floor" | "building";
  /** Combine walls with floor slab. Default: true. */
  fuseFloorSlab: boolean;
  /** Embed override. Defaults to 0 (force exact mitres for export); >0 if union pass needs slack. */
  exportEmbed: number;
  /** Output format. Default: "stl". */
  format: "stl" | "3mf" | "obj";
}

export function buildPrintableGeometry(
  scene: THREE.Scene,
  opts?: PrintableExportOptions,
): { floorId: string; geometry: THREE.BufferGeometry }[];

export function exportToSTL(
  geometries: THREE.BufferGeometry[],
): string;
```

### Build steps

1. **Walk the scene** for `wall_edge_*` meshes and the floor slab per floor. Skip stairs/lifts unless explicitly opted in (they're already manifold per-mesh).
2. **Deep-copy geometries** so the export pass doesn't mutate the renderer's geometries.
3. **Re-emit walls without the embed offset** OR optionally with a slightly larger embed to give CSG union slack — both work, depending on how robust the union pass is on the input. Re-emitting from the `WallNetwork` (rather than copying GPU geometries) is cleaner and fits naturally with the wall-network engine.
4. **Run CSG UNION** over the per-edge meshes via the existing [`three-bvh-csg`](../../package-lock.json) dependency. The evaluator already handles the SUBTRACT case for door holes; UNION is the same API with a different op code.
5. **Optionally fuse the floor slab** with the unified wall mesh via a second UNION (gives a single watertight per-floor body — best for slicing).
6. **Emit STL/3MF/OBJ** via `THREE.STLExporter` (already in three's examples) or a 3MF library. STL is enough for v1.

### CSG union cost

For typical floorplans (10-50 wall edges per floor), pairwise UNION using `three-bvh-csg`'s BVH-accelerated evaluator runs in seconds even on a laptop. For very large plans, batch-union via tree reduction (UNION pairs, then UNION pairs of pairs) keeps the BVH builds bounded.

This is **not** in any interactive code path — it's invoked from a CLI / explicit "Export STL" UI button, so latency budget is generous.

---

## Acceptance criteria

1. `scripts/export-stl.ts` produces an STL per floor for `ImprovedTriplexVilla.floorplan`.
2. Each emitted STL passes `meshlab` / `admesh` strict-manifold checks (no naked edges, no non-manifold edges, no self-intersections beyond a small tolerance).
3. The visual renderer is unchanged — no regression in any existing 3d-core test.
4. CSG-unioned model imports cleanly into PrusaSlicer / OrcaSlicer with zero "non-manifold" warnings.
5. End-to-end smoke: STL slices to G-code and an FDM print of the smallest example floorplan completes at 1:50 scale (manual one-off; not part of CI).

---

## Out of scope

- **Hollowing walls for material savings** — that's a slicer concern (set infill < 100%).
- **Support structures and print-bed orientation** — slicer responsibility.
- **Minimum-feature-size enforcement** — at very small print scales (e.g. 1:200), wall thickness drops below ~1.5 mm and walls become fragile. A future option could enforce a minimum thickness override before fusing, but isn't required for v1.
- **Multi-material / multi-colour 3MF** with one body per material kind (walls vs. floor vs. furniture). v1 fuses everything; multi-material is a follow-up.
- **Curved walls and polygon rooms** — orthogonal to this gap; tracked in [`3d-wall-network-rebuild.md`](./3d-wall-network-rebuild.md) and [`openspec/changes/add-complex-room-shapes`](../../openspec/changes/add-complex-room-shapes/proposal.md).

---

## Cross-links

- [`3d-wall-network-rebuild.md`](./3d-wall-network-rebuild.md) — the network engine (and the upcoming slanted-mitre fill) is what produces the per-edge meshes this gap proposes to fuse.
- [`.cursor/plans/slanted_mitre_fill_243f609c.plan.md`](../../../.cursor/plans/slanted_mitre_fill_243f609c.plan.md) — the slanted mitre fill explicitly leaves printability out of scope; this gap captures the trade-off so the decision is documented.
- [`scripts/export-dxf.ts`](../../scripts/export-dxf.ts) — sibling 2D-CAD export to model the new STL CLI on.
