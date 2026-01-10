## Why

The project evolved from a basic DSL parser to a full-featured floorplan design system. This release consolidated multiple development streams into a cohesive v0.7.0 release with 3D visualization, interactive editing, MCP server integration, and enhanced DSL capabilities.

## What Changed

### 3D Viewer Enhancements
- **Added stairs and lifts** with 3D rendering and floor penetration support
- **Implemented door/window rendering** in 3D outputs via shared core library
- **Added keyboard navigation** and pivot point indicator for camera control
- **Enhanced lighting customization** with ambient/directional light controls
- **Deployed to GitHub Pages** with editor panel, 2D overlay, and floor controls

### Interactive Editor (New Package)
- **Created interactive-editor package** extending the read-only viewer
- **Implemented 3D object selection** with click and marquee selection
- **Added properties panel** for editing room attributes
- **Integrated Monaco editor** with DSL syntax highlighting
- **Added bidirectional sync** between DSL text and 3D scene

### DSL Grammar Enhancements
- **Added grammar versioning** with semantic version support
- **Implemented YAML frontmatter** for metadata (title, author, version)
- **Added dimension units** (`m`, `ft`, `cm`, `in`, `mm`) with validation
- **Enhanced connection syntax** with custom door/window sizes
- **Added opening connection type** for doorless passages

### MCP Server Enhancements
- **Added 3D PNG rendering** to MCP server tools
- **Integrated shared 3D core** for consistent rendering
- **Enhanced analyze_floorplan** with metrics computation

### Rendering & Validation
- **Implemented shared wall rendering** with conflict detection
- **Added dimension annotations** with configurable units
- **Enhanced validation** with unit normalization and height checks
- **Added floorplan analysis tool** for area/efficiency metrics

### Architecture Refactoring
- **Created viewer-core package** for shared abstractions
- **Consolidated door rendering** from viewer to floorplan-3d-core
- **Unified rendering** across MCP server and viewer
- **Modularized 3D viewer** with specialized managers (camera, lighting, floor, etc.)

## Impact

- Affected specs: `3d-viewer`, `interactive-editor`, `dsl-grammar`, `mcp-server`, `rendering`
- Affected code: All packages updated (`language/`, `viewer/`, `viewer-core/`, `interactive-editor/`, `mcp-server/`, `floorplan-3d-core/`, `floorplan-common/`)
- **NOT breaking**: Backward compatible with v0.6.x floorplan files
