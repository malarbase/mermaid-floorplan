# Add 3D PNG Rendering to MCP Server

## Why

The MCP server currently only renders floorplans as 2D PNG images (top-down view). Users need a way to visualize floorplans in 3D from within AI assistants to better understand spatial relationships, multi-floor layouts, and vertical elements like stairs and lifts. A 3D rendering capability would enable LLMs to analyze architectural designs with depth perception and provide more contextual feedback.

## What Changes

- Add a new `format: "3d-png"` option to the existing `render_floorplan` MCP tool
- Implement headless 3D rendering using Three.js with node-gl (headless WebGL context)
- Support configurable camera perspectives:
  - **Isometric view** (default): Fixed orthographic camera at 30° angle
  - **Perspective view**: Configurable camera position, target (look-at), and field-of-view
- Reuse existing JSON export pipeline (`convertFloorplanToJson`) for geometry data
- Render 3D elements: floors, walls with door/window cutouts, stairs, lifts
- Apply materials from style definitions (colors, textures, PBR properties)
- Export as PNG buffer via headless rendering
- Support all existing annotation options (`showArea`, `showDimensions`, `showFloorSummary`)
- Add CLI script `scripts/generate-3d-images.ts` for command-line 3D rendering
- Add Makefile targets (`export-3d`, `export-3d-perspective`) for easy invocation

## Impact

- **Affected specs**: `mcp-server` (new requirements)
- **Affected code**:
  - `mcp-server/src/tools/render.ts` - Add 3D format branch in tool handler
  - `mcp-server/src/utils/renderer3d.ts` - New module for 3D rendering (scene builder, camera setup, headless rendering)
  - `mcp-server/package.json` - Add dependencies: `three`, `gl` (headless-gl), `pngjs`
  - `scripts/generate-3d-images.ts` - New CLI script for 3D rendering
  - `Makefile` - Add `export-3d` and `export-3d-perspective` targets
- **Dependencies**: New external packages for 3D rendering (Three.js, headless GL context)
- **Backward compatibility**: Non-breaking. Existing 2D rendering (`format: "png"` or `"svg"`) remains unchanged. Default behavior unchanged.

