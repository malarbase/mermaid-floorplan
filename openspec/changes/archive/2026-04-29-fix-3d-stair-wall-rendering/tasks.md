## 1. Sawtooth Stair Geometry

- [x] 1.1 Add `SOFFIT_THICKNESS` constant (150 mm) to `stair-geometry.ts`
- [x] 1.2 Implement `buildSawtoothFlight()` helper that emits an `ExtrudeGeometry` concrete-slab cross-section with sloped soffit
- [x] 1.3 Replace per-step `BoxGeometry` tread/riser meshes with single `ExtrudeGeometry` sawtooth flight for closed-stringer stairs
- [x] 1.4 Retain per-step meshes for open and glass stringer types
- [x] 1.5 Add `stair-sawtooth.test.ts` with unit tests for the sawtooth extrusion path

## 2. T-Junction Wall Fix

- [x] 2.1 Create `floorplan-3d-core/src/wall-ownership.ts` with `hasContinuousWallAt()` helper to detect shared vertical boundaries between rooms
- [x] 2.2 Wire `hasContinuousWallAt()` into `adjustSegmentsForCorners` in `wall-builder.ts` to suppress horizontal segment extension at T-joints

## 3. Door CSG Hole Fix

- [x] 3.1 Import `calculatePositionWithFallback` and `type RoomBounds` from `floorplan-common` in `wall-builder.ts`
- [x] 3.2 Look up `targetRoom` from `allRooms` using `connection.toRoom` in `createConnectionHole`
- [x] 3.3 Build `sourceBounds` and `targetBounds` as `RoomBounds` objects (mapping `room.z` → `y`)
- [x] 3.4 Replace raw `sourceRoom.height * ratio` / `sourceRoom.width * ratio` lines with `calculatePositionWithFallback(sourceBounds, targetBounds, isVertical, percentage)` calls

## 4. Merged Room Labels

- [x] 4.1 Replace separate `roomNameLabels` / `areaLabels` arrays with a single `CSS2DObject` per room in `annotation-manager.ts`
- [x] 4.2 Use `.room-label__name` and `.room-label__area` child elements for independent visibility toggling
- [x] 4.3 Add `updateRoomLabels()` method and update callers
- [x] 4.4 Add CSS rules for `.room-label__name` and `.room-label__area` in `shared-styles.css` and `styles.ts`

## 5. Stair Info Annotations

- [x] 5.1 Implement `updateStairInfoAnnotations()` in `annotation-manager.ts` rendering per-stair CSS2DObject with name, step count, and rise in a three-line `.stair-info-label` layout
- [x] 5.2 Add `showStairInfo` state flag and dispose cleanup
- [x] 5.3 Add `.stair-info-label__name` / `__detail` CSS sub-classes in `shared-styles.css` and `styles.ts`
- [x] 5.4 Wire "Show Stair Info" checkbox into `annotation-controls-ui.ts` (vanilla-JS UI)
- [x] 5.5 Wire into `floorplan-app` `ControlPanels.tsx` (SolidJS)
- [x] 5.6 Wire into `floorplan-viewer-core` Solid `ControlPanels.tsx`
- [x] 5.7 Wire into `floorplan-viewer/src/main.ts`

## 6. Stair Dimension Annotations

- [x] 6.1 Implement `updateStairDimensionAnnotations()` in `annotation-manager.ts` rendering per-stair `w × d` CSS2DObject overlay
- [x] 6.2 Add `showStairDimensions` state flag and dispose cleanup
- [x] 6.3 Add `.stair-info-label__extras` CSS sub-row class in `shared-styles.css` and `styles.ts`
- [x] 6.4 Polish `.stair-info-label` styles: larger padding, min-width, box-shadow
- [x] 6.5 Wire "Show Stair Dimensions" checkbox into `annotation-controls-ui.ts`
- [x] 6.6 Wire into `floorplan-app` `ControlPanels.tsx` (SolidJS)
- [x] 6.7 Wire into `floorplan-viewer-core` Solid `ControlPanels.tsx`
- [x] 6.8 Wire into `floorplan-viewer/src/main.ts`
- [x] 6.9 Wire into `floorplan-viewer-core/src/floorplan-app-core.ts`

## 7. Sample File and Docs

- [x] 7.1 Add `ImprovedTriplexVilla.floorplan` sample file to repo root
- [x] 7.2 Register `language-primitive-registry-codegen` gap doc in `docs/gaps/README.md`
- [x] 7.3 Add `docs/gaps/language-primitive-registry-codegen.md` gap document

## 8. Type Fixes (floorplan-app)

- [x] 8.1 Add `"skipLibCheck": true` to `floorplan-app/tsconfig.json`
- [x] 8.2 Correct `Id<'users'>` casts and JSX expression in `floorplan-app/src/routes/admin/users.tsx`
