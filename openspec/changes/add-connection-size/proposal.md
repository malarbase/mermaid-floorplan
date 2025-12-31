## Why

Connections currently lack size specification, making it impossible to:
1. Create full-height openings (archways that extend to the ceiling)
2. Specify custom door/window dimensions per connection
3. Override global config defaults for individual connections

Additionally, config uses separate `door_width`/`door_height` and `window_width`/`window_height` properties instead of a unified size specification, which is inconsistent with how `WallSpecification` already handles size via `Dimension` type.

## What Changes

- Add `size` attribute to `Connection` grammar using existing `Dimension` type
- Support `full` keyword for height to indicate floor-to-ceiling openings
- Add `door_size` and `window_size` config properties using `Dimension` type
- Deprecate (but keep for backward compatibility) `door_width`/`door_height` and `window_width`/`window_height`
- Update JSON export and 3D viewer to respect connection-level size overrides

## Impact

- Affected specs: `dsl-grammar`
- Affected code:
  - `language/src/diagrams/floorplans/floorplans.langium` - Grammar changes
  - `language/src/diagrams/floorplans/json-converter.ts` - Add size to JsonConnection
  - `viewer/src/types.ts` - Add size fields to JsonConnection
  - `viewer/src/wall-generator.ts` - Respect connection size
  - `language/src/diagrams/floorplans/connection.ts` - SVG rendering size support
  - `language/src/diagrams/floorplans/variable-resolver.ts` - Config size resolution

## Examples

### Connection with custom size
```floorplan
# Specify exact door dimensions
connect LivingRoom.bottom to Kitchen.top door at 50% size (3ft x 7ft)

# Full-height opening (archway)
connect LivingRoom.bottom to Passage.top opening at 30% size (4ft x full)

# Custom width, default height
connect Bedroom.left to Closet.right door at 50% size (2.5ft x 7ft)
```

### Config with unified size
```floorplan
floor MainFloor {
  config { 
    default_unit: ft,
    door_size: (3 x 7),       # width x height
    window_size: (4 x 3)      # width x height
  }
  # ... rooms
}
```

