# Tasks: Add Relative Positioning Helpers

## 1. Grammar Extension
- [x] 1.1 Add `RelativePosition` rule to `floorplans.langium`
- [x] 1.2 Add position direction keywords (`right-of`, `left-of`, `above`, `below`)
- [x] 1.3 Add diagonal position keywords (`above-right-of`, etc.)
- [x] 1.4 Add optional `gap` clause with NUMBER parameter
- [x] 1.5 Add optional `align` clause with direction parameter
- [x] 1.6 Make `at (x,y)` optional when relative position is specified
- [x] 1.7 Regenerate parser with `npm run langium:generate`

## 2. Validator Implementation
- [x] 2.1 Create position resolver module (`language/src/diagrams/floorplans/position-resolver.ts`)
- [x] 2.2 Implement topological sort for room dependencies
- [x] 2.3 Implement position calculation for each direction
- [x] 2.4 Implement gap and alignment application
- [x] 2.5 Add circular dependency detection with clear error message
- [x] 2.6 Add missing reference detection with clear error message
- [x] 2.7 Integrate resolver into rendering pipeline (renderer.ts)

## 3. Overlap Detection
- [x] 3.1 Implement room bounding box overlap detection
- [x] 3.2 Add warning for overlapping rooms (non-blocking)
- [ ] 3.3 Add optional strict mode to error on overlaps (deferred - can be added later if needed)

## 4. Tests
- [x] 4.1 Parser tests for new syntax variants
- [x] 4.2 Validator tests for position resolution
- [x] 4.3 Tests for error cases (circular, missing reference)
- [x] 4.4 Tests for gap and alignment combinations
- [x] 4.5 Rendering tests with resolved positions (existing tests continue to pass)

## 5. MCP Server Updates
- [x] 5.1 Update `modify_floorplan` to handle relative positioning in `add_room` operation
- [x] 5.2 Update room metadata output to include both relative and resolved positions
- [x] 5.3 Add new operation `convert_to_relative`

## 6. Documentation
- [x] 6.1 Update README with relative positioning examples
- [x] 6.2 Update MCP server README with new capabilities
- [x] 6.3 Add examples to trial/ directory

