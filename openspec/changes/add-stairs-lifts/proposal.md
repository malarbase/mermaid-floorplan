## Why

Stairs and lifts are essential vertical circulation elements in multi-story buildings, but the current grammar has no way to express them semantically. Users work around this by creating regular rooms labeled "Stairs" or "Lift", losing:

1. **Type-specific rendering** - Stairs need step lines, direction arrows, and 3D geometry
2. **Dimensional validation** - Building codes require specific riser/tread ratios
3. **Cross-floor connections** - No way to link circulation elements between floors
4. **Shape variety** - Different stair configurations (L-shaped, U-shaped, spiral) have distinct footprints

## What Changes

- Add `stair` and `lift` as new element types within floors
- Support preset stair shapes: `straight`, `L-shaped`, `U-shaped`, `double-L`, `spiral`, `curved`, `winder`
- Add composable `custom` shape using flight/turn segments for arbitrary configurations
- Add `VerticalConnection` to semantically link circulation across floors
- Include stair-specific properties: riser height, tread depth, handrails, climb direction
- Define 2D symbols and 3D geometry generation rules for each shape

## Impact

- Affected specs: `dsl-grammar`, `rendering`
- Affected code: 
  - `language/src/diagrams/floorplans/floorplans.langium` - Grammar rules
  - `language/src/diagrams/floorplans/json-converter.ts` - JSON export
  - `viewer/src/` - 3D stair/lift geometry
  - `scripts/export-json.ts` - Include circulation in export

