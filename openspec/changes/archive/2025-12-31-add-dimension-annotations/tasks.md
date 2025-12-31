# Tasks: Add Dimension & Metrics Annotations

## Phase 1: Metrics Foundation

- [x] 1.1 Create `language/src/diagrams/floorplans/metrics.ts` module
- [x] 1.2 Implement `computeRoomMetrics()` (area, volume)
- [x] 1.3 Implement `computeFloorMetrics()` (bounding box, net area, efficiency)
- [x] 1.4 Implement `computeFloorplanMetrics()` (summary totals)
- [x] 1.5 Extend `JsonRoom` type with `area` and `volume` fields
- [x] 1.6 Extend `JsonFloor` type with `metrics` field
- [x] 1.7 Extend `JsonExport` type with `summary` field
- [x] 1.8 Update `json-converter.ts` to compute and include metrics
- [x] 1.9 Update MCP server to include metrics in response
- [x] 1.10 Update CLI scripts to print summary table

## Phase 2: SVG Area Annotations

- [x] 2.1 Add `showArea` render option
- [x] 2.2 Add `showFloorSummary` render option
- [x] 2.3 Add `areaUnit` render option ('sqft' | 'sqm')
- [x] 2.4 Update room rendering to show area below size text
- [x] 2.5 Implement floor summary panel component
- [x] 2.6 Position summary panel below floor layout

## Phase 3: Linear Dimension Lines

- [x] 3.1 Create `language/src/diagrams/floorplans/dimension.ts` module
- [x] 3.2 Add `showDimensions` render option
- [x] 3.3 Add `dimensionTypes` render option
- [x] 3.4 Implement dimension line SVG rendering (arrows/ticks, labels)
- [x] 3.5 Render room width dimension lines on exterior edges
- [x] 3.6 Render room depth dimension lines on exterior edges
- [x] 3.7 Render height labels inside rooms (when non-default)

## Phase 4: Extended Dimensions (Future)

- [ ] 4.1 Floor bounding box dimension lines
- [ ] 4.2 Gap/spacing dimensions between rooms
- [ ] 4.3 Wall thickness annotations
- [ ] 4.4 Floor thickness annotations
- [ ] 4.5 Elevation annotations for split-level floors
- [ ] 4.6 DSL syntax for custom annotations

## Testing

- [x] T.1 Unit tests for metrics computation
- [x] T.2 Snapshot tests for SVG area annotations
- [x] T.3 Snapshot tests for dimension lines
- [x] T.4 Manual testing with complex floorplans
