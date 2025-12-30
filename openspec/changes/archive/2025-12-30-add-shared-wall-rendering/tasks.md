# Tasks: Add Shared Wall Rendering

## 1. Wall Ownership Detection

- [x] 1.1 Create `viewer/src/wall-ownership.ts` with adjacency detection utilities
- [x] 1.2 Implement `findAdjacentRoom()` to detect rooms sharing a wall
- [x] 1.3 Implement `shouldRenderWall()` ownership logic (lower position owns)
- [x] 1.4 Implement `findAllAdjacentRooms()` for multi-room scenarios

## 2. Wall Segmentation

- [x] 2.1 Implement `computeWallSegments()` to split wall by adjacent room overlaps
- [x] 2.2 Handle edge cases: no adjacent rooms, single adjacent, multiple adjacent
- [x] 2.3 Compute segment boundaries based on room overlap extents

## 3. Per-Face Material Support

- [x] 3.1 Update `MaterialFactory` to support creating material arrays
- [x] 3.2 Create `createPerFaceWallMaterials()` for 6-face material arrays
- [x] 3.3 Ensure owner color on sides (+X, -X) and exterior face, adjacent color on interior face

## 4. Wall Generator Updates

- [x] 4.1 Modify `WallGenerator` to accept style resolver
- [x] 4.2 Check wall ownership before rendering (skip if not owner)
- [x] 4.3 Generate segmented walls with per-face materials
- [x] 4.4 Ensure CSG operations (door/window holes) work with segmented walls

## 5. Main Viewer Integration

- [x] 5.1 Update `Viewer.generateFloor()` to pass style resolver to wall generator
- [x] 5.2 Update wall generation loop to use ownership-aware rendering

## 6. Validation Layer

- [x] 6.1 Add `checkSharedWallConflicts()` in `floorplans-validator.ts`
- [x] 6.2 Detect wall type conflicts (e.g., solid vs window on shared boundary)
- [x] 6.3 Detect wall height mismatches at shared boundaries
- [x] 6.4 Emit appropriate warnings with actionable messages

## 7. Testing

- [x] 7.1 Build passes successfully
- [x] 7.2 All existing tests pass (69 tests)
- [x] 7.3 Manual testing with `ImprovedTriplexVilla.floorplan` in 3D viewer completed
- [x] 7.4 Add unit tests for wall ownership and segmentation (24 tests in `viewer/test/wall-ownership.test.ts`)

