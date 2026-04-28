# Consolidate Scene-Build Loop into floorplan-3d-core

## Why

`floorplan-3d-core` and `floorplan-viewer-core` currently maintain two parallel implementations of the same scene-build orchestration loop. The two paths sit on the same low-level primitives (`StairGenerator`, wall-ownership analysis, connection geometry, materials, CSG manager) but each re-implements:

- the per-floor "for room → for wall → for stair/lift" build loop;
- the wall builder (`WallBuilder` in core vs `WallGenerator` in viewer-core, with identical method signatures);
- the floor-slab CSG hole-cutting (`generateRoomFloorSlabWithCSG` in core vs `createFloorMeshWithPenetrations` in viewer-core);
- the stair/lift cutter-box computation (mesh-derived `Box3.setFromObject` in core vs analytic `computeStairPenetration` / `computeCustomStairPenetration` / `computeLiftPenetration` in viewer-core).

This duplication has already caused at least one user-visible bug: a fix to stair-cutout localization landed in the core scene-builder (used by MCP, Puppeteer, export scripts) but did not propagate to the viewer because the viewer's analytic cutter-box logic never invokes the rendered mesh. The two paths can — and will — drift again on the next stair/wall/floor change.

The duplication exists for a single legitimate reason: the interactive viewer needs to record a `mesh ↔ entity` mapping in its `MeshRegistry` *as meshes are created*, plus track DSL `_sourceRange` for click-to-jump-to-source. The core's `buildFloorplanScene` doesn't currently expose any hooks for that, so the viewer reimplemented the loop with inlined registry calls. Once the core exposes a small set of mesh-creation callbacks, the viewer can delegate the entire scene-build loop and the duplication evaporates.

## What Changes

### `floorplan-3d-core` (new hook surface)
- **NEW**: Optional `onRoomMesh`, `onWallMesh`, `onStairMesh`, `onLiftMesh`, `onFloorGroup` callbacks on `SceneBuildOptions`. Each fires once per mesh/group with the entity it represents and the owning floor, so consumers can register meshes against entities without owning the build loop.
- **NEW**: `floorGroups: Map<string, THREE.Group>` field on `SceneBuildResult`, keyed by `JsonFloor.id`, so callers can manipulate individual floor groups (e.g. exploded view, per-floor visibility).
- **MODIFIED**: `scene-builder.ts:buildFloorplanScene` and `buildFloorplanSceneFromNormalized` invoke the callbacks during their existing build loop and populate `floorGroups`. No behavioural change to scenes that don't pass callbacks.

### `floorplan-viewer-core` (deletion + delegation)
- **MODIFIED**: `base-viewer.ts:loadFloorplan` replaces its inline floor/room/wall/stair build loop with a single `buildFloorplanScene(...)` call wired to the new callbacks. Mesh-registry registration moves into the callbacks.
- **REMOVED**: `base-viewer.ts:generateFloorWithPenetrations`, `createFloorMeshWithPenetrations`, `computeStairPenetration`, `computeCustomStairPenetration`, `computeLiftPenetration`, plus the legacy non-penetration `generateFloor` helper if it has no other callers.
- **REMOVED**: `interactive-editor-core.ts:generateFloorWithPenetrations` override — the same callback hooks suffice for the wall-source-range registration the override existed to add.
- **REMOVED**: `floorplan-viewer-core/src/wall-generator.ts:WallGenerator` — collapses into core's `WallBuilder`. Imports updated, then the file deleted.

### Behavioural fix that falls out
- The viewer's stair/lift floor cutout becomes mesh-derived (via `Box3.setFromObject`) instead of analytic, matching the MCP/Puppeteer path. This fixes the over-cut on `straight + climbDirection 'bottom'` stairs (cutout currently extends one stair-width past the run entry into the boarding strip). After this change, the cutout matches the actual stair footprint in **every** consumer that mounts the viewer-core classes — `floorplan-viewer` (`make viewer-dev`), `floorplan-editor` (`make editor-dev`), and the SolidStart `floorplan-app` (read-only `FloorplanAppCore` and editing `InteractiveEditorCore` paths). All three subclass `BaseViewer` without overriding `loadFloorplan` or `generateFloorWithPenetrations`, so the fix propagates automatically.

### Non-changes
- No new user-facing capabilities. Public APIs of `floorplan-3d-core` only grow (callbacks are optional). `floorplan-viewer-core`'s public API is unchanged. End-user behaviour of `make viewer-dev`, `make export-3d-*`, `floorplan-app`, MCP, and the editor stays the same except for the cutout correction above.

## Capabilities

### New Capabilities
None. This is a structural consolidation; no new product surface.

### Modified Capabilities
- `3d-viewer`: clarify that the floor cutout for a stair/lift is localized to the actual stair/lift footprint (not the container room or its landings), and that the viewer and the headless renderer SHALL produce the same cutout shape for the same input.
- `interactive-editor`: same requirement, since the editor inherits the viewer's scene-build path.

## Impact

### Affected code
- `floorplan-3d-core/src/scene-builder.ts` — adds optional callbacks and per-floor group tracking.
- `floorplan-3d-core/src/types.ts` — extends `SceneBuildOptions` and `SceneBuildResult` (additive).
- `floorplan-3d-core/src/index.ts` — re-exports unchanged; no new surface.
- `floorplan-viewer-core/src/base-viewer.ts` — `loadFloorplan` rewired to delegate; ~280 lines of analytic stair-bbox and ~70 lines of slab-CSG code deleted.
- `floorplan-viewer-core/src/interactive-editor-core.ts` — `generateFloorWithPenetrations` override removed (~120 lines).
- `floorplan-viewer-core/src/wall-generator.ts` — file removed; consumers updated to use core's `WallBuilder`.
- `floorplan-viewer-core/src/index.ts` — drop `WallGenerator` export if any.
- `floorplan-mcp-server`, `scripts/generate-3d-images.ts` — no source changes; benefit indirectly from any future scene-builder fix automatically reaching the viewer.
- `floorplan-app` (SolidStart application) — no source changes. Imports `FloorplanAppCore` and `InteractiveEditorCore` from `floorplan-viewer-core`; both extend `BaseViewer` without overriding `loadFloorplan`, so they inherit the consolidated build path and the cutout fix automatically. The app's existing `three-bvh-csg` and `three-mesh-bvh` direct dependencies remain (they stay loaded as ambient browser globals for the CSG manager).

### Affected APIs
- `floorplan-3d-core` `SceneBuildOptions` and `SceneBuildResult` gain optional members. Existing call sites compile and run unchanged.
- `floorplan-viewer-core` does not export `WallGenerator` publicly today (internal class) — removal is non-breaking. If any external import is found during implementation, it will be redirected to `WallBuilder` from core.

### Tests
- `floorplan-3d-core/test/scene-builder.test.ts` gains coverage for callback invocation (each callback fires once per entity, with correct floor/entity references) and for `floorGroups` population.
- `floorplan-viewer-core` viewer tests are re-pointed at the consolidated path; existing assertions about scene composition should still pass.
- A regression test asserts the viewer's stair cutout for a `straight toward bottom` stair matches the mesh footprint (no over-cut into the boarding strip).

### Risk
- Medium. The viewer's `loadFloorplan` is on the hot path for every preview reload; mesh-registry semantics must be preserved exactly to keep selection / hover / source-range jump working in the editor. Mitigated by writing the callback-based replacement first, asserting registry contents are identical to the pre-refactor build, then deleting the dead code.
- Low for the headless pipeline — callbacks are additive and ignored when not provided.

### Breaking changes
None at the public API surface. `WallGenerator` was an internal viewer-core class.
