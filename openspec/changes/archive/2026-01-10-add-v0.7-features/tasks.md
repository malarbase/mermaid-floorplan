## 1. 3D Viewer Enhancements

- [x] 1.1 Add stair and lift elements to DSL grammar
- [x] 1.2 Implement 3D stair rendering with flight geometry
- [x] 1.3 Add floor penetration support for stairs/lifts
- [x] 1.4 Implement door and window 3D mesh rendering
- [x] 1.5 Add keyboard navigation (W/A/S/D, arrow keys)
- [x] 1.6 Add pivot point indicator for camera target
- [x] 1.7 Implement lighting customization UI
- [x] 1.8 Deploy viewer to GitHub Pages

## 2. Interactive Editor

- [x] 2.1 Create interactive-editor package structure
- [x] 2.2 Implement click selection for rooms and walls
- [x] 2.3 Implement marquee (rectangle drag) selection
- [x] 2.4 Create properties panel component
- [x] 2.5 Integrate Monaco editor with floorplan language
- [x] 2.6 Implement DSL-to-3D bidirectional sync
- [x] 2.7 Add cursor highlight sync between editor and scene

## 3. DSL Grammar Enhancements

- [x] 3.1 Implement grammar versioning system
- [x] 3.2 Add YAML frontmatter parsing
- [x] 3.3 Add dimension unit support (m, ft, cm, in, mm)
- [x] 3.4 Implement unit normalization in validation
- [x] 3.5 Add connection size attribute syntax
- [x] 3.6 Add opening connection type for doorless passages
- [x] 3.7 Implement camelCase/snake_case config normalization

## 4. MCP Server Enhancements

- [x] 4.1 Add 3D PNG rendering tool
- [x] 4.2 Integrate shared 3D core library
- [x] 4.3 Add camera position/target configuration
- [x] 4.4 Enhance analyze_floorplan with metrics

## 5. Rendering & Validation

- [x] 5.1 Implement shared wall ownership rules
- [x] 5.2 Add shared wall conflict detection
- [x] 5.3 Implement dimension annotations
- [x] 5.4 Add area/efficiency metrics computation
- [x] 5.5 Implement unit-aware validation
- [x] 5.6 Add floor summary rendering

## 6. Architecture

- [x] 6.1 Create viewer-core package for shared code
- [x] 6.2 Create floorplan-3d-core package for 3D primitives
- [x] 6.3 Create floorplan-common package for geometry utilities
- [x] 6.4 Consolidate door rendering to shared core
- [x] 6.5 Unify rendering pipeline across MCP and viewer
- [x] 6.6 Modularize viewer with manager classes
