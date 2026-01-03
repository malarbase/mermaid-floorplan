## 1. Grammar Implementation

- [x] 1.1 Add `Stair` rule to `floorplans.langium` with shape variants
- [x] 1.2 Add `Lift` rule for elevator shafts
- [x] 1.3 Add preset shape rules: `StraightStair`, `LShapedStair`, `UShapedStair`, `DoubleLStair`, `SpiralStair`, `CurvedStair`, `WinderStair`
- [x] 1.4 Add `SegmentedStair` rule for composable `custom` shape
- [x] 1.5 Add `StairSegment`, `FlightSegment`, `TurnSegment` rules
- [x] 1.6 Add per-segment `width` override in `FlightSegment` rule
- [x] 1.7 Add `WallAlignment` rule for `along Room.wall` syntax in flight segments
- [x] 1.8 Add `stringers` property (open/closed/glass) to `Stair` rule
- [x] 1.9 Add `headroom` property to `Stair` rule
- [x] 1.10 Add `stair_code` to config properties (residential/commercial/ada/none)
- [x] 1.11 Add `VerticalConnection` rule for cross-floor links
- [x] 1.12 Add supporting terminal rules: `CompassDirection`, `TurnDirection`, `TurnAngle`, `StringerStyle`
- [x] 1.13 Update `Floor` rule to include `stairs` and `lifts` arrays
- [x] 1.14 Update `Floorplan` entry rule to include `verticalConnections`
- [x] 1.15 Run `npm run langium:generate` to regenerate parser

## 2. Validation

- [x] 2.1 Add validator for stair dimensional constraints (max riser height, min tread depth)
- [x] 2.2 Add validator for vertical connection position alignment
- [x] 2.3 Add validator for vertical connection footprint compatibility
- [x] 2.4 Add warning for skipped floors in vertical connections
- [x] 2.5 Add validator for wall alignment room references (room must exist on same floor)
- [x] 2.6 Add building code compliance validator (residential/commercial/ada rules)
- [x] 2.7 Add validator for per-segment width consistency (landing width vs flight widths)

## 3. JSON Export

- [x] 3.1 Extend `JsonExport` interface with stairs and lifts arrays
- [x] 3.2 Add `JsonStair` interface with shape, segments, and dimensions
- [x] 3.3 Add `JsonLift` interface with position and dimensions
- [x] 3.4 Add `JsonVerticalConnection` interface
- [x] 3.5 Update `convertToJson` to include circulation elements
- [x] 3.6 Implement wall alignment position calculation (resolve `along Room.wall` to coordinates)
- [x] 3.7 Update `export-json.ts` script

## 4. 2D Rendering (SVG)

- [x] 4.1 Create `stair-renderer.ts` with shape-specific symbol generators
- [x] 4.2 Implement straight stair symbol (parallel lines + arrow)
- [x] 4.3 Implement L-shaped/U-shaped/double-L stair symbols
- [x] 4.4 Implement spiral stair symbol (concentric arcs)
- [x] 4.5 Implement lift symbol (rectangle with "E" or elevator icon)
- [x] 4.6 Integrate stair/lift rendering into `generateFloorSvg`

## 5. 3D Rendering (Three.js)

- [x] 5.1 Create `stair-generator.ts` in viewer with geometry generators
- [x] 5.2 Implement straight stair geometry (tread + riser boxes)
- [x] 5.3 Implement L-shaped stair geometry with landing mesh
- [x] 5.4 Implement spiral stair geometry (radial treads)
- [x] 5.5 Implement lift shaft geometry (vertical hole through floors)
- [x] 5.6 Add handrail geometry generation
- [x] 5.7 Implement stringer styles (open: no risers, closed: solid risers, glass: translucent)
- [x] 5.8 Integrate into `main.ts` floor rendering loop

## 6. Testing

- [x] 6.1 Add parser tests for each stair shape
- [x] 6.2 Add parser tests for custom segmented stairs
- [x] 6.3 Add parser tests for wall-aligned stair segments
- [x] 6.4 Add parser tests for vertical connections
- [x] 6.5 Add validation tests for dimensional constraints
- [x] 6.6 Add validation tests for wall alignment references
- [x] 6.7 Add parser tests for per-segment width overrides
- [x] 6.8 Add parser tests for stringer styles
- [x] 6.9 Add validation tests for building code compliance
- [x] 6.10 Add JSON export tests for circulation elements
- [x] 6.11 Create example floorplan with all stair types

## 7. Documentation

- [x] 7.1 Update grammar spec with stair/lift requirements
- [x] 7.2 Add examples to project README or trial folder
- [x] 7.3 Document dimensional defaults and building code rationale

## 8. Shared 3D Rendering (MCP + Viewer Consolidation)

- [x] 8.1 Move `viewer/src/stair-generator.ts` logic to `floorplan-3d-core/src/stair-geometry.ts`
  - Export `generateStairGeometry()` function taking stair data and returning THREE.Group
  - Include all shape variants: straight, L-shaped, U-shaped, spiral, custom segments
  - Include handrail and stringer geometry generation
- [x] 8.2 Move `viewer/src/lift-generator.ts` logic to `floorplan-3d-core/src/lift-geometry.ts`
  - Export `generateLiftGeometry()` function for elevator shaft geometry
  - Include door openings and shaft wall rendering
- [x] 8.3 Update `floorplan-3d-core/src/scene-builder.ts` to use new stair/lift generators
  - Add stair iteration in `buildFloorGroup()`
  - Add lift iteration in `buildFloorGroup()`
  - Ensure proper Y-offset per floor
- [x] 8.4 Refactor `viewer/src/main.ts` to use `floorplan-3d-core` stair/lift functions
  - Replace inline stair geometry with `generateStairGeometry()` import
  - Replace inline lift geometry with `generateLiftGeometry()` import
  - Verify viewer still renders correctly
- [x] 8.5 Update `mcp-server/src/utils/renderer3d.ts` to include stair/lift rendering
  - Import and call `generateStairGeometry()` from core
  - Import and call `generateLiftGeometry()` from core
  - Iterate over `floor.stairs` and `floor.lifts` arrays in parsed data
- [x] 8.6 Add shared types in `floorplan-3d-core/src/types.ts`
  - `StairData` interface matching JSON export
  - `LiftData` interface matching JSON export
  - Shape-specific parameter interfaces
- [x] 8.7 Test MCP 3D rendering with `examples/StairsAndLifts.floorplan`
  - Verify stairs appear in 3D PNG output
  - Verify lifts appear in 3D PNG output
  - Compare output consistency between MCP and viewer
- [x] 8.8 Update `floorplan-3d-core/package.json` exports if needed

## 9. Shared Unit Normalization

- [x] 9.1 Create `floorplan-3d-core/src/unit-normalizer.ts`
  - Add `normalizeToMeters()` function to convert all dimensions from DSL units to meters
  - Include normalization for rooms, walls, stairs, lifts, config, and connections
  - Handle stair shape-specific properties (landing, outerRadius, innerRadius, segments)
- [x] 9.2 Export `normalizeToMeters` from `floorplan-3d-core/src/index.ts`
- [x] 9.3 Update `floorplan-3d-core/src/scene-builder.ts` to normalize internally
  - Call `normalizeToMeters()` at start of `buildFloorplanScene()`
  - Call `normalizeToMeters()` at start of `buildCompleteScene()`
- [x] 9.4 Update `viewer/src/main.ts` to use shared normalizer from core
  - Remove local `unit-normalizer.ts`
  - Import `normalizeToMeters` from `floorplan-3d-core`
- [x] 9.5 Update `mcp-server/src/utils/renderer3d.ts` to normalize before rendering
  - Call `normalizeToMeters()` before passing data to puppeteer-renderer
- [x] 9.6 Verify consistent rendering between viewer and MCP

