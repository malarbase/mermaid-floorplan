# Design: Relative Positioning Helpers

## Context

The floorplan DSL currently requires explicit `at (x, y)` coordinates for all rooms. This works but creates maintenance burden when:
1. Room sizes change (all downstream positions need recalculation)
2. New rooms are inserted between existing ones
3. Users want to express relationships ("Kitchen next to Dining") rather than coordinates

Research into similar systems (TikZ, QML Anchors, CSS Anchor Positioning) confirms that relative positioning helpers are a well-established pattern for declarative layout DSLs.

## Goals

- Allow expressing room adjacency relationships naturally
- Maintain explicit coordinates as the source of truth (expand helpers, don't replace)
- Keep rendering pipeline unchanged (operates on resolved coordinates)
- Provide clear errors for invalid configurations

## Non-Goals

- Full constraint-based layout (NP-hard, as documented in roadmap)
- Automatic room packing or optimization
- Bi-directional constraints ("A right of B AND B left of A")

## Decision: Expansion During Validation

**Decision:** Relative positions expand to absolute coordinates during the validation phase, before rendering.

**Alternatives considered:**
1. Expand during parsing → Rejected: AST should reflect source syntax
2. Expand during rendering → Rejected: Complicates renderer, duplicates logic
3. Keep relative in AST, compute on access → Rejected: Non-deterministic, caching issues

**Rationale:** Validation phase is the right place because:
- Parser produces faithful AST representation of source
- Validator already performs cross-reference checks (room name resolution)
- Resolved positions can be cached in AST or separate map
- Renderer receives fully-resolved coordinates, stays simple

## Decision: Position Resolution Order

**Decision:** Resolve positions in dependency order using topological sort.

```typescript
// Pseudo-algorithm
function resolvePositions(rooms: Room[]): void {
  const resolved = new Set<string>();
  const pending = new Map(rooms.map(r => [r.name, r]));
  
  while (pending.size > 0) {
    let progress = false;
    for (const [name, room] of pending) {
      if (room.position) {
        // Explicit position - already resolved
        resolved.add(name);
        pending.delete(name);
        progress = true;
      } else if (room.relativePosition) {
        const ref = room.relativePosition.reference;
        if (resolved.has(ref)) {
          // Reference is resolved - compute this room's position
          computeAbsolutePosition(room, pending.get(ref));
          resolved.add(name);
          pending.delete(name);
          progress = true;
        }
      }
    }
    if (!progress && pending.size > 0) {
      // Circular dependency or missing reference
      throw new ValidationError('Cannot resolve positions: circular or missing reference');
    }
  }
}
```

## Decision: Default Alignment Behavior

**Decision:** Use intuitive defaults based on direction:

| Direction | Default X alignment | Default Y alignment |
|-----------|--------------------|--------------------|
| `right-of` | Place at reference's right edge | Align top edges |
| `left-of` | Place at reference's left edge - width | Align top edges |
| `below` | Align left edges | Place at reference's bottom edge |
| `above` | Align left edges | Place at reference's top edge - height |

Diagonal combinations (`below-right-of`, etc.) combine both behaviors.

**Rationale:** These defaults match user expectations from architectural drawings where rooms flow left-to-right and top-to-bottom.

## Decision: Gap Implementation

**Decision:** Gap is added between the edges, not as an offset.

```
# gap 2 means 2 units between rooms, not offset from edge
room B size (5 x 5) right-of A gap 2

# If A is at (0,0) with size (10 x 10):
# B.x = A.x + A.width + gap = 0 + 10 + 2 = 12
# B.y = A.y = 0 (top-aligned by default)
```

## Decision: Overlap Detection

**Decision:** Warn on overlap during validation, don't error by default.

**Rationale:** 
- Overlaps may be intentional (sub-rooms, decorative elements)
- Users can enable strict mode to error on overlaps
- Warning provides feedback without blocking iteration

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Circular dependencies | Topological sort detects cycles, clear error message |
| Performance with many rooms | O(n²) worst case acceptable for typical floorplans (<100 rooms) |
| User confusion about resolved positions | MCP `render_floorplan` returns room metadata with resolved coordinates |
| Grammar complexity | Keep syntax minimal, align with existing patterns |

## Migration Plan

- No migration needed - new optional syntax
- Existing floorplans with explicit coordinates work unchanged
- Users can incrementally adopt relative positioning

## Open Questions

1. **Should relative positioning be allowed in sub-rooms?** 
   - Initial thought: Yes, relative to parent room or siblings
   - May defer to future enhancement

2. **Should we show resolved coordinates in error messages?**
   - Would help debugging but adds complexity
   - Defer to implementation phase

