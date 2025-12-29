# Connection Overlap Validation

## Why

The DSL currently allows defining multiple connections that physically overlap at the same wall location, resulting in visual artifacts where multiple doors are rendered at the same position. For example, when two rooms share a wall, connections can be defined from both sides (RoomA.right to RoomB.left and RoomB.left to RoomA.right), or multiple connections can be specified at the same position percentage on a wall. This creates confusing, incorrect renderings.

## What Changes

- Add validation to detect overlapping connections on the same wall segment
- Report errors when connections would render doors at physically overlapping positions
- Validate that bidirectional connections (A→B and B→A on shared walls) are not both defined
- Ensure each wall segment position is used by at most one connection
- **BREAKING**: Previously valid floorplans with overlapping connections will now fail validation

## Impact

- **Affected specs:** dsl-grammar
- **Affected code:** 
  - `language/src/floorplans-validator.ts` - Add overlap detection logic
  - `language/src/diagrams/floorplans/connection.ts` - May need helper functions for wall overlap detection
  - `language/test/floorplan-parser.test.ts` - Add validation tests
- **User impact:** Users will receive clear error messages when they define overlapping connections, preventing confusing visual output

