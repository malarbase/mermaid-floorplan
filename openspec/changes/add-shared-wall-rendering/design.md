# Design: Shared Wall Rendering

## Context

The 3D viewer renders walls independently for each room. When two adjacent rooms have different styles, both rooms render walls at the same position, causing Z-fighting. This design addresses rendering shared walls correctly with per-face materials.

## Goals

- Eliminate Z-fighting on shared walls between rooms with different styles
- Support walls shared by multiple rooms on the opposite side
- Apply correct colors to each face of shared walls
- Validate conflicting wall configurations at parse time

## Non-Goals

- Custom per-wall style overrides (future)
- Texture blending at wall boundaries
- User-controllable ownership rules

## Decisions

### Decision 1: Wall Ownership Model

**What**: Each shared wall has exactly one "owner" who renders it. The non-owner skips rendering.

**Why**: Simplest solution to prevent Z-fighting. Alternative approaches (half-thickness walls, face overlays) add complexity.

**Ownership Rules** (deterministic, no user input required):
- For vertical walls (left/right): Room with **smaller X position** owns the wall
- For horizontal walls (top/bottom): Room with **smaller Z position** owns the wall
- If positions are equal, compare room names alphabetically

**Example**:
```
Room A at (0, 0)     Room B at (10, 0)
┌─────────┐─────────┐
│    A    │    B    │
└─────────┘─────────┘

A.right wall position = 10
B.left wall position = 10

A.x (0) < B.x (10) → A owns the shared wall
A renders wall, B skips
```

### Decision 2: Wall Segmentation for Multi-Room Sharing

**What**: When a wall is adjacent to multiple rooms on the opposite side, split it into segments.

**Why**: Each segment needs different interior face materials. Three.js material arrays work per-face, not per-region.

**Algorithm**:
1. Find all rooms adjacent to this wall's exterior face
2. Compute the overlap extent of each adjacent room with the wall
3. Sort overlaps by position along the wall
4. Create one segment per overlap region

```typescript
interface WallSegment {
  startPos: number;      // Start position along wall
  endPos: number;        // End position along wall
  ownerRoom: JsonRoom;
  ownerStyle: JsonStyle;
  adjacentRoom: JsonRoom | null;  // null for exterior-facing segments
  adjacentStyle: JsonStyle | null;
}
```

### Decision 3: Per-Face Materials via Three.js Material Arrays

**What**: Use Three.js's native material array support for BoxGeometry.

**Why**: BoxGeometry has 6 built-in groups (faces). Passing an array of 6 materials assigns each to a face.

**Face Mapping for Walls**:
```
BoxGeometry face groups:
  Group 0: +X face (right side)
  Group 1: -X face (left side)
  Group 2: +Y face (top - usually ceiling contact)
  Group 3: -Y face (bottom - usually floor contact)
  Group 4: +Z face (front/back depending on wall orientation)
  Group 5: -Z face (front/back depending on wall orientation)

For a horizontal wall (top/bottom direction):
  - +Z or -Z = exterior face (owner's style)
  - -Z or +Z = interior face (adjacent room's style)
  - ±X, ±Y = side faces (owner's style for identification)

For a vertical wall (left/right direction):
  - +X or -X = exterior face (owner's style)
  - -X or +X = interior face (adjacent room's style)
  - ±Z, ±Y = side faces (owner's style for identification)
```

### Decision 4: Side Faces Use Owner's Color

**What**: The side faces of wall segments use the owner room's wall color, not the adjacent room's.

**Why**: Makes wall ownership visually identifiable. Users can see at a glance which room "owns" each wall by looking at the wall's edge color.

### Decision 5: Validation Warnings for Conflicts

**What**: Emit warnings (not errors) for wall conflicts like type mismatches or height differences.

**Why**: 
- Type conflicts (solid vs window) are ambiguous - which wins?
- Height mismatches create visual inconsistencies
- Warnings inform the user; rendering still proceeds

**Validation Checks**:
| Conflict | Severity | Message |
|----------|----------|---------|
| Wall type mismatch | Warning | "Adjacent walls have conflicting types: {room1}.{wall1} is '{type1}' but {room2}.{wall2} is '{type2}'" |
| Height mismatch | Warning | "Rooms '{room1}' and '{room2}' have different heights ({h1} vs {h2}) at shared wall" |

## Risks / Trade-offs

### Risk: CSG Operations with Segmented Walls

**Issue**: Door/window holes via CSG must be applied to the correct segment(s).

**Mitigation**: When adding holes, iterate through segments and apply CSG only to segments that spatially overlap with the hole position.

### Risk: Performance with Many Segments

**Issue**: More segments = more draw calls.

**Mitigation**: 
- Most walls have 0 or 1 adjacent room (no segmentation needed)
- Segment count is bounded by room count
- Three.js handles moderate draw calls well

### Trade-off: Owner-Determined Wall Style

**Issue**: The owner's style determines the exterior face color, which might not match user expectations.

**Acceptance**: Deterministic rules are predictable. Users can adjust room positions or styles if needed.

## Data Flow

```
JSON Export
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│ Viewer.generateFloor()                                      │
│   │                                                         │
│   ▼                                                         │
│ For each room:                                              │
│   │                                                         │
│   ▼                                                         │
│ For each wall:                                              │
│   ├─► shouldRenderWall(room, wall, allRooms)               │
│   │     └─► Skip if not owner                              │
│   │                                                         │
│   ├─► findAllAdjacentRooms(room, wall, allRooms)           │
│   │                                                         │
│   ├─► computeWallSegments(room, wall, adjacentRooms)       │
│   │                                                         │
│   ▼                                                         │
│ For each segment:                                           │
│   ├─► createSegmentMesh(segment, ownerStyle, adjStyle)     │
│   │     └─► Material array: [owner, owner, owner, owner,   │
│   │                          exterior, interior]            │
│   │                                                         │
│   └─► Apply CSG for doors/windows if overlapping           │
└─────────────────────────────────────────────────────────────┘
```

## Open Questions

- **Q**: Should connections (doors) between rooms with different styles show a blended frame color?
- **A**: Out of scope for this change. Doors currently use a fixed door material.

- **Q**: What about corner walls where three rooms meet?
- **A**: Each wall segment is independent. Corner rendering is handled by existing wall extension logic.

