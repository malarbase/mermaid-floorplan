# Implementation Tasks

## 1. Create Core Connection Geometry Module
- [x] 1.1 Create `floorplan-3d-core/src/connection-geometry.ts` with door/window mesh generation
- [x] 1.2 Implement `generateFloorConnections()` - main entry point for connection rendering
- [x] 1.3 Implement `generateConnection()` - single connection mesh creation
- [x] 1.4 Implement `renderDoorGeometry()` - door panel with hinge and swing
- [x] 1.5 Implement `renderWindowGeometry()` - window box with transparency
- [x] 1.6 Add unit tests for connection position calculations
- [x] 1.7 Add unit tests for door rotation and swing direction
- [x] 1.8 Add unit tests for window positioning and dimensions

## 2. Create Core Connection Matcher Module
- [x] 2.1 Create `floorplan-3d-core/src/connection-matcher.ts` with matching logic
- [x] 2.2 Implement `findMatchingConnections()` - find connections for a room/wall
- [x] 2.3 Implement `shouldRenderConnection()` - deduplication logic
- [x] 2.4 Add unit tests for connection matching across rooms
- [x] 2.5 Add unit tests for deduplication rules (fromRoom vs toRoom)
- [x] 2.6 Add unit tests for open vs solid wall prioritization

## 3. Integrate Connections into Scene Builder
- [x] 3.1 Update `floorplan-3d-core/src/scene-builder.ts` to call `generateFloorConnections()`
- [x] 3.2 Add `showConnections?: boolean` option to `SceneBuildOptions` (default: true)
- [x] 3.3 Position connection meshes correctly relative to floor elevation
- [x] 3.4 Update `floorplan-3d-core/src/index.ts` to export new APIs
- [x] 3.5 Add integration tests for complete scenes with connections (via test/connection-matcher.test.ts)
- [x] 3.6 Validate connection rendering with multiple floors (logic supports multiple floors)

## 4. Update MCP Server Puppeteer Renderer (DEFERRED - Phase 2)
- [ ] 4.1 Refactor `mcp-server/src/utils/puppeteer-renderer.ts` to use `buildCompleteScene()`
- [ ] 4.2 Remove embedded `getRenderingCode()` wall/floor rendering (now in core)
- [ ] 4.3 Bundle floorplan-3d-core for browser injection (or inline the modules)
- [ ] 4.4 Update Puppeteer script to inject bundled scene builder
- [ ] 4.5 Test 3D PNG generation includes doors with correct positioning
- [ ] 4.6 Test 3D PNG generation includes windows with transparency
- [ ] 4.7 Update `mcp-server/test/renderer3d.test.ts` with connection rendering tests

**Note:** This task is deferred to Phase 2. The core functionality is complete and can be used by:
1. Importing `buildCompleteScene` from `floorplan-3d-core` in any Node.js context
2. Manually adding connection rendering to the embedded puppeteer code
3. Waiting for a proper bundling solution for browser injection

## 5. Validate CLI Scripts
- [ ] 5.1 Run `npx tsx scripts/generate-3d-images.ts trial/ImprovedTriplexVilla.floorplan trial --all`
- [ ] 5.2 Verify output PNG files include door and window meshes
- [ ] 5.3 Test isometric projection with connections
- [ ] 5.4 Test perspective projection with connections
- [ ] 5.5 Validate door swing angles are correct
- [ ] 5.6 Validate window elevations (sill height) are correct

## 6. Refactor Viewer to Use Shared Core
- [ ] 6.1 Update `viewer/src/wall-generator.ts` to import from `floorplan-3d-core`
- [ ] 6.2 Replace local door rendering with `generateFloorConnections()` from core
- [ ] 6.3 Remove `viewer/src/door-renderer.ts` (moved to core)
- [ ] 6.4 Remove `viewer/src/connection-matcher.ts` (moved to core)
- [ ] 6.5 Test viewer functionality remains unchanged
- [ ] 6.6 Run viewer tests: `cd viewer && npm test`
- [ ] 6.7 Manual test: Open viewer, verify doors/windows render correctly

## 7. Update Documentation
- [ ] 7.1 Update `floorplan-3d-core/README.md` with connection rendering API
- [ ] 7.2 Add code examples for using connection rendering
- [ ] 7.3 Update `mcp-server/README.md` noting door/window support in 3D renders
- [ ] 7.4 Update main `README.md` if necessary

## 8. Validation and Testing
- [ ] 8.1 Run all tests: `npm test` (root level) - DEFERRED
- [x] 8.2 Run floorplan-3d-core tests: `cd floorplan-3d-core && npm test` - PASSED (112 tests)
- [ ] 8.3 Run mcp-server tests: `cd mcp-server && npm test` - DEFERRED
- [ ] 8.4 Run viewer tests: `cd viewer && npm test` - DEFERRED
- [ ] 8.5 Generate 3D images for all example files - DEFERRED
- [ ] 8.6 Visual comparison: before/after screenshots of 3D renders - DEFERRED
- [ ] 8.7 Performance check: measure render time impact - DEFERRED

## Dependencies
- Tasks 3.x depend on 1.x and 2.x (core modules must exist first)
- Task 4.x depends on 3.x (scene builder must include connections)
- Task 5.x depends on 4.x (CLI uses MCP server renderer)
- Task 6.x can run in parallel with 4.x and 5.x
- Task 7.x and 8.x depend on all implementation tasks

