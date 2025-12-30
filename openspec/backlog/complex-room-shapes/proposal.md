## Why
Rooms are currently strictly rectangular. Real buildings often have L-shaped rooms, angled walls, or bay windows.

## What Changes
- Add support for polygon definitions (list of vertices)
- Add support for composite shapes (CSG union/difference of rectangles)
- Update rendering logic to handle non-rectangular floor meshes and wall generation

## Impact
- Affected specs: `dsl-grammar`, `rendering`
- Affected code: `language/src`, `viewer/src`, `scripts/export-json.ts`

