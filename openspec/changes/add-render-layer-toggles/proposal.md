## Why

Users had no UI way to toggle individual render layers (walls, floors, stairs, lifts,
doors & windows) in the 3D viewer. The only "see-through" affordance was per-floor
visibility (Floors panel) and the Exploded View slider — neither of which let users
inspect interior structure, verify slab cutouts, or produce screenshots with specific
elements hidden.

The headless renderer already supported these flags via `SceneBuildOptions.showWalls` /
`showFloors` / etc., and `make export-3d*` CLI had partial flag support. The gap was
purely a UI surface.

## What Changed

- **Stamped `userData.layer` on all scene geometry** in `floorplan-3d-core/src/scene-builder.ts`:
  - Floor slabs group → `'floor'`
  - Wall segments wrapped in a `walls_<floorId>` group → `'wall'`
  - Door/window meshes routed to a sibling `connections_<floorId>` group → `'connection'`
  - Stair groups → `'stair'`; lift groups → `'lift'`
- **`WallBuilder.generateWall`** gained an optional `connectionsGroup` parameter so
  connection geometry (door frames, window glass) lands in its own layer-tagged group
  rather than being mixed into the wall group.
- **New `LayerVisibilityManager`** in `floorplan-viewer-core` (mirrors `FloorManager`):
  - Persists desired visibility across `loadFloorplan` calls (toggles survive file reloads).
  - `initLayerVisibility` re-applies state to freshly built meshes.
  - `applyToFloor` is public so `FloorManager.onFloorShown` can re-apply layer state
    explicitly after a floor is un-hidden.
- **New `createLayerControlsUI`** utility in `floorplan-viewer-core/src/ui/` returns a
  five-checkbox "Layers" block reusable across all surfaces.
- **BaseViewer** gained `layerVisibilityManager` as a public property initialized before
  `floorManager`; `FloorManager` gained `onFloorShown` callback.
- **UI surfaces** — all three interactive apps received a Layers block inside their
  existing View section:
  - `floorplan-viewer/src/main.ts` — appended after Exploded View slider
  - `floorplan-app/src/components/viewer/ControlPanels.tsx` — same
  - `floorplan-editor/index.html` + `main.ts` — HTML checkboxes + `getElementById` wiring
- **CLI** (`scripts/generate-3d-images.ts`) — added missing `--no-lifts` flag; documented
  all five `--no-*` flags in the usage comment.
