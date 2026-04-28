## 1. Tag Scene Geometry (`floorplan-3d-core`)

- [x] 1.1 Stamp `userData.layer = 'floor'` on the floor-slabs group in `scene-builder.ts`
- [x] 1.2 Wrap wall meshes in a `walls_<floorId>` group tagged `userData.layer = 'wall'`
- [x] 1.3 Create a sibling `connections_<floorId>` group tagged `userData.layer = 'connection'`
- [x] 1.4 Add optional `connectionsGroup` parameter to `WallBuilder.generateWall` so
       door/window meshes go to the connections group instead of the wall group
- [x] 1.5 Stamp `userData.layer = 'stair'` on stair groups
- [x] 1.6 Stamp `userData.layer = 'lift'` on lift groups
- [x] 1.7 Tag standalone connections group (`showConnections && !showWalls` path) with
       `userData.layer = 'connection'`

## 2. LayerVisibilityManager (`floorplan-viewer-core`)

- [x] 2.1 Create `floorplan-viewer-core/src/layer-visibility-manager.ts`
- [x] 2.2 Implement `initLayerVisibility(floors)` — re-applies desired state to new meshes
- [x] 2.3 Implement `setLayerVisible(layer, visible)` — updates desired map and walks floors
- [x] 2.4 Implement `isLayerVisible(layer)` — read desired state
- [x] 2.5 Implement `applyToFloor(floorGroup)` — public, for `onFloorShown` callback
- [x] 2.6 Desired visibility persists across `loadFloorplan` calls (no reset on reload)

## 3. Wire into BaseViewer and FloorManager

- [x] 3.1 Add `_layerVisibilityManager: LayerVisibilityManager` to `BaseViewer`
- [x] 3.2 Add public `layerVisibilityManager` getter
- [x] 3.3 Initialize before `_floorManager` in constructor
- [x] 3.4 Call `initLayerVisibility(this._floors)` after `initFloorVisibility()` in `loadFloorplan`
- [x] 3.5 Add `onFloorShown` callback to `FloorManagerCallbacks`
- [x] 3.6 Call `onFloorShown(floorGroup)` in `FloorManager.setFloorVisible` when floor becomes visible
- [x] 3.7 Wire `onFloorShown` in `BaseViewer` to call `layerVisibilityManager.applyToFloor`

## 4. Layer Controls UI Component

- [x] 4.1 Create `floorplan-viewer-core/src/ui/layer-controls-ui.ts`
- [x] 4.2 Export `createLayerControlsUI` with 5 checkboxes (Floors / Walls / Doors & Windows / Stairs / Lifts)
- [x] 4.3 Export `LayerControlsUI`, `LayerControlsUIOptions`, `LAYER_ENTRIES` from ui/index.ts
- [x] 4.4 Export `LayerVisibilityManager` and `Layer` type from viewer-core index.ts

## 5. UI Surfaces

- [x] 5.1 Add Layers block to `floorplan-viewer/src/main.ts` View section
- [x] 5.2 Add Layers block to `floorplan-app/src/components/viewer/ControlPanels.tsx` View section
- [x] 5.3 Add Layers HTML checkboxes to `floorplan-editor/index.html` View section
- [x] 5.4 Wire layer checkboxes in `floorplan-editor/src/main.ts`

## 6. CLI

- [x] 6.1 Add `showLifts` to `Options` interface in `scripts/generate-3d-images.ts`
- [x] 6.2 Parse `--no-lifts` flag
- [x] 6.3 Pass `showLifts` to both `render3DToPng` calls
- [x] 6.4 Document all five `--no-*` flags in usage comment
