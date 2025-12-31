## Why

The MCP server currently lacks two capabilities that would significantly improve AI assistant workflows:

1. **No metrics analysis tool** - LLMs cannot query floorplan metrics (areas, dimensions, efficiency) without rendering an image. This is inefficient when the assistant just needs numerical data for reasoning or comparison.

2. **No visual annotations** - The `render_floorplan` tool renders plain floorplans without dimension lines or area labels. The language package now supports rich annotations but they're not exposed through MCP.

**Use Case: Iterative Design Optimization**
```
1. analyze_floorplan → "Efficiency is 60%, net area is 2400 sqft"
2. LLM reasons: "Low efficiency, let me optimize"
3. modify_floorplan → resize rooms, remove gaps
4. analyze_floorplan → "Efficiency now 78%"
5. render_floorplan with annotations → show final result
```

## What Changes

### New Tool: `analyze_floorplan`
A lightweight tool for extracting structured metrics without rendering:
- **Input**: DSL code, optional `areaUnit` ('sqft' | 'sqm')
- **Output**: Structured JSON with:
  - `summary`: floorCount, totalRooms, grossFloorArea
  - `floors[]`: per-floor metrics (netArea, boundingBox, efficiency, roomCount)
  - `rooms[]`: per-room metrics (area, dimensions, volume)

### Enhanced: `render_floorplan` Annotations
Add optional parameters to existing render tool:
- `showArea?: boolean` - Display room area inside each room
- `showDimensions?: boolean` - Display dimension lines on room edges
- `showFloorSummary?: boolean` - Display floor summary panel
- `areaUnit?: 'sqft' | 'sqm'` - Unit for area display (default: sqft)
- `lengthUnit?: 'm' | 'ft' | 'cm' | 'in' | 'mm'` - Unit for dimension labels (default: ft)

## Impact

- Affected specs: `mcp-server`
- Affected code: 
  - `mcp-server/src/tools/analyze.ts` (new file)
  - `mcp-server/src/tools/render.ts`
  - `mcp-server/src/tools/index.ts`
  - `mcp-server/src/utils/renderer.ts`
- No breaking changes - new tool, all render parameters are optional
- No new dependencies (reuses `floorplans-language` metrics)

