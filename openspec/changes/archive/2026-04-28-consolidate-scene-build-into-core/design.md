# Design — Consolidate Scene-Build Loop into floorplan-3d-core

## Context

The repository has two parallel 3D rendering pipelines:

- **Headless** (`floorplan-3d-core/src/scene-builder.ts:buildFloorplanScene`) — used by `floorplan-mcp-server`'s puppeteer renderer, the `scripts/generate-3d-images.ts` CLI, and any future export tools. Fire-and-forget: data → `THREE.Scene` → render to PNG/buffer.
- **Interactive** (`floorplan-viewer-core/src/base-viewer.ts:generateFloorWithPenetrations`, overridden in `interactive-editor-core.ts`) — used by `make viewer-dev` and the editor app. Long-lived scene with selection, hover, source-range jump, theme runtime swap, exploded view, annotations.

Both paths sit on the same lower-level primitives (`StairGenerator`, `analyzeWallOwnership`, `findMatchingConnections`, `generateConnection`, `MaterialFactory`, `getCSG`, `Box3` arithmetic) but each re-implements the orchestration loop on top of them. The duplication has produced a recent stair-cutout bug: a localization fix in the headless path (mesh-derived `Box3.setFromObject(stairGroup)`) was not mirrored into the viewer's analytic `computeStairPenetration`, so `make viewer-dev` still over-cuts straight-toward-bottom stairs by one stair-width.

The viewer reimplemented the loop because it needs to record `mesh ↔ entity` mappings (and DSL `_sourceRange`) in `MeshRegistry` *as meshes are created*, and the headless `buildFloorplanScene` currently exposes no hooks for that. Once those hooks exist, the viewer can collapse to a single `buildFloorplanScene` call and the duplication can be deleted.

Stakeholders:

- Authors of `floorplan-3d-core` — gain a small, well-defined hook surface; existing callers unaffected.
- Authors of `floorplan-viewer-core` and `floorplan-editor` — lose ~1000 lines of duplicated geometry code; gain automatic propagation of any future scene-builder fix.
- MCP / Puppeteer consumers — no observable change.
- Users of `make viewer-dev` — observable cutout fix as a side effect.
- Users of `floorplan-app` (SolidStart) — observable cutout fix in both read-only viewer mode (`FloorplanAppCore`) and edit mode (`InteractiveEditorCore`); no app-level code changes required.

## Goals / Non-Goals

**Goals:**

- Make `floorplan-3d-core/src/scene-builder.ts` the single source of truth for the floor/room/wall/stair/lift build loop and for stair-cutout localization.
- Expose just enough API on `floorplan-3d-core` (optional callbacks + per-floor group access) for the interactive viewer to record mesh↔entity mappings without owning the build loop.
- Delete `floorplan-viewer-core`'s duplicate orchestration (`generateFloorWithPenetrations`, `createFloorMeshWithPenetrations`, `computeStairPenetration` and its custom variant, `computeLiftPenetration`, the `WallGenerator` class).
- Land the viewer's stair-cutout localization fix as a fall-out of the consolidation, so `make viewer-dev` matches `make export-3d-perspective`.
- Preserve viewer interactivity exactly (selection, hover, source-range jump, exploded view, theme swap, annotations).

**Non-Goals:**

- Any new product capability. No new DSL constructs, no new render options users can pass.
- Reworking `MeshRegistry`, `AnnotationManager`, `KeyboardControls`, `OrbitControls`, `CameraManager`, `FloorManager`, theme-swap logic, or the editor's selection model. These stay in `floorplan-viewer-core`.
- Headless renderer behaviour changes. The MCP/Puppeteer pipeline is purely a beneficiary; this proposal does not alter its outputs.
- Renaming or restructuring `floorplan-3d-core`'s package boundary or build outputs.

## Decisions

### D1 — Hook surface: callbacks on `SceneBuildOptions`, not subclassing or events

`floorplan-3d-core` exposes mesh-creation hooks as **optional callbacks** on the existing `SceneBuildOptions` interface, fired synchronously during the build loop. Concretely:

```typescript
// floorplan-3d-core/src/types.ts (additive)
export interface SceneBuildHooks {
  onFloorGroup?: (group: THREE.Group, floor: JsonFloor) => void;
  onRoomMesh?:   (mesh: THREE.Mesh, room: JsonRoom, floor: JsonFloor) => void;
  onWallMesh?:   (mesh: THREE.Mesh, wall: JsonWall, room: JsonRoom, floor: JsonFloor) => void;
  onStairMesh?:  (group: THREE.Group, stair: JsonStair, floor: JsonFloor) => void;
  onLiftMesh?:   (group: THREE.Group, lift:  JsonLift,  floor: JsonFloor) => void;
}

export interface SceneBuildOptions extends SceneBuildHooks {
  // ...existing options unchanged...
}

export interface SceneBuildResult {
  // ...existing fields unchanged...
  floorGroups: Map<string, THREE.Group>;
}
```

**Rationale.** Synchronous callbacks are the lowest-friction way to let a caller observe creation without owning the loop. The viewer's `MeshRegistry` registers in O(1) per call; no async coordination is needed, and there's no risk of the registry seeing a partially-constructed scene. Adding to the existing `SceneBuildOptions` keeps the surface flat.

**Alternatives considered.**

- *Inheritance / template method.* Make `buildFloorplanScene` a protected method on a class the viewer subclasses. Rejected: `floorplan-3d-core` is presently functional and pure; introducing a class hierarchy would couple package shape to one consumer's needs. It also doesn't compose well with the headless pipeline that wants no class to instantiate.
- *EventEmitter / observable.* A `SceneBuildEmitter` exposing `'roomMesh' | 'wallMesh' | …` events. Rejected: heavier, requires a typed event surface, and introduces an object lifetime to manage. Callbacks on options give the same observability with less ceremony.
- *Post-hoc traversal.* Have the viewer call `buildFloorplanScene`, then walk `result.scene` with `traverse` and reconstruct entity attribution from mesh names. Rejected: this is the trick `interactive-editor-core` already uses for walls (see `wallMeshesBefore` snapshot, then post-traverse) and it's exactly the brittleness we want to remove. It re-derives entity identity from a stringly-typed mesh name and is fragile to future material/geometry changes.

### D2 — Stair/lift cutter box is mesh-derived, period

After this change, the only way the cutter box for floor-slab CSG is computed is `floorGroup.updateMatrixWorld(true); new THREE.Box3().setFromObject(stairGroup)`. This is what the headless path already does and what the viewer is migrating to. The analytic `computeStairPenetration` family is deleted, not deprecated.

**Rationale.** The mesh is the ground truth for "what the stair occupies in space". Any future stair-geometry refinement (new shapes, rotation conventions, segmented landings) is automatically picked up. Deprecation rather than deletion would leave a tempting fast path that drifts; better to make the mesh-derived approach the only path.

**Alternative considered:** keep `computeStairPenetration` as a "hint" to size the cutter pre-render. Rejected: it's the very thing that drifted from reality and caused the bug.

### D3 — `WallBuilder` (core) replaces `WallGenerator` (viewer-core), not the other way around

`floorplan-viewer-core/src/wall-generator.ts:WallGenerator` and `floorplan-3d-core/src/wall-builder.ts:WallBuilder` have identical method signatures and import the same primitives. We delete the viewer's `WallGenerator` and switch all viewer call sites to `WallBuilder`.

**Rationale.** `WallBuilder` lives in the package that already owns the headless build loop and is exercised by the headless tests; consolidating into the package that's already the source of truth maintains one direction of dependency (`floorplan-viewer-core → floorplan-3d-core`). The viewer's selection-aware wall registration is handled by the new `onWallMesh` callback, not by subclassing the wall builder.

### D4 — Floor-slab CSG cutting stays in `floorplan-3d-core`

`createFloorMeshWithPenetrations` in the viewer is deleted; all slab CSG is handled by `floorplan-3d-core/src/floor-geometry.ts:generateRoomFloorSlabWithCSG`, which the core scene-builder already calls.

**Rationale.** Same reasoning as D3 — single source of truth, single test surface. The viewer never needed to do slab CSG itself; it only did because it owned the whole build loop.

### D5 — Build loop stays a function, not a class

We do *not* convert `buildFloorplanScene` into a class with a `protected` template method. The hook surface is purely optional callbacks on options. The viewer wraps the call:

```typescript
loadFloorplan(data: JsonExport): void {
  const result = buildFloorplanScene(data, {
    theme: this.currentTheme,
    onFloorGroup: (group, floor) => {
      this._floors.push(group);
      this.floorHeights.push(floor.height ?? this.config.default_height ?? DIMENSIONS.WALL.HEIGHT);
    },
    onRoomMesh: (mesh, room, floor) => this._meshRegistry.register(mesh, 'room', room.name, floor.id, room._sourceRange),
    onWallMesh: (mesh, wall, room, floor) => this._meshRegistry.register(mesh, 'wall', `${room.name}_${wall.direction}`, floor.id, wall._sourceRange),
    onStairMesh: (group, stair, floor) => this._meshRegistry.register(group, 'stair', stair.label ?? 'stair', floor.id, stair._sourceRange),
    onLiftMesh:  (group, lift, floor)  => this._meshRegistry.register(group, 'lift',  lift.label  ?? 'lift',  floor.id, lift._sourceRange),
  });
  this._scene.add(result.scene);
  this.setExplodedView(this.explodedViewFactor);
  // ...annotations, theme apply, camera framing...
}
```

This keeps `floorplan-3d-core` purely functional and composable; consumers attach behaviour via lambdas without inheritance.

### D6 — `_sourceRange` field on JSON entities is the carrier for editor source-range tracking

`JsonRoom`, `JsonWall`, `JsonStair`, `JsonLift` already optionally carry `_sourceRange` (used by the editor today). The callback signatures pass the entity itself, so the viewer's registration code reads `entity._sourceRange` exactly as it does pre-refactor. No new types needed.

### D7 — `floorGroups: Map<string, THREE.Group>` keyed by floor id, not index

Returned alongside the existing `scene` and `floorsRendered`. Keying by `id` is stable across renders even when `floorIndices` filters are applied; the viewer's exploded-view animation iterates `floorGroups.values()` rather than walking `result.scene.children`.

**Rationale.** Avoids `result.scene.children[i]` indexing which is fragile to lights / decorations / future scene additions.

## Risks / Trade-offs

**[Risk]** Viewer mesh-registry semantics drift during refactor. → Mitigation: in Phase 3, write a one-shot snapshot test that records `(meshId, entityType, entityName, floorId, sourceRange)` for every mesh registered for a fixture floorplan, run it on the pre-refactor `main` branch, then assert byte-equal output on the consolidated path before deleting the legacy code.

**[Risk]** Wall callback firing at the wrong granularity. `WallBuilder.generateWall` may emit multiple meshes (segments per shared wall, plus door/window cutouts). → Mitigation: the `onWallMesh` callback fires per mesh added to the floor group with the originating `JsonWall` reference, mirroring how the viewer's current post-traverse already aggregates per-wall meshes. Snapshot test (above) covers this.

**[Risk]** Performance regression from callback dispatch in hot scene-build path. → Mitigation: callbacks are typed as `?:` and the build loop checks for `undefined` once per entity type per floor; in the headless path (no callbacks) the cost is a handful of property reads. Benchmark unaffected.

**[Risk]** Stair cutout shape changes for users today relying on the over-cut behaviour (e.g. expecting the boarding strip to be cut out). → Mitigation: this is documented as an intended fix in `docs/gaps/3d-stair-floor-holes.md`, and the headless renderer (MCP, exports) has already been on the corrected behaviour for the past iteration. The viewer is being aligned, not regressed.

**[Risk]** `WallGenerator` deletion breaks an external consumer. → Mitigation: ripgrep across the workspace before deletion to confirm zero external imports; if any are found, redirect them to `WallBuilder` from `floorplan-3d-core` (drop-in replacement, identical signature).

**[Trade-off]** Hooks couple `floorplan-3d-core`'s public surface to the viewer's needs. → Accepted: the surface is small (5 optional callbacks), purely additive, and the alternative is the duplication we're paying for today. Hooks are also useful to other future consumers (e.g. an SVG-overlay tool that needs to know which mesh corresponds to which DSL entity).

**[Trade-off]** Breaking the viewer's "subclass-friendly" `generateFloorWithPenetrations` extension point. The `interactive-editor-core` currently overrides it. → Accepted: the override existed only to inline mesh-registration; with callbacks the editor wraps `loadFloorplan` instead and the override goes away. Any future "I want a different floor build" use case is better served by composing callbacks than by subclassing.

## Migration Plan

Phased to keep `main` shippable at every step.

1. **Phase 1 — Land the viewer cutout fix in isolation** (small, low-risk, ships independently). Replace the analytic `this.computeStairPenetration(...)` and `this.computeLiftPenetration(...)` calls in `base-viewer.ts:generateFloorWithPenetrations` and `interactive-editor-core.ts:generateFloorWithPenetrations` with `Box3.setFromObject(stairGroup|liftGroup)` after `group.updateMatrixWorld(true)`. Delete the now-unused `compute*Penetration` methods. ~40 lines net deletion. No API change. Snapshot tests for cutout shape.

2. **Phase 2 — Add hook surface to `floorplan-3d-core`** (additive, non-breaking). Extend `SceneBuildOptions` with the five `on*Mesh|FloorGroup` callbacks. Extend `SceneBuildResult` with `floorGroups: Map<string, THREE.Group>`. Wire callback invocations and group tracking into `buildFloorplanSceneFromNormalized`. Add tests asserting callback invocation counts and `floorGroups` contents on a multi-floor fixture. Headless renderer continues to work unchanged.

3. **Phase 3 — Migrate `loadFloorplan`** in `base-viewer.ts` to delegate to `buildFloorplanScene` via callbacks. Pre-refactor: capture mesh-registry snapshot for the fixture used by the editor's selection tests. Post-refactor: assert identical snapshot. Once green, delete `generateFloorWithPenetrations`, `createFloorMeshWithPenetrations`, the legacy `generateFloor`, and the surviving `compute*Penetration` helpers.

4. **Phase 4 — Migrate `interactive-editor-core.ts`**. Remove the `generateFloorWithPenetrations` override; rely on the same callback-driven `loadFloorplan`. Wall-source-range registration moves into the `onWallMesh` callback (which already receives the `JsonWall` carrying `_sourceRange`). Editor selection / source-jump E2E tests must pass.

5. **Phase 5 — Delete `WallGenerator`**. Confirm no external imports; redirect viewer call sites to import `WallBuilder` from `floorplan-3d-core`. Remove `floorplan-viewer-core/src/wall-generator.ts`. Update viewer-core's index re-exports if any.

6. **Phase 6 — Cleanup pass**. Remove now-dead imports, run `npm run lint --workspaces`, `npm test --workspaces`, `make viewer-dev` smoke check, `make export-3d-perspective` smoke check on `examples/ImprovedTriplexVilla.floorplan` and `examples/StairConstraints.floorplan`, compare PNG outputs visually with the cutout fixture.

**Rollback strategy.** Each phase is independently reversible via `git revert`. Phases 1, 2, and 5 are mechanically isolated; Phase 3+4 share a refactor and would be reverted together. No data migrations or runtime feature flags are needed because behaviour is preserved.

## Open Questions

- Should `onWallMesh` fire once per `JsonWall` (aggregated, post-segmentation) or once per emitted segment mesh? Current preference: once per emitted mesh, with the `JsonWall` reference attached, because the registry needs each mesh independently. Decided in implementation if the snapshot test reveals a mismatch.
- Does any consumer depend on `JsonExport.connections[]` ordering being preserved through the build loop? The hooks don't constrain order, but if the editor's wall selection visually depends on it, we'll keep insertion order in `onWallMesh`.
- Should `floorGroups` also expose lights or just floor `THREE.Group`s? Initial scope: just the per-floor groups. Lights live on the scene root, owned by `setupLighting`.
