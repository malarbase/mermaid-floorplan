# Proposal: Add Shared Wall Rendering

## Why

Adjacent rooms with different styles cause **Z-fighting** (visual flickering/glitches) because both rooms render their own wall at the exact same position. When Room A's right wall and Room B's left wall occupy identical 3D coordinates with different colors, the GPU cannot determine which surface to display, creating a checkerboard-like artifact.

Additionally, when one wall is shared by **multiple** rooms on the opposite side (e.g., Room A's bottom wall is adjacent to both Room B and Room C), the interior face should display each adjacent room's color for visual consistency.

## What Changes

### 3D Viewer Changes
- **Wall Ownership Detection**: Determine which room "owns" each shared wall based on deterministic rules (lower X for vertical walls, lower Z for horizontal walls)
- **Adjacency Analysis**: Detect which rooms are adjacent to each wall and compute overlap regions
- **Wall Segmentation**: Split shared walls into segments where each segment corresponds to one adjacent room
- **Per-Face Materials**: Apply owner's wall color to exterior face and sides, adjacent room's color to interior face
- **Single Wall Rendering**: Owner renders the wall; non-owner skips rendering to prevent Z-fighting

### DSL Validation Changes
- **Wall Type Conflict Detection**: Warn when adjacent walls have conflicting types (e.g., `solid` vs `window`)
- **Wall Height Mismatch Warning**: Warn when adjacent rooms have different heights at shared boundaries

## Impact

- **Affected specs**: `3d-viewer`, `dsl-grammar`
- **Affected code**:
  - `viewer/src/wall-generator.ts` - Major changes for segmentation
  - `viewer/src/main.ts` - Pass all rooms and styles to wall generator
  - `viewer/src/materials.ts` - Support per-face material arrays
  - New file: `viewer/src/wall-ownership.ts` - Adjacency detection utilities
  - `language/src/floorplans-validator.ts` - Add wall conflict validation

## Visual Example

```
Room A's bottom wall split into segments:

├─────── Segment 1 ───────├────── Segment 2 ──────┤
       (width of B)            (width of C)

Segment 1 materials:          Segment 2 materials:
  +Y face: Blue (Room A)        +Y face: Blue (Room A)
  -Y face: Red (Room B)         -Y face: Green (Room C)
  sides: Blue (owner)           sides: Blue (owner)
```

The side faces use the owner's color (Blue) to make wall ownership visually identifiable.

## Non-Goals

- Custom wall-by-wall style overrides (future enhancement)
- Shared wall texture blending (too complex for initial implementation)
- User-defined wall ownership rules (deterministic is sufficient)

