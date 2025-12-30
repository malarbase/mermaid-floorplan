## Why
Rooms are currently strictly rectangular. Real buildings often have L-shaped rooms, angled walls, or bay windows.

**Concrete limitation**: Rectangular rooms that meet only at corners cannot have doors between them. For example, when `Lobby_2` (y: 22-32) is adjacent to `Terrace` (y: 32-72) at the same x-coordinate, their walls touch at a single point but have no overlapping segment for door placement. An L-shaped Terrace extending upward would create the necessary wall overlap.

## What Changes
- Add support for polygon definitions (list of vertices)
- Add support for composite shapes (CSG union/difference of rectangles)
- Update rendering logic to handle non-rectangular floor meshes and wall generation
- **Ensure door connections work on complex shape walls where segments overlap**

## Impact
- Affected specs: `dsl-grammar`, `rendering`
- Affected code: `language/src`, `viewer/src`, `scripts/export-json.ts`

