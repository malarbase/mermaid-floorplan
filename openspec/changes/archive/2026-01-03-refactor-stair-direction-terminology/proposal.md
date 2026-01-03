## Why

The current DSL uses compass directions (`north/south/east/west`) for stair orientation while walls use view-relative terms (`top/bottom/left/right`). This is inconsistent and semantically misleading—compass terms imply absolute orientation, but they actually map to the same view-relative directions as walls. Users may expect a "north-facing" stair to remain consistent if a building is rotated on a plot, but the current implementation doesn't support this.

## What Changes

- **BREAKING**: Change stair `direction` keyword from `direction north` to `toward top`
- **BREAKING**: Change stair `entry` keyword from `entry south` to `from bottom`
- **BREAKING**: Change lift `doors` specification from `doors (north, south)` to `doors (top, bottom)`
- Introduce consistent prepositions (`toward`/`from`) to distinguish movement direction from wall position
- Update grammar, types, converters, renderers, validators, and examples

## Impact

- Affected specs: `dsl-grammar`
- Affected code:
  - `language/src/diagrams/floorplans/floorplans.langium` - Grammar definition
  - `language/src/diagrams/floorplans/json-converter.ts` - Direction mapping
  - `language/src/diagrams/floorplans/stair-renderer.ts` - SVG rendering
  - `floorplan-3d-core/src/types.ts` - Type definitions
  - `floorplan-3d-core/src/stair-geometry.ts` - 3D rendering
  - `language/src/floorplans-validator.ts` - Validation logic
  - `examples/StairsAndLifts.floorplan` - Example files
  - `mcp-server/` - Tool schemas

## Rationale

| Current | Proposed | Semantic Clarity |
|---------|----------|------------------|
| `direction north` | `toward top` | Climb direction with preposition |
| `entry south` | `from bottom` | Entry point with preposition |
| `doors (south, west)` | `doors (bottom, left)` | Door positions match wall terms |

This creates a self-documenting API:
- Walls: `top:` means "the wall at the top position"
- Stairs: `toward top` means "climbs toward the top of the view"
- Entry: `from bottom` means "enter from the bottom of the view"

