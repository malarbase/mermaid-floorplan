# Refactor MCP Server to Use Core Bundle

## Why

The MCP server's puppeteer-renderer had ~740 lines of embedded 3D rendering code that duplicated logic from `floorplan-3d-core`. After the door/window rendering refactor (archived as `2026-01-04-refactor-door-rendering-to-core`), the core library now provides a browser bundle with consistent rendering across all contexts. The MCP server was updated to use this shared bundle, reducing code duplication and ensuring visual consistency.

## What Changes

### MCP Server Simplification
- **MODIFIED**: `mcp-server/src/utils/puppeteer-renderer.ts` - Replaced ~740 lines of embedded rendering code with ~55 lines that load and use the `floorplan-3d-core` browser bundle
- **RESULT**: MCP server 3D PNG generation now uses identical rendering logic as the interactive viewer

### Core Library Updates
- **MODIFIED**: `floorplan-3d-core/package.json` - Added browser bundle export and esbuild build script
- **ADDED**: `floorplan-3d-core/scripts/build-browser.js` - Build script for browser bundle
- **MODIFIED**: Various minor null-safety fixes in core modules

### OpenSpec Cleanup
- **MODIFIED**: Trimmed speclife command reference files to concise format

## Impact

### Affected Specs
- **3d-viewer**: Door and window rendering requirements added
- **rendering**: 3D rendering consistency requirements added

### Affected Code
- `mcp-server/src/utils/puppeteer-renderer.ts` - Major simplification
- `floorplan-3d-core/` - Browser bundle export added
- `openspec/commands/speclife/` - Documentation trimmed

### Breaking Changes
None - This is an internal refactoring that maintains all existing APIs and behaviors.

### User-Visible Improvements
- Consistent 3D rendering between MCP server and interactive viewer
- All door/window rendering features now available in MCP server PNG output

