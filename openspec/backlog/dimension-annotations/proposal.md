# Dimension Annotations for SVG Rendering

## Why
Architectural floorplans typically include dimension annotations showing room sizes, wall lengths, heights, and distances. Currently, room dimensions are only shown as text inside rooms (e.g., "10 x 12"), but proper dimension lines with arrows/ticks would make the SVG output more professional and useful for actual planning.

## What Changes
- Add dimension lines along room edges with tick marks at ends
- Show numeric measurements above/beside dimension lines
- Support different annotation modes:
  - Room plan dimensions (width × depth)
  - Room/wall heights (shown as labels, e.g., "h: 3.5m")
  - Wall thickness annotations
  - Individual wall lengths
  - Overall floor dimensions (bounding box)
- Add render option to enable/disable annotations
- Consider DSL syntax for custom dimension annotations

## Visual Style

### Plan Dimensions
```
    ←——— 10 ———→
   ┌────────────┐
   │            │ ↑
   │  Office    │ │
   │  10 x 12   │ 12
   │  h: 3.5    │ │
   └────────────┘ ↓
```

### Height & Thickness Annotations
```
   ┌────────────┐
   │  Office    │  ← wall: 0.2
   │  h: 3.5m   │
   └────────────┘
        ↑
   floor: 0.15
```

## Annotation Types

| Type | Description | Example |
|------|-------------|---------|
| `plan` | Width × depth dimension lines | `←— 10 —→` along edges |
| `height` | Room/wall height label | `h: 3.5` inside room |
| `thickness` | Wall/floor thickness | `wall: 0.2` near walls |
| `elevation` | Room elevation from ground | `elev: +4.0` |

## Scope Options

### Minimal (v1)
- Room width/depth dimension lines on exterior edges
- Height label inside room (when non-default)
- Configurable via render option: `showDimensions: true`

### Extended (v2)
- Overall floor bounding box dimensions
- Gap/spacing dimensions between rooms
- Wall thickness annotations
- Floor thickness annotations
- Elevation annotations for split-level floors
- DSL syntax: `annotate Room1.width`, `annotate distance Room1 to Room2`

## Impact
- Affected specs: `rendering`
- Affected code: `language/src/diagrams/floorplans/renderer.ts`, new `dimension.ts` module
- No grammar changes needed for v1

