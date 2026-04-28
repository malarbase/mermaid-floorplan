# Attempted fix: Z-fighting polish via shadow bias + polygonOffset (FAILED)

**Type:** Failed Attempt  
**Area:** `floorplan-3d-core`, `floorplan-viewer-core`  
**Branch:** `attempt/z-fight-polygon-offset`  
**Outcome:** Reverted — artifacts still visible in the browser after the changes were applied.

---

## Context

After Phases 1–4 of the Z-fighting fix (camera near/far + logarithmicDepthBuffer, slab CSG inflation, wall slab-embed, adjacency-aware corner geometry), two visual artifacts remained when running `make viewer-dev`:

1. **Z-fighting** — shimmery flicker where walls meet walls (at corners) and walls meet floors.
2. **Bump** — a visible step/ledge where a perpendicular wall meets a straight wall.

All 248 tests were passing at the start of the session.

---

## What was attempted

### Phase A — Shadow bias on BaseViewer

Added `directionalLight.shadow.bias` and `shadow.normalBias` to `BaseViewer`'s constructor
(`floorplan-viewer-core/src/base-viewer.ts`).  The headless renderer in
`floorplan-3d-core/src/lighting-utils.ts` already had `bias = -0.001` but the interactive viewer
had no bias set (default `0`), which causes shadow acne on flat surfaces.

Promoted the magic numbers to `DIMENSIONS.SHADOW = { BIAS: -0.001, NORMAL_BIAS: 0.02 }` in
`floorplan-3d-core/src/constants.ts` so both paths stay in sync.

**Rationale:** Shadow acne can manifest as a shimmery floor↔wall flicker. Adding the same bias the
headless renderer uses was expected to eliminate that component.

### Phase B — polygonOffset on horizontal wall materials

Added `polygonOffset = true`, `polygonOffsetFactor = -1`, `polygonOffsetUnits = -1` to horizontal
(top/bottom) wall materials in `MaterialFactory.createWallMaterial` and
`createPerFaceWallMaterials` (`floorplan-3d-core/src/materials.ts`).

**Rationale:** The 1 mm embed from `adjustSegmentsForCorners` leaves a thin (~0.001 m) coplanar
strip at every corner where the end face of a vertical wall coincides with the inner face of a
horizontal wall.  A negative `polygonOffset` shifts the horizontal wall's depth value toward the
camera so it always wins the depth-buffer comparison at that strip, hiding the Z-fighting without
any geometry change.

### Phase C — Tighter embed constant

Introduced `DIMENSIONS.GEOMETRY.WALL_CORNER_EMBED = 0.0001` (0.1 mm) to replace the previous
re-use of `CUTTER_INFLATE` (1 mm) as the embed depth in `adjustSegmentsForCorners`.  The 1 mm
embed was perceptible as the "bump" at perpendicular junctions; 0.1 mm is invisible at any
architectural camera distance.

`CUTTER_INFLATE` was left unchanged at 1 mm — it is only used by the floor-slab CSG cutters for
stair/lift holes, not by wall geometry.

---

## Changes committed to this branch

| File | Change |
|---|---|
| `floorplan-3d-core/src/constants.ts` | Added `DIMENSIONS.SHADOW`, `DIMENSIONS.GEOMETRY.WALL_CORNER_EMBED` |
| `floorplan-3d-core/src/lighting-utils.ts` | Reference `DIMENSIONS.SHADOW` constants instead of literals |
| `floorplan-3d-core/src/materials.ts` | `createWallMaterial` accepts optional `direction`; sets `polygonOffset` for horizontal walls |
| `floorplan-3d-core/src/wall-builder.ts` | Pass `wall.direction` in `generateSimpleWall`; switch embed to `WALL_CORNER_EMBED` |
| `floorplan-viewer-core/src/base-viewer.ts` | Add `shadow.bias` and `shadow.normalBias` to directional light config |
| `floorplan-viewer-core/vitest.config.ts` | Add `resolve.alias` so tests resolve `floorplan-3d-core` from source |
| `floorplan-3d-core/test/wall-corner-geometry.test.ts` | Use `WALL_CORNER_EMBED`, tighten tolerance, fix literal-type inference |
| `floorplan-3d-core/test/wall-material-offset.test.ts` *(new)* | Asserts horizontal walls have `polygonOffset`, vertical walls do not |
| `floorplan-viewer-core/test/base-viewer-shadow.test.ts` *(new)* | Asserts `DIMENSIONS.SHADOW` values are correct and applied to a light |

Test result: **252/252 `floorplan-3d-core` · 61/61 `floorplan-viewer-core` — all green.**

---

## Why it failed

Tests passed, but running `make viewer-dev` and inspecting the scene showed the artifacts were still
present.  The likely reasons:

1. **`polygonOffset` is insufficient for the depth-buffer tie at the coplanar strips.**  At oblique
   camera angles the GPU fragment depth for coplanar triangles at the same Z can vary by more than
   the `factor=-1, units=-1` offset, especially when `logarithmicDepthBuffer: true` is in use.
   The logarithmic buffer changes the depth precision distribution across the near–far range in a
   way that can make a fixed polygon-offset factor produce inconsistent results depending on distance
   from the camera.

2. **The root geometry topology is still broken.**  The plan's diagnosis identified three coplanar
   conditions (top faces at corners, side faces at exterior corners, shadow acne at floor) but
   `polygonOffset` only helps when the competing triangles are *exactly* coplanar in NDC space.  If
   the actual geometry has any floating-point misalignment (the embed is now 0.0001 m, well inside
   float32 precision for 10 m rooms) the fight isn't a tie — and `polygonOffset` does nothing for
   a non-tie.

3. **Architectural conclusion from the gap doc remains correct:**  per-room box-wall approaches
   face a geometric trilemma at every perpendicular junction that cannot be solved by material
   flags.  The fix must be topological.

---

## Next step

Proceed with the **wall-network rebuild** documented in
[`3d-wall-network-rebuild.md`](../3d-wall-network-rebuild.md).

Key excerpt from that doc:

> A wall graph would instead operate **per-edge**: collect all wall edges across the floor, compute
> mitered intersections once, and emit exactly one mesh per edge. Corner geometry becomes trivially
> correct — each corner mesh is emitted by the node that owns it, with no possibility of duplicates.

That approach eliminates all three coplanar conditions at the source rather than masking them in
the depth buffer.
