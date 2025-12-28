# Tasks: Add Relative Positioning Helpers

## 1. Grammar Extension
- [ ] 1.1 Add `RelativePosition` rule to `floorplans.langium`
- [ ] 1.2 Add position direction keywords (`right-of`, `left-of`, `above`, `below`)
- [ ] 1.3 Add diagonal position keywords (`above-right-of`, etc.)
- [ ] 1.4 Add optional `gap` clause with NUMBER parameter
- [ ] 1.5 Add optional `align` clause with direction parameter
- [ ] 1.6 Make `at (x,y)` optional when relative position is specified
- [ ] 1.7 Regenerate parser with `npm run langium:generate`

## 2. Validator Implementation
- [ ] 2.1 Create position resolver module (`language/src/diagrams/floorplans/position-resolver.ts`)
- [ ] 2.2 Implement topological sort for room dependencies
- [ ] 2.3 Implement position calculation for each direction
- [ ] 2.4 Implement gap and alignment application
- [ ] 2.5 Add circular dependency detection with clear error message
- [ ] 2.6 Add missing reference detection with clear error message
- [ ] 2.7 Integrate resolver into validation pipeline (`floorplans-validator.ts`)

## 3. Overlap Detection
- [ ] 3.1 Implement room bounding box overlap detection
- [ ] 3.2 Add warning for overlapping rooms (non-blocking)
- [ ] 3.3 Add optional strict mode to error on overlaps

## 4. Tests
- [ ] 4.1 Parser tests for new syntax variants
- [ ] 4.2 Validator tests for position resolution
- [ ] 4.3 Tests for error cases (circular, missing reference)
- [ ] 4.4 Tests for gap and alignment combinations
- [ ] 4.5 Rendering tests with resolved positions

## 5. MCP Server Updates
- [ ] 5.1 Update `modify_floorplan` to handle relative positioning in `add_room` operation
- [ ] 5.2 Update room metadata output to include both relative and resolved positions
- [ ] 5.3 Add new operation `convert_to_relative` (optional, nice-to-have)

## 6. Documentation
- [ ] 6.1 Update README with relative positioning examples
- [ ] 6.2 Update MCP server README with new capabilities
- [ ] 6.3 Add examples to trial/ directory

