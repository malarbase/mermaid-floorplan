## 1. Geometry Constants

- [x] 1.1 Add `DIMENSIONS.WALL.EMBED = 0.02` to `constants.ts` (replaces `SLAB_EMBED`)
- [x] 1.2 Add `DIMENSIONS.WALL.CEILING_GAP = 0.005` to `constants.ts`
- [x] 1.3 Add `DIMENSIONS.GEOMETRY.EPSILON`, `CUTTER_INFLATE`, `WALL_CORNER_EMBED` to `constants.ts`
- [x] 1.4 Update JSDoc comments on `EMBED` and `CEILING_GAP` to explain the asymmetric strategy

## 2. Wall Geometry — Asymmetric Span

- [x] 2.1 Update `createWallSegmentGeometry` to use `wallHeight + EMBED − CEILING_GAP` height (was `wallHeight + 2 * EMBED`)
- [x] 2.2 Compute `wallCenterY = elevation + wallHeight/2 − EMBED/2 − CEILING_GAP/2` in `generateWallWithCSG`
- [x] 2.3 Replace `elevation + wallHeight / 2` with `wallCenterY` in CSG segment brush position
- [x] 2.4 Compute matching `wallCenterY` in `generateSimpleWall`
- [x] 2.5 Replace `elevation + wallHeight / 2` with `wallCenterY` in simple-wall mesh position
- [x] 2.6 Add wall corner tightening via `hasNeighborAtCorner` in `wall-ownership.ts`
- [x] 2.7 Apply `WALL_CORNER_EMBED` to vertical wall ends inside horizontal walls

## 3. Floor Cutter Inflation

- [x] 3.1 Inflate stair CSG cutters by `CUTTER_INFLATE` in `floor-geometry.ts`
- [x] 3.2 Inflate lift CSG cutters by `CUTTER_INFLATE` in `floor-geometry.ts`
- [x] 3.3 Add `floorGroup.updateMatrixWorld(true)` before bounding-box computation for lift penetrations in `scene-builder.ts`

## 4. Renderer Improvements

- [x] 4.1 Enable `logarithmicDepthBuffer` on `WebGLRenderer` in `base-viewer.ts`
- [x] 4.2 Tighten camera near/far to `0.5 / 500` in `base-viewer.ts`

## 5. Tests

- [x] 5.1 Update `wall-floor-embed.test.ts` assertions to asymmetric EMBED / CEILING_GAP contract
- [x] 5.2 Add `wall-slab-embed.test.ts` verifying world-space Y extents for both-sided embed
- [x] 5.3 Add `floor-cutout-inflation.test.ts` verifying stair cutter > footprint
- [x] 5.4 Add `wall-corner-geometry.test.ts` for L / grid / strip layout overlap checks
- [x] 5.5 Add `wall-ownership.test.ts` for `hasNeighborAtCorner` (19 cases)
- [x] 5.6 Verify all 257 `floorplan-3d-core` tests pass
- [x] 5.7 Verify all 55 `floorplan-viewer-core` tests pass

## 6. Docs

- [x] 6.1 Add `docs/gaps/3d-wall-network-rebuild.md` architectural gap doc
- [x] 6.2 Add `docs/gaps/archive/3d-wall-zfight-polygon-offset-attempt.md` archiving the failed polygonOffset approach
