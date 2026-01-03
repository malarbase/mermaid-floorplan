## Why

Stairs and lifts are essential vertical circulation elements in multi-story buildings, but the current grammar has no way to express them semantically. Users work around this by creating regular rooms labeled "Stairs" or "Lift", losing:

1. **Type-specific rendering** - Stairs need step lines, direction arrows, and 3D geometry
2. **Dimensional validation** - Building codes require specific riser/tread ratios
3. **Cross-floor connections** - No way to link circulation elements between floors
4. **Shape variety** - Different stair configurations (L-shaped, U-shaped, spiral) have distinct footprints

**Additional Issue (3D Rendering Consistency):** The MCP server's 3D PNG rendering does not render stairs/lifts at all, while the viewer has complete stair geometry generation. This creates inconsistency between:
- **Viewer** (browser-based): Full 3D stair geometry with treads, risers, handrails
- **MCP Server** (Puppeteer-based): Only renders rooms, walls, floors—no stairs/lifts

## What Changes

- Add `stair` and `lift` as new element types within floors
- Support preset stair shapes: `straight`, `L-shaped`, `U-shaped`, `double-L`, `spiral`, `curved`, `winder`
- Add composable `custom` shape using flight/turn segments for arbitrary configurations
- Add `VerticalConnection` to semantically link circulation across floors
- Include stair-specific properties: riser height, tread depth, handrails, climb direction
- Define 2D symbols and 3D geometry generation rules for each shape
- **Consolidate 3D stair/lift rendering** to use `floorplan-3d-core` for both viewer and MCP server

## Impact

- Affected specs: `dsl-grammar`, `rendering`, `3d-viewer`
- Affected code: 
  - `language/src/diagrams/floorplans/floorplans.langium` - Grammar rules
  - `language/src/diagrams/floorplans/json-converter.ts` - JSON export
  - `viewer/src/` - 3D stair/lift geometry
  - `floorplan-3d-core/` - Shared 3D geometry generation (needs stair/lift support)
  - `mcp-server/src/utils/renderer3d.ts` - 3D rendering to use shared core
  - `scripts/export-json.ts` - Include circulation in export

