# Implementation Tasks

## 1. Create Shared Package (`floorplan-3d-core`)
- [x] 1.1 Create `floorplan-3d-core/` directory structure
- [x] 1.2 Create `floorplan-3d-core/package.json` with `three` as peer dependency
- [x] 1.3 Create `floorplan-3d-core/tsconfig.json` (CommonJS + ESM dual build)
- [x] 1.4 Extract `types.ts` from `viewer/src/types.ts` (JSON types)
- [x] 1.5 Extract `constants.ts` from `viewer/src/constants.ts` (DIMENSIONS, COLORS, themes)
- [x] 1.6 Extract `materials.ts` from `viewer/src/materials.ts` (MaterialFactory, no textures)
- [x] 1.7 Extract `stair-geometry.ts` from `viewer/src/stair-generator.ts` (StairGenerator)
- [x] 1.8 Create `floor-geometry.ts` for floor slab generation
- [x] 1.9 Create `wall-geometry.ts` for simplified wall geometry (no CSG)
- [x] 1.10 Create `render-context.ts` with `RenderContext` interface (platform abstraction)
- [x] 1.11 Create `scene-builder.ts` for platform-agnostic scene construction
- [x] 1.12 Create `camera-utils.ts` for camera setup (isometric/perspective)
- [x] 1.13 Create `lighting-utils.ts` for lighting setup
- [x] 1.14 Create `index.ts` with public exports
- [x] 1.15 Add `floorplan-3d-core` to root `package.json` workspaces
- [x] 1.16 Build and verify `floorplan-3d-core` compiles

## 2. Refactor Viewer to Use Shared Package
- [x] 2.1 Add `floorplan-3d-core` dependency to `viewer/package.json`
- [x] 2.2 (N/A) Browser renderer kept in viewer, shared package provides scene building
- [x] 2.3 Update `viewer/src/main.ts` to use types/constants/materials from shared package
- [x] 2.4 Update `viewer/src/` imports to use `floorplan-3d-core` (types, constants, materials, StairGenerator)
- [x] 2.5 Convert viewer local files (types.ts, constants.ts, materials.ts, stair-generator.ts) to re-export from shared package
- [x] 2.6 Verify viewer still works with shared package (build succeeded)
- [x] 2.7 Run existing viewer tests to ensure no regressions (all 82 tests pass)

## 3. MCP Server Setup and Dependencies
- [x] 3.1 Add dependencies to `mcp-server/package.json`: `floorplan-3d-core`, `three`, `puppeteer`, `@types/three`
- [x] 3.2 Use Puppeteer with headless Chromium for full WebGL2 support (instead of headless-gl)
- [x] 3.3 Create `mcp-server/src/utils/renderer3d.ts` module
- [x] 3.4 Create `mcp-server/src/utils/puppeteer-renderer.ts` implementing browser-based rendering

## 4. Scene Building (In Shared Package)
- [x] 4.1 Implement `buildFloorplanScene(jsonData, options)` in `floorplan-3d-core/src/scene-builder.ts`
- [x] 4.2 Integrate floor slab geometry from `floor-geometry.ts`
- [x] 4.3 Integrate wall geometry from `wall-geometry.ts`
- [x] 4.4 Integrate `StairGenerator` from `stair-geometry.ts`
- [x] 4.5 Add lift geometry generation
- [x] 4.6 Position multi-floor geometry with vertical offsets
- [x] 4.7 Export `renderScene(scene, camera, context)` for platform-agnostic rendering

## 5. Material System (Using Shared Package)
- [x] 5.1 Use `MaterialFactory` from `floorplan-3d-core`
- [x] 5.2 Apply floor materials from style `floor_color`
- [x] 5.3 Apply wall materials from style `wall_color`
- [x] 5.4 Set PBR properties (`roughness`, `metalness`) from style
- [x] 5.5 Handle fallback to default colors when style is undefined

## 6. Camera and Lighting (In Shared Package)
- [x] 6.1 Implement `setupCamera(options, sceneBounds)` in `floorplan-3d-core/src/camera-utils.ts`
- [x] 6.2 Add isometric camera preset (orthographic, 30° angle)
- [x] 6.3 Add perspective camera mode with `cameraPosition`, `cameraTarget`, `fov` options
- [x] 6.4 Implement `computeSceneBounds(scene)` to auto-frame camera
- [x] 6.5 Implement `setupLighting(scene, options)` in `floorplan-3d-core/src/lighting-utils.ts`
- [x] 6.6 Add ambient + directional light with shadow support

## 7. Headless Rendering (Puppeteer-Based)
- [x] 7.1 Create `mcp-server/src/utils/puppeteer-renderer.ts` using headless Chromium
- [x] 7.2 Implement `renderWithPuppeteer(jsonData, options)` using browser-based Three.js
- [x] 7.3 Load Three.js from node_modules and inject into page
- [x] 7.4 Embed rendering code directly in page context
- [x] 7.5 Use `page.screenshot()` to capture canvas as PNG buffer
- [x] 7.6 Handle browser lifecycle with shared browser instance
- [x] 7.7 Handle rendering errors gracefully
- [x] 7.8 Implement `closeBrowser()` for proper resource cleanup

## 8. MCP Tool Integration
- [x] 8.1 Update `RenderInputSchema` in `mcp-server/src/tools/render.ts` to include 3D options
- [x] 8.2 Add `format: "3d-png"` enum value
- [x] 8.3 Add 3D-specific schema fields: `projection`, `cameraPosition`, `cameraTarget`, `fov`
- [x] 8.4 Add format branching in `render_floorplan` tool handler
- [x] 8.5 Call `render3DToPng` when `format === "3d-png"`
- [x] 8.6 Return PNG buffer as base64 in MCP response

## 9. CLI Script and Makefile Targets
- [x] 9.1 Create `scripts/generate-3d-images.ts` CLI script
- [x] 9.2 Implement command-line argument parsing (projection, camera, dimensions)
- [x] 9.3 Import and call `render3DToPng` from MCP server package
- [x] 9.4 Write PNG output to file system
- [x] 9.5 Add `export-3d` target to Makefile (isometric view)
- [x] 9.6 Add `export-3d-perspective` target to Makefile with camera parameters
- [x] 9.7 Update Makefile help text to document 3D rendering targets
- [x] 9.8 Test CLI script with sample floorplan files (uses Puppeteer)

## 10. Testing
- [x] 10.1 Write unit tests for `floorplan-3d-core` modules (104 tests: constants, materials, camera-utils, scene-builder)
- [x] 10.2 Write unit test for `buildFloorplanScene` with simple floorplan
- [x] 10.3 Write unit test for camera setup (isometric and perspective)
- [x] 10.4 Write integration test for `render3DToPng` (uses Puppeteer with headless Chromium)
- [x] 10.5 Test with multi-floor floorplan
- [x] 10.6 Test with styled rooms (colors)
- [x] 10.7 Test error handling for invalid JSON data
- [x] 10.8 All 28 mcp-server tests pass (14 tools + 14 renderer3d)
- [x] 10.9 All 484 tests pass across all workspaces

## 11. Documentation
- [x] 11.1 Create `floorplan-3d-core/README.md` with package overview
- [x] 11.2 Update `mcp-server/README.md` with 3D rendering usage examples
- [x] 11.3 Document camera options and presets (in mcp-server README)
- [x] 11.4 Document required dependencies and platform requirements (Puppeteer for WebGL2)
- [x] 11.5 Add example floorplan with 3D rendering command (in main README.md)
- [x] 11.6 Update MCP server tool description to mention 3D capability
- [x] 11.7 Document CLI script usage in main README.md
- [x] 11.8 Add Makefile target examples to README.md
- [x] 11.9 Document difference between 2D and 3D rendering workflows (in main README.md)

## 12. Validation
- [x] 12.1 Test on macOS with Node.js 20+
- [x] 12.2 Puppeteer works cross-platform (Linux, Windows, macOS)
- [ ] 12.3 Verify PNG output is viewable by GPT-4o and Claude 3.5 Sonnet (manual testing)
- [x] 12.4 Verify backward compatibility: existing 2D rendering unchanged
- [x] 12.5 Verify viewer still works after refactor to use shared package
- [x] 12.6 All tests pass with Puppeteer-based renderer
- [x] 12.7 Run `openspec validate add-mcp-3d-rendering --strict` and fix issues
