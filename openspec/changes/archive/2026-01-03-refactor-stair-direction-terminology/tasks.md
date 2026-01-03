## 1. Grammar Changes

- [x] 1.1 Rename `CompassDirection` to `ViewDirection` with values `top | bottom | left | right`
- [x] 1.2 Update `StraightStair` rule: change `'direction' direction=CompassDirection` to `'toward' direction=ViewDirection`
- [x] 1.3 Update L-shaped/U-shaped/Double-L/Winder stair rules: change `'entry' entry=CompassDirection` to `'from' entry=ViewDirection`
- [x] 1.4 Update `CustomStairShape` rule: change `'entry' entry=CompassDirection` to `'from' entry=ViewDirection`
- [x] 1.5 Update `LiftDoors` rule: change `CompassDirection` to `ViewDirection`

## 2. Type Definitions

- [x] 2.1 Update `floorplan-3d-core/src/types.ts`: Change direction types from compass to view-relative
- [x] 2.2 Update `language/src/diagrams/floorplans/json-converter.ts`: Update direction type definitions

## 3. Converters and Renderers

- [x] 3.1 Update `json-converter.ts`: Update direction mapping logic and comments
- [x] 3.2 Update `stair-renderer.ts`: Update direction handling in SVG rendering
- [x] 3.3 Update `stair-geometry.ts`: Update direction switch cases for 3D rendering
- [x] 3.4 Update `floor.ts`: Update stair bounds calculation direction checks

## 4. Validators

- [x] 4.1 Update `floorplans-validator.ts`: Update any direction validation logic

## 5. MCP Server

- [x] 5.1 Update tool schemas in `mcp-server/src/tools/` if stair direction is exposed

## 6. Examples and Tests

- [x] 6.1 Update `examples/StairsAndLifts.floorplan` with new syntax
- [x] 6.2 Update any other example files using stair/lift directions
- [x] 6.3 Update unit tests for grammar parsing
- [x] 6.4 Update unit tests for rendering

## 7. Documentation

- [x] 7.1 Update README if stair syntax is documented
- [x] 7.2 Update MCP server README with new DSL syntax

