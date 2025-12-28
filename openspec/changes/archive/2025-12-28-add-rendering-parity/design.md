## Context

The floorplan grammar supports features that aren't rendered:
- Connections between rooms (`connect Room1.wall to Room2.wall door`)
- Double-doors (`double-door` type)
- Swing direction (`swing: left|right`)
- Door position (`at 50%`)
- Multiple floors (`floor f1 {...} floor f2 {...}`)

Users can write valid DSL that parses successfully but produces incomplete visual output.

## Goals / Non-Goals

**Goals:**
- Render all grammar-supported features to SVG
- Maintain backward compatibility (existing floorplans render identically)
- Keep rendering string-based (not D3) for MCP/server compatibility

**Non-Goals:**
- Interactive door manipulation in web UI
- Animated door opening
- 3D rendering
- Staircase/elevator connections between floors

## Decisions

### Connection Rendering Strategy

**Decision:** Render connections as door symbols placed at the calculated intersection point between rooms.

**Alternatives considered:**
1. ~~Draw lines between rooms~~ - Doesn't represent doors accurately
2. ~~Modify wall rendering~~ - Connections may span non-adjacent rooms
3. **Place door at intersection** ✓ - Most accurate, works with existing wall rendering

### Multi-Floor Layout

**Decision:** Default to rendering first floor only (backward compatible). Add options for specific floor or all floors.

**Options for all-floors rendering:**
- `stacked` - Floors rendered vertically, floor 1 at bottom
- `sideBySide` - Floors rendered horizontally with labels

### Double-Door Geometry

**Decision:** Render as two mirrored single doors with a center gap.

```
    ╭──╮  ╭──╮
    │  │  │  │
    │  │  │  │
────┴──┘  └──┴────
```

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Connection calculation complexity for non-adjacent rooms | Start with adjacent rooms only, error for non-adjacent |
| SVG size increase with many connections | Connections are small elements, acceptable |
| Breaking change if floor selection changes default | Keep default as first floor |

## Open Questions

1. Should connections automatically remove the wall segment they replace, or overlay on top?
   - **Proposed:** Overlay on top (simpler, walls still drawn)

2. How to handle connections when rooms don't share a wall?
   - **Proposed:** Return validation error, require rooms to be adjacent

3. Should multi-floor rendering include floor labels by default?
   - **Proposed:** Yes, add floor ID as text label above each floor

