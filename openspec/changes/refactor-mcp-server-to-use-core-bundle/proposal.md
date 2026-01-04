# Refactor MCP Server to Use Core Bundle

## Why

The MCP server's puppeteer-renderer had ~740 lines of embedded 3D rendering code that duplicated logic from `floorplan-3d-core`. After the door/window rendering refactor (archived as `2026-01-04-refactor-door-rendering-to-core`), the core library now provides a browser bundle with consistent rendering across all contexts. The MCP server was updated to use this shared bundle, reducing code duplication and ensuring visual consistency.

Additionally, the viewer had divergent implementations for wall generation (CSG-based), door rendering, and wall ownership detection. These have been unified into `floorplan-3d-core` with CSG as an optional dependency, enabling graceful degradation in headless environments while maintaining full feature parity when CSG is available.

Furthermore, geometry utilities like `calculatePositionWithFallback` were duplicated between 2D (SVG) and 3D rendering. A new `floorplan-common` package was created to provide a zero-dependency shared foundation, ensuring consistent behavior between renderers without forcing Three.js onto parser-only users.

## What Changes

### MCP Server Simplification
- **MODIFIED**: `mcp-server/src/utils/puppeteer-renderer.ts` - Replaced ~740 lines of embedded rendering code with ~55 lines that load and use the `floorplan-3d-core` browser bundle
- **RESULT**: MCP server 3D PNG generation now uses identical rendering logic as the interactive viewer

### New Shared Package: floorplan-common
- **ADDED**: `floorplan-common/` - New zero-dependency package for shared utilities
- **MOVED**: Geometry utilities (`calculateWallOverlap`, `calculatePositionWithFallback`, `RoomBounds`) from `floorplans-language` to `floorplan-common`
- **MODIFIED**: `floorplans-language` - Re-exports from `floorplan-common` for backward compatibility
- **MODIFIED**: `floorplan-3d-core` - Imports and re-exports from `floorplan-common`
- **MODIFIED**: `package.json` (root) - Added `floorplan-common` to workspaces

### Core Library Updates
- **MODIFIED**: `floorplan-3d-core/package.json` - Added browser bundle export, esbuild build script, optional `three-bvh-csg` peer dependency, and `floorplan-common` dependency
- **ADDED**: `floorplan-3d-core/scripts/build-browser.js` - Build script for browser bundle
- **MOVED**: `viewer/src/csg-utils.ts` → `floorplan-3d-core/src/csg-utils.ts` - CSG material utilities
- **MOVED**: `viewer/src/wall-ownership.ts` → `floorplan-3d-core/src/wall-ownership.ts` - Wall ownership detection
- **ADDED**: `floorplan-3d-core/src/wall-builder.ts` - Unified wall generation with optional CSG support
- **MODIFIED**: Various minor null-safety fixes in core modules

### Viewer Simplification
- **DELETED**: `viewer/src/csg-utils.ts` - Moved to `floorplan-3d-core`
- **DELETED**: `viewer/src/wall-ownership.ts` - Moved to `floorplan-3d-core`
- **DELETED**: `viewer/src/types.ts` - Pure re-export, import directly from core
- **DELETED**: `viewer/src/constants.ts` - Pure re-export, import directly from core
- **DELETED**: `viewer/src/stair-generator.ts` - Pure re-export, import directly from core
- **MODIFIED**: `viewer/src/wall-generator.ts` - Imports from `floorplan-3d-core` instead of local files
- **MODIFIED**: `viewer/src/dsl-parser.ts` - Import types from `floorplan-3d-core`
- **MOVED**: `viewer/test/csg-utils.test.ts` → `floorplan-3d-core/test/`
- **MOVED**: `viewer/test/wall-ownership.test.ts` → `floorplan-3d-core/test/`

### OpenSpec Cleanup
- **MODIFIED**: Trimmed speclife command reference files to concise format

## Impact

### Affected Specs
- **3d-viewer**: Door and window rendering requirements added
- **rendering**: 3D rendering consistency requirements added

### Affected Code
- `floorplan-common/` - New shared package with geometry utilities
- `floorplans-language/` - Re-exports geometry from common
- `mcp-server/src/utils/puppeteer-renderer.ts` - Major simplification
- `floorplan-3d-core/` - Browser bundle export added, wall/CSG utilities consolidated, imports from common
- `viewer/` - Simplified to import from core, removed duplicate implementations
- `openspec/commands/speclife/` - Documentation trimmed

### Breaking Changes
None - This is an internal refactoring that maintains all existing APIs and behaviors.

### User-Visible Improvements
- Consistent 3D rendering between MCP server and interactive viewer
- All door/window rendering features now available in MCP server PNG output
- Double-door rendering now works correctly everywhere (two panels, mirrored swing)
- CSG wall cutouts available when `three-bvh-csg` is installed (optional)
- Consistent geometry calculations between 2D (SVG) and 3D renderers
- Parser-only users don't pull in Three.js (lightweight `floorplans-language`)

