# Refactor Door/Window Rendering to Shared Core Library

## Why

Currently, door and window rendering exists only in the browser-specific `viewer` package, which means:
- The MCP server's 3D PNG renderer cannot display doors/windows (only renders floors, walls, stairs, lifts)
- The CLI `generate-3d-images.ts` script produces incomplete 3D visualizations
- Door rendering logic is duplicated or missing across different rendering contexts
- Testing and maintenance require changes in multiple places

This architectural gap creates inconsistent user experience where SVG renders include doors, but 3D renders do not.

## What Changes

### Core Architecture
- **NEW**: Create `floorplan-3d-core/src/connection-geometry.ts` - Platform-agnostic door/window mesh generation
- **NEW**: Create `floorplan-3d-core/src/connection-matcher.ts` - Connection matching and deduplication logic
- **MODIFIED**: Update `floorplan-3d-core/src/scene-builder.ts` - Integrate connection rendering into scene building
- **MODIFIED**: Update `floorplan-3d-core/src/index.ts` - Export new connection APIs

### MCP Server (Primary Benefit)
- **MODIFIED**: Simplify `mcp-server/src/utils/puppeteer-renderer.ts` - Use shared scene builder instead of embedded code
- **RESULT**: 3D PNG renders now include doors and windows with proper positioning and materials

### Viewer (Refactoring)
- **MODIFIED**: Simplify `viewer/src/wall-generator.ts` - Delegate connection rendering to shared core
- **REMOVED**: Delete `viewer/src/door-renderer.ts` - Logic moved to core
- **REMOVED**: Delete `viewer/src/connection-matcher.ts` - Logic moved to core
- **RESULT**: Reduced code duplication, single source of truth for door rendering

### CLI Scripts
- **RESULT**: `scripts/generate-3d-images.ts` automatically gets door/window rendering via updated core

### Design Decision: CSG-Optional
- Phase 1 implements **simple box geometry** for doors/windows (works everywhere)
- Phase 2 (future) adds optional CSG wall cutouts for browser environments
- This allows gradual migration without breaking existing functionality

## Impact

### Affected Specs
- **3d-viewer**: Door and window rendering requirements (new scenarios for door swing, positioning)
- **rendering**: 3D rendering consistency with SVG output

### Affected Code
- `floorplan-3d-core/src/` - New modules added
- `mcp-server/src/utils/puppeteer-renderer.ts` - Simplified to use core
- `viewer/src/wall-generator.ts` - Refactored to use core
- `viewer/src/door-renderer.ts` - Deleted (moved to core)
- `viewer/src/connection-matcher.ts` - Deleted (moved to core)
- `scripts/generate-3d-images.ts` - Indirectly benefits from core changes

### Breaking Changes
None - This is an internal refactoring that maintains all existing APIs and behaviors.

### User-Visible Improvements
- **MCP server renders now include doors/windows** - AI assistants can generate complete 3D visualizations
- **CLI scripts produce complete 3D images** - Export tools generate production-ready renders
- **Consistent rendering across all outputs** - SVG, 3D viewer, 3D PNG, and JSON exports all match

### Technical Benefits
- Single source of truth for door/window geometry
- Easier testing (test once in core, works everywhere)
- Better maintainability (fix bugs once, benefits all consumers)
- Foundation for future CSG enhancements
- Simplified Puppeteer renderer code

## Implementation Phases

### Phase 1: Core Modules (Deliverable: Basic door/window rendering)
- Create connection-geometry.ts and connection-matcher.ts
- Add comprehensive unit tests
- Integrate into scene-builder.ts

### Phase 2: MCP Server Integration (Deliverable: 3D PNG with doors)
- Update puppeteer-renderer.ts to use core scene builder
- Validate 3D PNG output includes doors/windows
- Update MCP server tests

### Phase 3: Viewer Refactoring (Deliverable: Simplified viewer code)
- Refactor viewer to use shared core modules
- Remove duplicate door-renderer and connection-matcher
- Validate all viewer functionality still works

### Phase 4: Future Enhancement (Optional: CSG wall cutouts)
- Add wall-geometry-csg.ts with optional CSG support
- Make three-bvh-csg an optional peer dependency
- Enable CSG-enhanced walls in browser environments

