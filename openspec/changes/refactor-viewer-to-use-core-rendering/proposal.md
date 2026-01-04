# Refactor Viewer to Use Core Rendering

## Why

The viewer currently has its own implementations of door rendering (`door-renderer.ts`) and wall generation (`wall-generator.ts`) that duplicate logic from `floorplan-3d-core`. This leads to:

1. **Code duplication** - Door hinge/swing calculations exist in both viewer and core
2. **Divergent behavior** - Fixes to core's `connection-geometry.ts` don't automatically apply to viewer
3. **Maintenance burden** - Two implementations to maintain for the same functionality

With `floorplan-common` now providing shared geometry utilities, the viewer can be simplified to delegate more to core.

## What Changes

### Phase 1: Consolidate Door Rendering

- **MODIFIED**: `floorplan-3d-core/src/connection-geometry.ts` - Add hinge position and swing rotation logic from viewer's `DoorRenderer`
- **DELETED**: `viewer/src/door-renderer.ts` - Replace with core's enhanced `generateConnection()`
- **MODIFIED**: `viewer/src/wall-generator.ts` - Import door rendering from core instead of local `DoorRenderer`

### Phase 2: Simplify Wall Generator

- **MODIFIED**: `viewer/src/wall-generator.ts` - Delegate wall segment generation to core's `WallBuilder`
- **MODIFIED**: `floorplan-3d-core/src/wall-builder.ts` - Expose more granular APIs for browser use

### What Stays in Viewer

- CSG initialization (`Evaluator` instance management)
- Browser-specific material handling
- Monaco editor integration
- File loading/parsing

## Impact

### Affected Specs
- **3d-viewer**: Door rendering requirements updated

### Affected Code
- `floorplan-3d-core/src/connection-geometry.ts` - Enhanced door mesh generation
- `floorplan-3d-core/src/wall-builder.ts` - More granular APIs
- `viewer/src/door-renderer.ts` - Deleted
- `viewer/src/wall-generator.ts` - Simplified

### Breaking Changes
None - This is an internal refactoring that maintains all existing behavior.

### User-Visible Improvements
- Consistent door rendering between MCP server and viewer
- Door swing direction consistent across all rendering contexts

