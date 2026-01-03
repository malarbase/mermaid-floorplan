# Implementation Tasks

## 1. Setup and Dependencies
- [ ] 1.1 Add dependencies to `mcp-server/package.json`: `three`, `gl`, `pngjs`, `@types/three`
- [ ] 1.2 Verify Node.js 20+ compatibility with headless-gl
- [ ] 1.3 Create `mcp-server/src/utils/renderer3d.ts` module skeleton

## 2. Scene Building
- [ ] 2.1 Implement `buildFloorplanScene(jsonData, options)` function
- [ ] 2.2 Create floor slab geometry from `JsonFloor` data
- [ ] 2.3 Create wall geometries from `JsonRoom` data (extrude room outline to height)
- [ ] 2.4 Add basic stair geometry (box placeholder for MVP)
- [ ] 2.5 Add basic lift geometry (box with door indicators)
- [ ] 2.6 Position multi-floor geometry with vertical offsets

## 3. Material System
- [ ] 3.1 Implement `createMaterial(styleDefinition, materialType)` helper
- [ ] 3.2 Apply floor materials from style `floor_color` and `floor_texture`
- [ ] 3.3 Apply wall materials from style `wall_color` and `wall_texture`
- [ ] 3.4 Set PBR properties (`roughness`, `metalness`) from style
- [ ] 3.5 Handle fallback to default colors when style is undefined

## 4. Camera and Lighting
- [ ] 4.1 Implement `setupCamera(options, sceneBounds)` for isometric view
- [ ] 4.2 Add perspective camera mode with `cameraPosition`, `cameraTarget`, `fov` options
- [ ] 4.3 Implement `computeSceneBounds(scene)` to auto-frame camera
- [ ] 4.4 Implement `setupLighting(scene, options)` with ambient + directional light

## 5. Headless Rendering
- [ ] 5.1 Implement `createHeadlessRenderer(width, height)` using `gl` package
- [ ] 5.2 Implement `render3DToPng(jsonData, options)` main entry point
- [ ] 5.3 Extract pixel data from WebGL framebuffer
- [ ] 5.4 Encode pixels as PNG using `pngjs`
- [ ] 5.5 Handle rendering errors gracefully (fallback message)

## 6. MCP Tool Integration
- [ ] 6.1 Update `RenderInputSchema` in `mcp-server/src/tools/render.ts` to include 3D options
- [ ] 6.2 Add `format: "3d-png"` enum value
- [ ] 6.3 Add 3D-specific schema fields: `projection`, `cameraPosition`, `cameraTarget`, `fov`
- [ ] 6.4 Add format branching in `render_floorplan` tool handler
- [ ] 6.5 Call `render3DToPng` when `format === "3d-png"`
- [ ] 6.6 Return PNG buffer as base64 in MCP response

## 7. CLI Script and Makefile Targets
- [ ] 7.1 Create `scripts/generate-3d-images.ts` CLI script
- [ ] 7.2 Implement command-line argument parsing (projection, camera, dimensions)
- [ ] 7.3 Import and call `render3DToPng` from MCP server package
- [ ] 7.4 Write PNG output to file system
- [ ] 7.5 Add `export-3d` target to Makefile (isometric view)
- [ ] 7.6 Add `export-3d-perspective` target to Makefile with camera parameters
- [ ] 7.7 Update Makefile help text to document 3D rendering targets
- [ ] 7.8 Test CLI script with sample floorplan files

## 8. Testing
- [ ] 8.1 Write unit test for `buildFloorplanScene` with simple floorplan
- [ ] 8.2 Write unit test for camera setup (isometric and perspective)
- [ ] 8.3 Write integration test for `render3DToPng` end-to-end
- [ ] 8.4 Test with multi-floor floorplan
- [ ] 8.5 Test with styled rooms (colors and textures)
- [ ] 8.6 Test error handling for invalid JSON data
- [ ] 8.7 Test CLI script with various command-line options
- [ ] 8.8 Test Makefile targets with sample floorplans

## 9. Documentation
- [ ] 9.1 Update `mcp-server/README.md` with 3D rendering usage examples
- [ ] 9.2 Document camera options and presets
- [ ] 9.3 Document required dependencies and platform requirements
- [ ] 9.4 Add example floorplan with 3D rendering command
- [ ] 9.5 Update MCP server tool description to mention 3D capability
- [ ] 9.6 Document CLI script usage in main README.md
- [ ] 9.7 Add Makefile target examples to README.md
- [ ] 9.8 Document difference between 2D and 3D rendering workflows

## 10. Validation
- [ ] 10.1 Test on macOS with Node.js 20+
- [ ] 10.2 Test on Linux with Node.js 20+
- [ ] 10.3 Verify PNG output is viewable by GPT-4o and Claude 3.5 Sonnet
- [ ] 10.4 Verify backward compatibility: existing 2D rendering unchanged
- [ ] 10.5 Test CLI script on both macOS and Linux
- [ ] 10.6 Verify Makefile targets work correctly
- [ ] 10.7 Run `openspec validate add-mcp-3d-rendering --strict` and fix issues

