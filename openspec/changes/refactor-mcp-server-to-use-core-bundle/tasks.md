## 1. Core Library Browser Bundle

- [x] 1.1 Add esbuild build script for browser bundle
- [x] 1.2 Update package.json with browser export
- [x] 1.3 Fix null-safety issues in core modules

## 2. MCP Server Integration

- [x] 2.1 Replace embedded rendering code with core bundle loader
- [x] 2.2 Update puppeteer-renderer to inject browser bundle
- [x] 2.3 Verify 3D PNG output includes doors and windows

## 3. OpenSpec Updates

- [x] 3.1 Add door/window rendering requirements to 3d-viewer spec
- [x] 3.2 Add consistency requirements to rendering spec
- [x] 3.3 Trim speclife command files to concise format

## 4. Unified Wall/Connection Rendering

- [x] 4.1 Move csg-utils.ts from viewer to floorplan-3d-core
- [x] 4.2 Make three-bvh-csg optional peer dependency in core
- [x] 4.3 Move wall-ownership.ts from viewer to core
- [x] 4.4 Create wall-builder.ts with CSG fallback pattern
- [x] 4.5 Update viewer imports for wall-ownership and csg-utils from core
- [x] 4.6 Delete pure re-export files (types.ts, constants.ts, stair-generator.ts)
- [x] 4.7 Move csg-utils.test.ts and wall-ownership.test.ts to core
- [x] 4.8 Build and test all packages

## 5. Shared Geometry Package

- [x] 5.1 Create floorplan-common package with package.json, tsconfig.json
- [x] 5.2 Move geometry utilities from language to floorplan-common
- [x] 5.3 Update floorplans-language to re-export from floorplan-common
- [x] 5.4 Update floorplan-3d-core to import from floorplan-common
- [x] 5.5 Add floorplan-common to root workspaces
- [x] 5.6 Add tests for geometry utilities
- [x] 5.7 Build and verify all packages

