## Why

The 3D viewer exhibited two related z-fighting artifacts:

1. **Floor–wall coplanar seam**: walls and floor slabs shared an identical Y face at every floor boundary, causing GPU depth-test flickering (z-fighting) at the wall bottom.
2. **Ceiling shimmer at orbit angles**: the original fix extended walls symmetrically into both the slab above and below. This buried the floor-side seam successfully, but the volumetric overlap between a wall mesh and the ceiling slab produced a "shimmer" effect whenever the camera grazed the slab edge from outside — even a 2 mm overlap was enough to trigger depth-precision banding at orbit angles when `logarithmicDepthBuffer` was active.

An attempt branch (`attempt/z-fight-polygon-offset`) explored `polygonOffset` + shadow-bias tweaks but found those unreliable with `logarithmicDepthBuffer` and discarded them.

## What Changed

### Geometry — asymmetric wall span (`floorplan-3d-core`)

- Added `DIMENSIONS.WALL.EMBED = 0.02` (20 mm): distance walls extend **down** into the floor slab below to bury the floor↔wall coplanar seam.
- Added `DIMENSIONS.WALL.CEILING_GAP = 0.005` (5 mm): air gap between the wall top face and the ceiling slab bottom. Walls deliberately fall short of the slab above so the two solids never overlap volumetrically; this eliminates shimmer at all orbit angles.
- `createWallSegmentGeometry`: wall height becomes `wallHeight + EMBED − CEILING_GAP` (asymmetric), replacing the earlier `wallHeight + 2 × EMBED` (symmetric).
- `generateWallWithCSG` and `generateSimpleWall`: wall center Y shifted to `elevation + wallHeight/2 − EMBED/2 − CEILING_GAP/2` so both the bottom and top faces land at their exact target world positions.
- Added wall corner tightening via `hasNeighborAtCorner` and `WALL_CORNER_EMBED` so horizontal walls only extend past room edges when no perpendicular neighbour fills the corner.
- Added `DIMENSIONS.GEOMETRY.CUTTER_INFLATE` so stair/lift CSG cutters are slightly over-sized, preventing coplanar strips at penetration-hole edges.
- Added `floorGroup.updateMatrixWorld(true)` before computing the bounding box for lift penetrations to ensure correct world-space extents.

### Renderer (`floorplan-viewer-core`)

- Enabled `logarithmicDepthBuffer` on `WebGLRenderer` for sub-millimetre depth precision.
- Tightened camera near/far to `0.5 / 500`.

### Tests (`floorplan-3d-core`)

- `wall-floor-embed.test.ts`: updated assertions from the old symmetric SLAB_EMBED contract to the new asymmetric EMBED / CEILING_GAP contract.
- `wall-slab-embed.test.ts`: new suite verifying world-space Y extents for wall bottom < slab top and wall top == elevation + wallHeight − CEILING_GAP.
- `floor-cutout-inflation.test.ts`: stair cutter is always strictly larger than footprint.
- `wall-corner-geometry.test.ts`: no bounding-box overlaps in L / grid / strip layouts.
- `wall-ownership.test.ts`: 19 new cases for `hasNeighborAtCorner`.

## Capabilities

- **Modified**: `3d-viewer` — Wall geometry now uses an asymmetric span: extends into the floor slab, air gap at the ceiling slab. Eliminates both the floor-seam z-fighting and the orbit-angle shimmer.

## Impact

- **floorplan-3d-core** — `DIMENSIONS.WALL.SLAB_EMBED` renamed to `DIMENSIONS.WALL.EMBED`; new constant `DIMENSIONS.WALL.CEILING_GAP` added. Any external code that referenced `SLAB_EMBED` must update to `EMBED`.
- **floorplan-viewer-core** — `logarithmicDepthBuffer` is now always enabled; camera near plane raised from default to 0.5.
- No DSL syntax changes; no rendering output changes visible to end users at normal camera distances.
