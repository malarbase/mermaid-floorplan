# Tasks: Add MCP Annotation & Analysis Tools

## 1. New `analyze_floorplan` Tool

- [x] 1.1 Create `mcp-server/src/tools/analyze.ts` module
- [x] 1.2 Define `AnalyzeInputSchema` with `dsl` and optional `areaUnit` parameters
- [x] 1.3 Implement `registerAnalyzeTool()` function
- [x] 1.4 Parse DSL and compute metrics using `convertFloorplanToJson()` from floorplans-language
- [x] 1.5 Return structured response with summary, floors, and rooms metrics
- [x] 1.6 Register tool in `mcp-server/src/tools/index.ts`

## 2. Render Tool Schema Updates

- [x] 2.1 Add `showArea` boolean parameter to `RenderInputSchema`
- [x] 2.2 Add `showDimensions` boolean parameter to `RenderInputSchema`
- [x] 2.3 Add `showFloorSummary` boolean parameter to `RenderInputSchema`
- [x] 2.4 Add `areaUnit` enum parameter ('sqft' | 'sqm') to `RenderInputSchema`
- [x] 2.5 Add `lengthUnit` enum parameter ('m' | 'ft' | 'cm' | 'in' | 'mm') to `RenderInputSchema`

## 3. Renderer Integration

- [x] 3.1 Update `generateSvg` in `mcp-server/src/utils/renderer.ts` to accept annotation options
- [x] 3.2 Pass annotation options from `render_floorplan` handler to `generateSvg`
- [x] 3.3 Map MCP parameters to `RenderOptions` interface from `floorplans-language`

## 4. Testing

- [x] 4.1 Test `analyze_floorplan` returns correct room count and areas
- [x] 4.2 Test `analyze_floorplan` with `areaUnit: 'sqm'` displays sqm unit
- [x] 4.3 Test render with `showArea: true` returns SVG with area labels
- [x] 4.4 Test render with `showDimensions: true` returns SVG with dimension lines
- [x] 4.5 Test render with `showFloorSummary: true` returns SVG with summary panel
- [x] 4.6 Manual test with Cursor/Claude to verify tools work end-to-end
