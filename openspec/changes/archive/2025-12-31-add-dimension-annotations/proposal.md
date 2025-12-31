# Dimension & Metrics Annotations

## Why
Architectural floorplans typically include dimension annotations showing room sizes, wall lengths, heights, and distances. Additionally, area calculations (room area, floor area, gross floor area) are essential for planning, compliance, and cost estimation. Currently:
- Room dimensions are only shown as text inside rooms (e.g., "10 x 12")
- No area calculations are computed or displayed
- No summary metrics are provided for floors or the overall floorplan

Proper dimension lines with arrows/ticks, plus computed area metrics, would make the output more professional and useful for actual planning.

## What Changes

### Linear Dimensions
- Add dimension lines along room edges with tick marks at ends
- Show numeric measurements above/beside dimension lines
- Support different annotation modes:
  - Room plan dimensions (width × depth)
  - Room/wall heights (shown as labels, e.g., "h: 3.5m")
  - Wall thickness annotations
  - Individual wall lengths
  - Overall floor dimensions (bounding box)

### Area & Metrics
- Compute and display room areas (width × height)
- Compute floor metrics (net area, bounding box area, efficiency)
- Compute floorplan summary (gross floor area, room count)
- Surface metrics across all output formats (SVG, JSON, CLI, MCP, 3D)

## Phased Implementation

### Phase 1: Metrics Foundation
- Create `metrics.ts` module with `computeFloorplanMetrics()`
- Add `area` field to `JsonRoom`
- Add `metrics` field to `JsonFloor` and `JsonExport.summary`
- Update CLI scripts to print summary table
- Update MCP server to include metrics in response

### Phase 2: SVG Area Annotations
- Show room area inside rooms (below size text)
- Add floor summary panel (optional)
- Configurable via: `showArea: true`, `showFloorSummary: true`

### Phase 3: Linear Dimension Lines
- Room width/depth dimension lines on exterior edges
- Height label inside room (when non-default)
- Configurable via: `showDimensions: true`

### Phase 4: Extended Dimensions (Future)
- Overall floor bounding box dimensions
- Gap/spacing dimensions between rooms
- Wall thickness annotations
- Floor thickness annotations
- Elevation annotations for split-level floors
- DSL syntax: `annotate Room1.width`, `annotate distance Room1 to Room2`

## Impact
- Affected specs: `rendering`
- Affected code:
  - NEW: `language/src/diagrams/floorplans/metrics.ts`
  - MODIFY: `language/src/diagrams/floorplans/json-converter.ts`
  - MODIFY: `language/src/diagrams/floorplans/renderer.ts`
  - MODIFY: `language/src/diagrams/floorplans/room.ts`
  - NEW: `language/src/diagrams/floorplans/dimension.ts` (Phase 3)
  - MODIFY: `mcp-server/src/tools/render.ts`
  - MODIFY: `scripts/export-json.ts`
  - MODIFY: `scripts/generate-images.ts`
- No grammar changes needed for Phase 1-3
- Grammar extension possible in Phase 4 for custom annotations

