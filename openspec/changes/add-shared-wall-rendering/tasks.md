# Tasks: Add Shared Wall Rendering

## 1. Wall Ownership Detection

- [ ] 1.1 Create `viewer/src/wall-ownership.ts` with adjacency detection utilities
- [ ] 1.2 Implement `findAdjacentRoom()` to detect rooms sharing a wall
- [ ] 1.3 Implement `shouldRenderWall()` ownership logic (lower position owns)
- [ ] 1.4 Implement `findAllAdjacentRooms()` for multi-room scenarios

## 2. Wall Segmentation

- [ ] 2.1 Implement `computeWallSegments()` to split wall by adjacent room overlaps
- [ ] 2.2 Handle edge cases: no adjacent rooms, single adjacent, multiple adjacent
- [ ] 2.3 Compute segment boundaries based on room overlap extents

## 3. Per-Face Material Support

- [ ] 3.1 Update `MaterialFactory` to support creating material arrays
- [ ] 3.2 Create `createWallSegmentMaterials()` for 6-face material arrays
- [ ] 3.3 Ensure owner color on sides (+X, -X) and exterior face, adjacent color on interior face

## 4. Wall Generator Updates

- [ ] 4.1 Modify `WallGenerator` to accept all rooms and styles
- [ ] 4.2 Check wall ownership before rendering (skip if not owner)
- [ ] 4.3 Generate segmented walls with per-face materials
- [ ] 4.4 Ensure CSG operations (door/window holes) work with segmented walls

## 5. Main Viewer Integration

- [ ] 5.1 Update `Viewer.generateFloor()` to pass all rooms and styles to wall generator
- [ ] 5.2 Update wall generation loop to use ownership-aware rendering

## 6. Validation Layer

- [ ] 6.1 Add `validateSharedWalls()` in `floorplans-validator.ts`
- [ ] 6.2 Detect wall type conflicts (e.g., solid vs window on shared boundary)
- [ ] 6.3 Detect wall height mismatches at shared boundaries
- [ ] 6.4 Emit appropriate warnings/errors with actionable messages

## 7. Testing

- [ ] 7.1 Add unit tests for adjacency detection
- [ ] 7.2 Add unit tests for wall segmentation
- [ ] 7.3 Add integration tests for multi-room shared wall scenarios
- [ ] 7.4 Test with `ImprovedTriplexVilla.floorplan` to verify Z-fighting is resolved

