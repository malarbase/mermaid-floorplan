## 1. 3D Stair Geometry Coordinate Tracking

- [x] 1.1 Refactor `StairGenerator` to use scalar `currentX`/`currentY` tracking instead of `THREE.Vector3`
- [x] 1.2 Implement `applyTurn` helper for CW/CCW direction changes in custom segmented stairs
- [x] 1.3 Fix flight segment coordinate accumulation to match 2D SVG renderer trace logic
- [x] 1.4 Fix landing segment coordinate handling for custom stair shapes
- [x] 1.5 Update bounding box normalization to match traced boundaries for custom stairs

## 2. Sub-Room Connection Renderer

- [x] 2.1 Add `RoomFindResult` interface with `room` and optional `parent` fields
- [x] 2.2 Implement `findRoomAndParent()` to recursively search rooms and sub-rooms by name
- [x] 2.3 Refactor `getRoomPosition` → `getAbsoluteRoomPosition` with recursive parent offset accumulation
- [x] 2.4 Update `generateConnection()` to resolve absolute positions for both from/to endpoints
- [x] 2.5 Update `getWallBounds` signature to accept absolute position instead of parent offsets
- [x] 2.6 Update `calculateConnectionPoint` to use absolute positions for both endpoints

## 3. Validator Parent-Child Connection Support

- [x] 3.1 Build `parentMap` from sub-room declarations during connection validation
- [x] 3.2 Update shared-segment check to recognize `isParentChild` as a valid connection case
- [x] 3.3 Allow connections between parent rooms and their child sub-rooms without explicit shared wall segments

## 4. Critic Custom Stair Footprint

- [x] 4.1 Implement coordinate tracing for `custom` stair shape with `flight` and `landing` segments
- [x] 4.2 Handle direction turns during segment traversal in footprint computation
- [x] 4.3 Re-adjust bounding box to match exact traced boundaries for custom stair shapes

## 5. Skill Documentation

- [x] 5.1 Clarify script path prefixes (`skills/mermaid-floorplan/scripts/`) in SKILL.md
- [x] 5.2 Add wall type guidance (`solid`, `open`, `window`) with usage recommendations
- [x] 5.3 Add fallback editing instructions for when `modify.mjs` fails

## 6. Workspace Configuration

- [x] 6.1 Add `work/` directory to `.gitignore`
- [x] 6.2 Create symlink `/.agents/skills/mermaid-floorplan` → `skills/mermaid-floorplan`

## 7. Floorplan Documentation

- [x] 7.1 Write `docs/aligned_floorplan_walkthrough.md` with layout alignment walkthrough
- [x] 7.2 Write `docs/floorplan_improvement_report.md` with structural improvement report

## 8. Verify

- [x] 8.1 `npm run build` from repo root succeeds (CI build passed)
- [x] 8.2 TypeScript compilation passes for all modified files
- [x] 8.3 Floorplan validator accepts parent-child connections
- [x] 8.4 Custom segmented stair coordinates align between 2D and 3D renders
