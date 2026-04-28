# Tasks — Consolidate Scene-Build Loop into floorplan-3d-core

## 1. Phase 1 — Land viewer cutout fix (no API change, ships independently)

- [x] 1.1 Replace `this.computeStairPenetration(stair, ...)` and `this.computeLiftPenetration(lift)` calls in `floorplan-viewer-core/src/base-viewer.ts:generateFloorWithPenetrations` with a local helper that runs `group.updateMatrixWorld(true); new THREE.Box3().setFromObject(stairOrLiftGroup)` on the just-added stair/lift mesh
- [x] 1.2 Apply the same replacement in `floorplan-viewer-core/src/interactive-editor-core.ts:generateFloorWithPenetrations`
- [x] 1.3 Delete `computeStairPenetration`, `computeCustomStairPenetration`, and `computeLiftPenetration` from `floorplan-viewer-core/src/base-viewer.ts` once the call sites are migrated
- [x] 1.4 Add a viewer-core regression test for the cutout shape: build a fixture with a `straight toward bottom` stair, run `loadFloorplan`, and assert the cutout box on the upper slab matches `Box3.setFromObject(stairGroup)` within float epsilon
- [x] 1.5 Run `npm test --workspace floorplan-viewer` and `npm test --workspace floorplan-viewer-core`
- [ ] 1.6 Visual smoke test: `make viewer-dev`, open `examples/StairConstraints.floorplan` and `examples/ImprovedTriplexVilla.floorplan`, confirm landings stay solid and cutouts match the headless renders previously verified

## 2. Phase 2 — Add hook surface to floorplan-3d-core (additive, non-breaking)

- [x] 2.1 In `floorplan-3d-core/src/types.ts`, define `SceneBuildHooks` with optional `onFloorGroup`, `onRoomMesh`, `onWallMesh`, `onStairMesh`, `onLiftMesh` callback fields (each receives the mesh/group plus the entity reference and owning floor)
- [x] 2.2 Extend `SceneBuildOptions` to extend or include `SceneBuildHooks`
- [x] 2.3 Extend `SceneBuildResult` with `floorGroups: Map<string, THREE.Group>` keyed by `JsonFloor.id`
- [x] 2.4 In `floorplan-3d-core/src/scene-builder.ts:buildFloorplanSceneFromNormalized`, after each floor `group` is created and named, invoke `options.onFloorGroup?.(group, floor)` and add to the `floorGroups` map
- [x] 2.5 In the per-room loop, after `generateFloorSlabs` (or per-room slab) creates the slab mesh, invoke `options.onRoomMesh?.(slabMesh, room, floor)` for each room slab
- [x] 2.6 In `WallBuilder.generateWall` integration in `scene-builder.ts`, route wall meshes through a wrapper that invokes `options.onWallMesh?.(mesh, wall, room, floor)` for every mesh added to `floorGroup` by the wall builder for this `(room, wall)` tuple. Decide aggregation granularity per the open question in `design.md` (start with per-emitted-mesh)
- [x] 2.7 In the stairs loop, after `stairGenerator.generateStair(stair)` and `floorGroup.add(stairGroup)`, invoke `options.onStairMesh?.(stairGroup, stair, floor)`
- [x] 2.8 Same for lifts: `options.onLiftMesh?.(liftGroup, lift, floor)` after add
- [x] 2.9 Update `buildCompleteScene` to pass through `sceneOptions` (including hooks) unchanged to the internal helper, and to surface `floorGroups` in its return value
- [x] 2.10 Add unit tests in `floorplan-3d-core/test/scene-builder.test.ts`: a multi-floor fixture with rooms, walls, one stair, and one lift; assert each callback fires the expected number of times, with the expected entity references; assert `floorGroups` contains exactly one entry per rendered floor
- [x] 2.11 Run `npm test --workspace floorplan-3d-core` and confirm the existing 32 scene-builder tests still pass alongside the new ones

## 3. Phase 3 — Migrate base-viewer.loadFloorplan to delegate via callbacks

- [ ] 3.1 Capture a pre-refactor snapshot: from a stable commit on `main`, run `make viewer-dev` (or a unit-level harness) on a multi-floor fixture, dump `MeshRegistry` contents as `(meshUuid, entityType, entityName, floorId, sourceRange)` rows, save to `floorplan-viewer-core/test/__fixtures__/mesh-registry-snapshot.json`
- [x] 3.2 Rewrite `floorplan-viewer-core/src/base-viewer.ts:loadFloorplan` to (a) call `normalizeToMeters` once, (b) call `buildFloorplanSceneFromNormalized(normalizedData, { theme: this.currentTheme, onFloorGroup, onRoomMesh, onWallMesh, onStairMesh, onLiftMesh })`, (c) iterate `result.floorGroups.values()` and add each per-floor `THREE.Group` to the long-lived `this._scene`, (d) populate `this._floors` and `this.floorHeights` from the `onFloorGroup` callback, (e) trigger annotations / camera framing / theme apply as before. **Important**: must use `buildFloorplanSceneFromNormalized` (not `buildFloorplanScene`) because `normalizeToMeters` is intentionally non-idempotent — calling `buildFloorplanScene` after pre-normalizing causes a second normalization pass that scales DSLs in feet by 1/0.3048 a second time, breaking the render.
- [x] 3.3 Implement each callback as a thin lambda that calls `this._meshRegistry.register(...)` with the entity reference and `entity._sourceRange`, replicating the existing registration semantics exactly
- [ ] 3.4 Re-run the snapshot test from 3.1 against the consolidated path; assert byte-equal output (allowing only `meshUuid` to differ since uuids are non-deterministic — match by structural fields only)
- [x] 3.5 Delete `generateFloorWithPenetrations`, `createFloorMeshWithPenetrations`, and the legacy non-penetration `generateFloor` (if it exists and has no other callers) from `base-viewer.ts`
- [x] 3.6 Delete the surviving analytic helpers if any remained from Phase 1
- [x] 3.7 Run `npm test --workspace floorplan-viewer-core` and `npm test --workspace floorplan-viewer`
- [ ] 3.8 Manual smoke: `make viewer-dev`, exercise selection, hover, theme toggle, exploded view, multi-floor visibility, source-range jump (if exposed in the standalone viewer)

## 4. Phase 4 — Migrate interactive-editor-core to drop its build-loop override

- [x] 4.1 Move the editor's wall-source-range registration from the post-traverse pattern in `interactive-editor-core.ts:generateFloorWithPenetrations` into the editor-side `onWallMesh` callback (which receives `JsonWall` carrying `_sourceRange`)
- [x] 4.2 Remove the `generateFloorWithPenetrations` override from `interactive-editor-core.ts` entirely; the editor inherits `BaseViewer.loadFloorplan` and supplies its registration via callback overrides set up in its constructor or `loadFloorplan` wrapper
- [x] 4.3 Re-run editor unit tests and any selection / source-jump integration tests
- [ ] 4.4 Manual smoke: `make editor-dev`, click rooms / walls / stairs / lifts, confirm DSL source range navigation works for each

## 5. Phase 5 — Delete WallGenerator, consolidate on WallBuilder

- [x] 5.1 `rg "WallGenerator"` across the workspace; confirm no external (non-`floorplan-viewer-core`) imports
- [x] 5.2 Replace each `import { WallGenerator } from '...'` and `new WallGenerator(...)` call site in `floorplan-viewer-core` with `WallBuilder` from `floorplan-3d-core` — all viewer-core call sites already delegated to `buildFloorplanScene` (which internally uses `WallBuilder`); the local `wallGenerator` field and `setTheme` call were dead code, so removed entirely
- [x] 5.3 Verify `WallBuilder` covers every API the viewer consumed (`setStyleResolver`, `setTheme`, `generateWall`); confirmed — `WallBuilder` exposes the same three methods. Viewer-core no longer calls them directly; the scene-builder owns the instance.
- [x] 5.4 Delete `floorplan-viewer-core/src/wall-generator.ts`
- [x] 5.5 Update `floorplan-viewer-core/src/index.ts` (if it re-exports `WallGenerator`) to drop the export — also dropped the redundant `three-bvh-csg` peer/dev dependency from `floorplan-viewer-core/package.json` (it was only consumed by the deleted `WallGenerator`; CSG is still declared as an optional peer of `floorplan-3d-core`)
- [ ] 5.6 `npm test --workspaces` green, then `make viewer-dev` and `make editor-dev` smoke

## 6. Phase 6 — Cleanup, regression sweep, and documentation

- [x] 6.1 `npm run lint --workspaces` clean — workspaces don't expose a `lint` script; ran `npx biome check` on every file touched by this change (all 8 files clean after auto-fixing import order in `stair-cutout-regression.test.ts` and a long-line wrap in `scene-builder.ts`). Pre-existing lint warnings in unrelated files (`csg-manager.ts`, Solid.js UI components) left as-is.
- [x] 6.2 `npm test --workspaces` clean — `floorplan-common`, `floorplan-language`, `floorplan-3d-core` (204 tests), `floorplan-viewer-core` (55 tests), `floorplan-mcp-server` (33 tests including `render3DToPng`), and `floorplan-viewer` all green. Pre-existing failures in `floorplan-app` (`viewer-core.test.tsx` `vscode-languageserver` import error and `convex/explore.test.ts` typeof assertion) are unrelated to scene-build and predate this change.
- [ ] 6.3 Re-render `examples/StairConstraints.floorplan` and `examples/ImprovedTriplexVilla.floorplan` via `make export-3d-perspective` and verify PNG outputs match the reference renders verified during the original cutout-fix work
- [ ] 6.4 Open both files in `make viewer-dev` and visually compare with the headless renders — cutouts SHALL match
- [ ] 6.4a Run `floorplan-app` (`npm run dev --workspace floorplan-app`), open the same fixtures in both read-only viewer mode (`FloorplanAppCore`) and edit mode (`InteractiveEditorCore`), confirm the stair cutouts match the headless renders and that selection / save / load / theme toggle still work
- [ ] 6.4b Run `npm test --workspace floorplan-app` (vitest) and the Playwright E2E suite if present, to catch any selection / loadFloorplan regressions reaching the app layer
- [x] 6.5 Update `README.md` of `floorplan-3d-core` to document the `SceneBuildHooks` callback surface and the `floorGroups` field on `SceneBuildResult`
- [x] 6.6 Update `docs/agent-skill.md` (or equivalent architecture doc) to describe the single scene-build pipeline and call out that `floorplan-viewer-core` no longer maintains its own copy — chose `docs/context/viewer-core.md` (the canonical viewer-core architecture doc); `docs/agent-skill.md` is scoped to DSL CLI scripts, not the 3D pipeline.
- [x] 6.7 Archive `docs/gaps/3d-stair-floor-holes.md` (move to `docs/gaps/archive/`) since the gap is closed in both the headless and interactive paths — moved, added "Resolved" header pointing at `consolidate-scene-build-into-core`, and updated `docs/gaps/README.md` index.
- [x] 6.8 Run `openspec validate consolidate-scene-build-into-core` and ensure all artifacts pass schema checks before requesting review
- [x] 6.9 Regression: pin the unit-normalization invariant. `floorplan-3d-core/test/scene-builder.test.ts` now contains a `unit normalization at the scene-build entry points` block that (a) builds a feet-based fixture and asserts the room-slab mesh is exactly `10 ft × 0.3048 m` wide, (b) confirms `buildFloorplanSceneFromNormalized` produces the same dimensions as `buildFloorplanScene(rawData)`, (c) explicitly pins the bug shape — `buildFloorplanScene(normalizeToMeters(data))` scales by an extra factor of 0.3048 — so any future contributor who wires the viewer back into `buildFloorplanScene` while still pre-normalizing will trip a failing test instead of shipping a broken render.
