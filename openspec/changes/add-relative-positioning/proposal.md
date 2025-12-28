# Add Relative Positioning Helpers

## Why

Currently, users must manually calculate and specify absolute coordinates for every room in the floorplan DSL. When rooms are adjacent, users need to compute positions based on neighboring room dimensions (e.g., if `Foyer` is 6 units wide at `(0,0)`, the adjacent `LivingRoom` must be at `(6,0)`). This is error-prone, tedious, and breaks when room sizes change—requiring manual recalculation of all downstream positions.

Relative positioning helpers (`right-of`, `below`, etc.) would let users express spatial relationships naturally while the system computes explicit coordinates automatically.

## What Changes

- **Grammar extension**: Add optional relative positioning clause to Room rule
- **Position keywords**: `right-of`, `left-of`, `above`, `below` (single-direction)
- **Diagonal combinations**: `above-right-of`, `below-left-of`, etc.
- **Gap specification**: Optional `gap N` clause for spacing between rooms (default: 0)
- **Alignment specification**: Optional `align top|bottom|left|right|center` for edge alignment control
- **Validator**: Resolve relative positions to absolute coordinates during validation phase
- **Error handling**: Clear errors for missing references, circular dependencies, overlaps

## Proposed Syntax

```
# Basic relative positioning (flush adjacent)
room Foyer at (0,0) size (6 x 6) walls [...]
room LivingRoom size (14 x 16) walls [...] right-of Foyer

# With gap (1 unit spacing)
room Kitchen size (10 x 8) walls [...] below LivingRoom gap 2

# With alignment (align top edges)
room Office size (10 x 10) walls [...] right-of LivingRoom align top

# Diagonal positioning
room Bedroom size (12 x 12) walls [...] below-right-of LivingRoom gap 1

# Combined: gap + alignment
room Bathroom size (5 x 4) walls [...] right-of Bedroom gap 0 align bottom
```

**Resolution rules:**
- `right-of A`: Place this room's left edge at A's right edge
- `below A`: Place this room's top edge at A's bottom edge
- `align top`: Align top edges (default for `right-of`/`left-of`)
- `align left`: Align left edges (default for `above`/`below`)
- `gap N`: Add N units between rooms

## Impact

- **Grammar**: Modify `Room` rule in `floorplans.langium`
- **AST**: Add optional `RelativePosition` to Room type
- **Validator**: New validation pass to resolve positions before rendering
- **MCP Server**: `modify_floorplan` may need new operations for relative moves

## Not In Scope

- **Full constraint solver**: No automatic layout optimization or packing
- **Cyclic dependencies**: Will error, not attempt to resolve
- **Multi-room alignment groups**: Future enhancement

