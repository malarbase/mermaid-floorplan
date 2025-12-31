## 1. Grammar Implementation

- [ ] 1.1 Add `Stair` rule to `floorplans.langium` with shape variants
- [ ] 1.2 Add `Lift` rule for elevator shafts
- [ ] 1.3 Add preset shape rules: `StraightStair`, `LShapedStair`, `UShapedStair`, `DoubleLStair`, `SpiralStair`, `CurvedStair`, `WinderStair`
- [ ] 1.4 Add `SegmentedStair` rule for composable `custom` shape
- [ ] 1.5 Add `StairSegment`, `FlightSegment`, `TurnSegment` rules
- [ ] 1.6 Add per-segment `width` override in `FlightSegment` rule
- [ ] 1.7 Add `WallAlignment` rule for `along Room.wall` syntax in flight segments
- [ ] 1.8 Add `stringers` property (open/closed/glass) to `Stair` rule
- [ ] 1.9 Add `headroom` property to `Stair` rule
- [ ] 1.10 Add `stair_code` to config properties (residential/commercial/ada/none)
- [ ] 1.11 Add `VerticalConnection` rule for cross-floor links
- [ ] 1.12 Add supporting terminal rules: `CompassDirection`, `TurnDirection`, `TurnAngle`, `StringerStyle`
- [ ] 1.13 Update `Floor` rule to include `stairs` and `lifts` arrays
- [ ] 1.14 Update `Floorplan` entry rule to include `verticalConnections`
- [ ] 1.15 Run `npm run langium:generate` to regenerate parser

## 2. Validation

- [ ] 2.1 Add validator for stair dimensional constraints (max riser height, min tread depth)
- [ ] 2.2 Add validator for vertical connection position alignment
- [ ] 2.3 Add validator for vertical connection footprint compatibility
- [ ] 2.4 Add warning for skipped floors in vertical connections
- [ ] 2.5 Add validator for wall alignment room references (room must exist on same floor)
- [ ] 2.6 Add building code compliance validator (residential/commercial/ada rules)
- [ ] 2.7 Add validator for per-segment width consistency (landing width vs flight widths)

## 3. JSON Export

- [ ] 3.1 Extend `JsonExport` interface with stairs and lifts arrays
- [ ] 3.2 Add `JsonStair` interface with shape, segments, and dimensions
- [ ] 3.3 Add `JsonLift` interface with position and dimensions
- [ ] 3.4 Add `JsonVerticalConnection` interface
- [ ] 3.5 Update `convertToJson` to include circulation elements
- [ ] 3.6 Implement wall alignment position calculation (resolve `along Room.wall` to coordinates)
- [ ] 3.7 Update `export-json.ts` script

## 4. 2D Rendering (SVG)

- [ ] 4.1 Create `stair-renderer.ts` with shape-specific symbol generators
- [ ] 4.2 Implement straight stair symbol (parallel lines + arrow)
- [ ] 4.3 Implement L-shaped/U-shaped/double-L stair symbols
- [ ] 4.4 Implement spiral stair symbol (concentric arcs)
- [ ] 4.5 Implement lift symbol (rectangle with "E" or elevator icon)
- [ ] 4.6 Integrate stair/lift rendering into `generateFloorSvg`

## 5. 3D Rendering (Three.js)

- [ ] 5.1 Create `stair-generator.ts` in viewer with geometry generators
- [ ] 5.2 Implement straight stair geometry (tread + riser boxes)
- [ ] 5.3 Implement L-shaped stair geometry with landing mesh
- [ ] 5.4 Implement spiral stair geometry (radial treads)
- [ ] 5.5 Implement lift shaft geometry (vertical hole through floors)
- [ ] 5.6 Add handrail geometry generation
- [ ] 5.7 Implement stringer styles (open: no risers, closed: solid risers, glass: translucent)
- [ ] 5.8 Integrate into `main.ts` floor rendering loop

## 6. Testing

- [ ] 6.1 Add parser tests for each stair shape
- [ ] 6.2 Add parser tests for custom segmented stairs
- [ ] 6.3 Add parser tests for wall-aligned stair segments
- [ ] 6.4 Add parser tests for vertical connections
- [ ] 6.5 Add validation tests for dimensional constraints
- [ ] 6.6 Add validation tests for wall alignment references
- [ ] 6.7 Add parser tests for per-segment width overrides
- [ ] 6.8 Add parser tests for stringer styles
- [ ] 6.9 Add validation tests for building code compliance
- [ ] 6.10 Add JSON export tests for circulation elements
- [ ] 6.11 Create example floorplan with all stair types

## 7. Documentation

- [ ] 7.1 Update grammar spec with stair/lift requirements
- [ ] 7.2 Add examples to project README or trial folder
- [ ] 7.3 Document dimensional defaults and building code rationale

