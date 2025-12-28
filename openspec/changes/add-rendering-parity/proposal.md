## Why

The Langium grammar defines several features (connections, double-doors, multi-floor, swing direction) that are parsed correctly but not rendered to SVG. This creates a confusing experience where valid DSL syntax produces no visual output, and limits the floorplan tool's usefulness for real architectural layouts.

## What Changes

- Add connection rendering between rooms with door symbols at the connection point
- Support double-door rendering (two swing arcs instead of one)
- Support door swing direction (`swing: left|right`) in rendered output
- Support door position percentage (`at 50%`) along walls
- Enable multi-floor rendering (currently only first floor is rendered)

## Impact

- Affected specs: `rendering` (new capability)
- Affected code:
  - `language/src/diagrams/floorplans/renderer.ts` - Multi-floor support
  - `language/src/diagrams/floorplans/door.ts` - Double-door and swing direction
  - New `language/src/diagrams/floorplans/connection.ts` - Connection rendering
  - `mcp-server/src/tools/render.ts` - Floor selection option

