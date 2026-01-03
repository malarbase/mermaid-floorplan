## Context

Multi-story floorplans need vertical circulation (stairs, lifts, escalators). Currently, users create placeholder rooms with labels like "Stair+Lift" but these have no semantic meaning, no type-specific rendering, and no cross-floor relationships.

The grammar should support:
- Common stair shapes with appropriate defaults
- Custom/composable configurations for unusual layouts
- Cross-floor vertical connections
- Enough detail for both 2D plan symbols and 3D geometry

## Goals / Non-Goals

**Goals:**
- Express all common residential/commercial stair types
- Enable composable segment syntax for custom configurations
- Support dimensional parameters for code-compliant stairs
- Generate appropriate 2D symbols and 3D geometry
- Link circulation elements across floors

**Non-Goals:**
- Animated stair/lift simulation
- Structural engineering calculations
- Escalator step animation
- Lift cabin interior details

## Decisions

### Decision 1: Stairs as Floor Elements (not Rooms)

**Decision:** Introduce `Stair` and `Lift` as peer elements to `Room` within floors.

**Alternatives considered:**
1. ~~Extend Room type with stair/lift variants~~ - Muddies room semantics, walls don't make sense for stairs
2. ~~Top-level circulation cores spanning floors~~ - Major restructure, breaks floor-centric model
3. **New element types within floors** ✓ - Clean separation, can share positioning syntax

### Decision 2: Preset Shapes + Composable Segments

**Decision:** Provide named presets for common shapes, plus a `custom` option using flight/turn segments.

```
shape straight direction north           # Preset
shape L-shaped entry south turn left     # Preset
shape custom entry south [flight 5, turn right (4ft x 4ft), flight 5]  # Composable
```

**Rationale:**
- Presets are ergonomic for 80% of cases
- Composable syntax handles edge cases (double-L, tower stairs, etc.)
- Presets can be implemented as syntactic sugar over segments internally

### Decision 3: Stair Segment Model

**Decision:** A `custom` stair is a sequence of `flight` and `turn` segments, with optional wall alignment.

```
StairSegment = Flight | Turn
Flight = steps count + optional run length + optional wall alignment
Turn = direction (left/right) + angle (90°/180°) + landing OR winders
```

**Wall Alignment:** Flights can specify `along Room.wall` to align the stair run against a room's wall. This enables stairs that follow the perimeter of a room.

```
# Stair running along three walls of StairWell room
stair PerimeterStair shape custom entry south [
  flight 5 along StairWell.south,
  turn right landing (4ft x 4ft),
  flight 6 along StairWell.west,
  turn right landing (4ft x 4ft),
  flight 5 along StairWell.north
] rise 14ft width 3.5ft
```

**Alignment semantics:**
- `along Room.wall` positions the flight's outer edge against the specified wall
- The stair width extends inward from the wall
- Turn landings are placed at wall corners
- If no alignment specified, flights are positioned relative to the stair's anchor point

This covers:
- Double-L (flight, turn, flight, turn, flight)
- Tower stairs (flight, turn, flight, turn, flight, turn, flight)
- Perimeter stairs following room walls
- Any combination of landings vs winder treads

### Decision 4: Dimensional Parameters

**Decision:** Support these stair-specific dimensions:

| Parameter | Description | Default |
|-----------|-------------|---------|
| `rise` | Total vertical height | Required |
| `width` | Tread width | 3ft / 1m |
| `riser` | Individual riser height | 7" (auto-calc from rise) |
| `tread` | Individual tread depth | 11" |
| `nosing` | Tread overhang | 1" |
| `headroom` | Minimum clearance above treads | 80" (6'8") |

Auto-calculation: If `riser` not specified, calculate from `rise / steps` ensuring code compliance (max 7.75").

### Decision 4a: Per-Segment Width Override

**Decision:** Flight segments in custom stairs can override the stair's default width.

```
stair GrandStair shape custom entry south [
  flight 8 width 6ft,              # Wide ceremonial first flight
  turn right landing (6ft x 6ft),
  flight 6 width 4ft               # Narrower upper flight
] rise 12ft width 4ft              # Default width for unlabeled segments
```

**Rationale:** Grand staircases often have a wide lower flight that narrows at the top. This avoids needing separate stair definitions.

### Decision 4b: Stringer Style

**Decision:** Support `stringers` property to control riser rendering style.

| Style | Description | 3D Rendering |
|-------|-------------|--------------|
| `closed` (default) | Solid risers between treads | Riser meshes generated |
| `open` | Open risers (floating treads) | No riser meshes, visible stringers |
| `glass` | Glass/transparent risers | Translucent riser meshes |

```
stair ModernStair ... stringers open      # Floating treads look
stair TraditionalStair ... stringers closed
```

### Decision 4c: Building Code Compliance

**Decision:** Support optional `stair_code` config property for automatic validation.

```
config { stair_code: residential }   # IRC: max 7.75" riser, min 10" tread
config { stair_code: commercial }    # IBC: max 7" riser, min 11" tread
config { stair_code: none }          # No validation (default)
```

**Validation rules by code:**

| Code | Max Riser | Min Tread | Min Width | Min Headroom |
|------|-----------|-----------|-----------|--------------|
| `residential` (IRC) | 7.75" | 10" | 36" | 80" |
| `commercial` (IBC) | 7" | 11" | 44" | 80" |
| `ada` | 7" | 11" | 48" | 80" |

When `stair_code` is set, the validator emits warnings for non-compliant dimensions.

### Decision 5: Vertical Connections

**Decision:** Add top-level `vertical` statements linking elements across floors.

```
vertical GroundFloor.MainStair to FirstFloor.MainStair
vertical GroundFloor.Elevator to FirstFloor.Elevator to SecondFloor.Elevator
```

**Validation rules:**
- Connected elements should have matching (x, y) positions
- Connected elements should have compatible footprints
- Warn if floors are skipped in sequence

### Decision 6: 2D/3D Rendering Strategy

**2D SVG:**
- Parallel lines for treads
- Arrow showing climb direction
- Landing rectangles
- Standard symbols (spiral = concentric arcs, lift = boxed "E")

**3D Geometry:**
- Generate tread meshes (boxes)
- Generate riser meshes (vertical planes)
- Generate stringer meshes (side supports)
- Cut holes through floor slabs for lifts
- Handrail geometry (cylinder + newel posts)

### Decision 7: Shared 3D Rendering via floorplan-3d-core

**Decision:** Consolidate all 3D stair/lift geometry generation into `floorplan-3d-core` package, used by both the viewer and MCP server.

**Current Architecture (Problem):**
```
┌─────────────────────────────────────────────────────────────────┐
│                    floorplan-3d-core (shared)                    │
│  ┌──────────────┬──────────────┬──────────────┬──────────────┐  │
│  │scene-builder │stair-geometry│wall-geometry │floor-geometry│  │
│  │              │ (INCOMPLETE) │              │              │  │
│  └──────────────┴──────────────┴──────────────┴──────────────┘  │
└────────────────────────────────┬────────────────────────────────┘
                                 │
        ┌────────────────────────┼────────────────────────┐
        │                        │                        │
┌───────▼───────┐        ┌───────▼───────┐        ┌───────▼───────┐
│    viewer     │        │  mcp-server   │        │   (future)    │
│ stair-gen.ts  │        │ renderer3d.ts │        │               │
│ (COMPLETE ✓)  │        │ (NO stairs ✗) │        │               │
└───────────────┘        └───────────────┘        └───────────────┘
```

**Target Architecture:**
```
┌─────────────────────────────────────────────────────────────────┐
│                    floorplan-3d-core (shared)                    │
│  ┌──────────────┬──────────────┬──────────────┬──────────────┐  │
│  │scene-builder │stair-geometry│wall-geometry │floor-geometry│  │
│  │              │ (COMPLETE ✓) │              │              │  │
│  │              │ lift-geometry│              │              │  │
│  └──────────────┴──────────────┴──────────────┴──────────────┘  │
└────────────────────────────────┬────────────────────────────────┘
                                 │ (imports)
        ┌────────────────────────┼────────────────────────┐
        │                        │                        │
┌───────▼───────┐        ┌───────▼───────┐        ┌───────▼───────┐
│    viewer     │        │  mcp-server   │        │   (future)    │
│  (thin layer) │        │ renderer3d.ts │        │               │
│  uses core ✓  │        │  uses core ✓  │        │  uses core    │
└───────────────┘        └───────────────┘        └───────────────┘
```

**Rationale:**
1. Single source of truth for stair geometry (DRY)
2. Both viewer and MCP render identically
3. Easier testing—test core once
4. Future consumers (CLI, API) get stairs for free

**Migration steps:**
1. Move viewer's complete `stair-generator.ts` → `floorplan-3d-core/src/stair-geometry.ts`
2. Add `lift-geometry.ts` to core
3. Update `scene-builder.ts` to call new generators
4. Refactor viewer to import from core
5. Update MCP server's `renderer3d.ts` to use core

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Grammar complexity | Presets handle common cases simply; custom is opt-in |
| Rendering effort | Start with 2D symbols only, 3D in follow-up |
| Building code variations | Use conservative US residential defaults; make overridable |
| Spiral stair geometry | Complex math for 3D; can simplify to cylinder placeholder initially |
| 3D code duplication | Consolidate into `floorplan-3d-core` (Decision 7) |

## Open Questions

1. Should handrail be a separate element or stair property? → **Property** (simpler)
2. Support escalators in v1? → **Yes**, as a stair variant with `escalator` type
3. How to handle lift doors on specific floors? → Add `doors` property with floor references

