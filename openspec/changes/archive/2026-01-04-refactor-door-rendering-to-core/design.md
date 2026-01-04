# Technical Design: Door/Window Rendering in Shared Core

## Context

The mermaid-floorplan project has three rendering contexts:
1. **SVG Renderer** (in `language/` package) - 2D top-down view
2. **3D Viewer** (in `viewer/` package) - Interactive Three.js browser app with CSG wall cutouts
3. **3D PNG Renderer** (in `mcp-server/` package) - Puppeteer-based headless rendering for AI assistants

Currently, only the 3D Viewer implements door/window rendering. The MCP server's Puppeteer renderer has embedded JavaScript that renders floors, walls, stairs, and lifts but **omits doors and windows entirely**.

This creates inconsistency: users see doors in the web viewer but not in AI-generated 3D images.

## Goals

1. **Unified Door/Window Rendering**: Single implementation shared across viewer and MCP server
2. **Platform Agnostic**: Works in browser and Node.js/Puppeteer environments
3. **CSG Optional**: Simple box geometry by default, optional CSG wall cutouts for browser
4. **Zero Breaking Changes**: All existing APIs and behaviors remain unchanged
5. **Improved Testability**: Test once in core, works everywhere

## Non-Goals

- CSG wall cutouts in headless rendering (too complex for Puppeteer; use simple overlays)
- Door animation or interaction (viewer-specific feature, out of scope)
- Performance optimization (current renderer is fast enough)
- SVG door rendering changes (already works, not touched)

## Architectural Decisions

### Decision 1: Create `floorplan-3d-core` Package for Shared 3D Logic

**Chosen Approach**: Extract door/window rendering into the existing `floorplan-3d-core` shared library.

**Rationale**:
- `floorplan-3d-core` already exists and is consumed by both viewer and MCP server
- Contains shared types (`JsonConnection`, `JsonRoom`, `JsonWall`) and constants (`DIMENSIONS`)
- Has established build and test infrastructure
- Provides natural home for platform-agnostic 3D rendering logic

**Alternatives Considered**:
- **Create new `floorplan-3d-connection` package**: Rejected - adds unnecessary complexity
- **Keep logic in viewer, import into MCP server**: Rejected - creates dependency on browser-specific code
- **Duplicate code in both places**: Rejected - maintenance nightmare

### Decision 2: Simple Box Geometry (Phase 1), CSG Cutouts (Phase 2)

**Chosen Approach**: Implement door/window rendering as **separate meshes** (not cut into walls) using simple Three.js box geometry.

**Rationale**:
- Works in all environments (browser, Node.js, Puppeteer)
- No external dependencies (CSG library not needed)
- Fast to implement and test
- Sufficient visual fidelity for most use cases
- Doors/windows are visible even if they overlap wall geometry slightly

**Future Enhancement (Phase 2)**:
- Add optional CSG wall cutouts for browser environments
- Make `three-bvh-csg` an optional peer dependency
- Create `wall-geometry-csg.ts` for advanced rendering
- Viewer can opt into CSG; MCP server uses simple geometry

**Alternatives Considered**:
- **CSG required everywhere**: Rejected - doesn't work in Puppeteer (ESM/CommonJS issues)
- **SVG-style rendering (no 3D meshes)**: Rejected - inconsistent with 3D scene
- **Skip door rendering in MCP server**: Rejected - defeats the purpose of this refactoring

### Decision 3: Puppeteer Renderer Uses Bundled Core Scene Builder

**Chosen Approach**: Replace embedded JavaScript in `puppeteer-renderer.ts` with bundled `floorplan-3d-core` scene builder.

**Rationale**:
- Eliminates ~500 lines of duplicated rendering code
- Automatically gets all core improvements (stairs, lifts, connections)
- Easier to maintain and test
- Already have pattern of injecting Three.js source into Puppeteer page

**Implementation**:
```typescript
// Before: Embedded JavaScript string with wall/floor rendering
function getRenderingCode(): string {
  return `
    // 500+ lines of inline Three.js code
    function buildScene(jsonData, options) { ... }
  `;
}

// After: Inject bundled floorplan-3d-core
function getRenderingCode(): string {
  return `
    ${getBundledSceneBuilder()} // Injected from floorplan-3d-core
    
    window.renderFloorplan = async function(jsonData, options) {
      const result = window.FloorplanCore.buildCompleteScene(jsonData, options);
      renderer.render(result.scene, result.camera);
      return result.metadata;
    };
  `;
}
```

**Alternatives Considered**:
- **Keep embedded code, add connections manually**: Rejected - perpetuates duplication
- **Import scene-builder at runtime**: Rejected - Puppeteer runs in isolated browser context
- **Generate rendering code from core at build time**: Rejected - adds build complexity

### Decision 4: Connection Deduplication Logic in Core

**Chosen Approach**: Move `ConnectionMatcher` logic from viewer to core, implementing "single render per connection" rules.

**Rationale**:
- Prevents duplicate door meshes (one connection = two walls, but only one door)
- Essential for correctness in all rendering contexts
- Logic is pure (no browser dependencies)

**Rules** (preserving existing viewer behavior):
1. If both walls are `solid`: render on `fromRoom` wall
2. If one wall is `open`, other is `solid`: render on solid wall
3. If both walls are `open`: render on `fromRoom` wall
4. If target room not found (different floor): render on source room

**Alternatives Considered**:
- **Render on both walls, let user handle overlap**: Rejected - creates visual artifacts
- **Always render on fromRoom**: Rejected - doesn't work when fromRoom wall is open

### Decision 5: Door Swing Geometry Calculation

**Chosen Approach**: Replicate viewer's door panel geometry with hinge-based rotation.

**Implementation**:
```typescript
// Door panel with pivot at hinge edge
const doorPanelGeom = new THREE.BoxGeometry(doorWidth, doorHeight, DOOR_PANEL_THICKNESS);
doorPanelGeom.translate(doorWidth / 2, 0, 0); // Pivot at left edge

// Position at hinge
const { hingeX, hingeZ } = calculateHingePosition(connection, wall, doorWidth);
doorMesh.position.set(hingeX, holeY, hingeZ);

// Rotate based on swing direction and opensInto
const rotation = calculateDoorRotation(connection, wall, isVertical);
doorMesh.rotation.y = rotation;
```

**Rationale**:
- Matches viewer's behavior (swing arcs, hinge positioning)
- Visually clear which way door opens
- Geometry pivot at hinge allows realistic rotation

**Alternatives Considered**:
- **Simple centered rectangle**: Rejected - doesn't show swing direction
- **Arc geometry (SVG-style)**: Rejected - doesn't match 3D viewer aesthetic
- **Animated swing**: Rejected - out of scope, viewer-specific

## Data Flow

### Before Refactoring
```
┌─────────────────┐
│  Viewer (CSG)   │──> Has door rendering (DoorRenderer, ConnectionMatcher)
└─────────────────┘

┌─────────────────┐
│  MCP Server     │──> NO door rendering (embedded code, only walls/floors/stairs)
└─────────────────┘
```

### After Refactoring
```
┌──────────────────────────────────────┐
│   floorplan-3d-core                  │
│   - connection-geometry.ts           │──> Shared by all consumers
│   - connection-matcher.ts            │
│   - scene-builder.ts (updated)       │
└──────────────────────────────────────┘
         ↑                    ↑
         │                    │
┌────────┴────────┐  ┌────────┴────────┐
│  Viewer         │  │  MCP Server     │
│  (uses core)    │  │  (uses core)    │
└─────────────────┘  └─────────────────┘
```

## Module Structure

### `floorplan-3d-core/src/connection-geometry.ts`

**Exports**:
```typescript
export interface ConnectionGeometryOptions {
  wallThickness: number;
  defaultHeight: number;
  theme?: ViewerTheme;
  styleMap?: Map<string, MaterialStyle>;
}

export function generateFloorConnections(
  floor: JsonFloor,
  allConnections: JsonConnection[],
  options: ConnectionGeometryOptions
): THREE.Group;

export function generateConnection(
  connection: JsonConnection,
  sourceRoom: JsonRoom,
  targetRoom: JsonRoom | undefined,
  wallThickness: number,
  theme?: ViewerTheme
): THREE.Mesh | null;
```

**Internal Functions**:
- `renderDoorGeometry()` - Door panel with swing
- `renderWindowGeometry()` - Transparent window box
- `calculateHingePosition()` - Hinge location on wall
- `calculateDoorRotation()` - Swing angle based on opensInto/swing
- `calculateConnectionPosition()` - Position along wall (percentage-based)

### `floorplan-3d-core/src/connection-matcher.ts`

**Exports**:
```typescript
export interface ConnectionMatch {
  connection: JsonConnection;
  isFromRoom: boolean;
  otherRoomName: string;
  otherWallDirection: string;
}

export function findMatchingConnections(
  room: JsonRoom,
  wall: JsonWall,
  allConnections: JsonConnection[]
): ConnectionMatch[];

export function shouldRenderConnection(
  match: ConnectionMatch,
  currentWall: JsonWall,
  allRooms: JsonRoom[]
): boolean;
```

## Integration Points

### Scene Builder Integration

```typescript
// In buildFloorplanScene():
for (const floor of floorsToRender) {
  const floorGroup = new THREE.Group();
  
  // Existing: floors, walls, stairs, lifts
  if (showFloors) { /* ... */ }
  if (showWalls) { /* ... */ }
  if (showStairs) { /* ... */ }
  if (showLifts) { /* ... */ }
  
  // NEW: connections (doors/windows)
  if (showConnections) {
    const connections = generateFloorConnections(floor, normalizedData.connections ?? [], {
      wallThickness,
      defaultHeight: floor.height ?? defaultHeight,
      theme,
      styleMap,
    });
    floorGroup.add(connections);
  }
  
  scene.add(floorGroup);
}
```

### Puppeteer Renderer Integration

```typescript
// Simplified puppeteer-renderer.ts:
function getRenderingCode(): string {
  return `
    // Load bundled floorplan-3d-core (includes scene-builder)
    ${getFloorplanCoreBundle()}
    
    window.renderFloorplan = async function(jsonData, options) {
      const canvas = document.getElementById('canvas');
      const width = options.width || 800;
      const height = options.height || 600;
      
      // Use core's buildCompleteScene (includes connections)
      const { scene, camera, bounds, floorsRendered } = 
        window.FloorplanCore.buildCompleteScene(jsonData, options);
      
      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
      renderer.setSize(width, height);
      renderer.render(scene, camera);
      
      return { sceneBounds: bounds, floorsRendered };
    };
  `;
}
```

## Testing Strategy

### Unit Tests (floorplan-3d-core)

**connection-geometry.test.ts**:
- Door panel dimensions match connection width/height
- Hinge position calculated correctly for all wall directions
- Door rotation angle matches swing direction
- Window positioned at correct sill height
- Connection position percentage calculated correctly

**connection-matcher.test.ts**:
- Finds all connections for a given room/wall
- Deduplication rules (fromRoom vs toRoom)
- Open vs solid wall prioritization
- Cross-floor connections handled gracefully

**scene-builder.test.ts** (updated):
- Scene includes connection meshes when showConnections=true
- Connections positioned correctly relative to walls
- Multiple floors render connections independently

### Integration Tests (mcp-server)

**renderer3d.test.ts** (updated):
- 3D PNG includes door meshes
- Door positioned at correct wall percentage
- Window at correct elevation (sill height)
- Doors render on correct wall (deduplication works)

### Manual Testing

1. Generate 3D PNG: `npx tsx scripts/generate-3d-images.ts trial/ImprovedTriplexVilla.floorplan trial --all`
2. Visual inspection: doors/windows visible and correctly positioned
3. Compare with viewer: same door positions and swing directions
4. Test with different floorplan files (StairsAndLifts, StyledApartment, etc.)

## Migration Strategy

### Phase 1: Create Core Modules (Non-Breaking)
1. Add connection-geometry.ts and connection-matcher.ts to floorplan-3d-core
2. Add comprehensive tests
3. Export from index.ts
4. **No consumers affected yet** (new modules, not used)

### Phase 2: Update MCP Server (User-Visible Improvement)
1. Modify puppeteer-renderer.ts to use core scene builder
2. Test 3D PNG output includes doors/windows
3. **Users see**: MCP server now renders complete 3D images

### Phase 3: Refactor Viewer (Internal Cleanup)
1. Update viewer to use core modules
2. Remove duplicate door-renderer.ts and connection-matcher.ts
3. Run viewer tests to ensure no regressions
4. **Users see**: No changes (viewer behavior unchanged)

### Rollback Plan
- Phase 1: Just delete new files (no consumers)
- Phase 2: Revert puppeteer-renderer.ts changes (embedded code still exists)
- Phase 3: Revert viewer changes (old files in git history)

## Performance Considerations

**Current Performance**:
- Puppeteer 3D PNG render: ~1-2 seconds for simple floorplan
- Viewer initial render: ~100ms for simple floorplan

**Expected Impact**:
- Adding door/window meshes: ~10-50ms overhead (negligible)
- Connection matching: O(n×m) where n=walls, m=connections (typically <100 each)
- No performance regressions expected

**Measurement**:
- Add timing logs to scene-builder.ts
- Compare before/after render times for test floorplans
- Target: <5% performance degradation

## Security Considerations

None - This is internal refactoring of rendering logic with no external inputs or network operations.

## Open Questions

1. **Bundle size**: How large is the bundled floorplan-3d-core for Puppeteer injection?
   - **Resolution**: Measure after implementation; optimize if >100KB
   
2. **Material consistency**: Should door/window materials match room styles?
   - **Resolution**: Use theme colors by default, respect room styles if defined
   
3. **Error handling**: What if connection references non-existent room?
   - **Resolution**: Log warning, skip rendering that connection (graceful degradation)

## Success Criteria

1. ✅ All existing tests pass (viewer, MCP server, core)
2. ✅ MCP server 3D PNGs include doors and windows
3. ✅ Viewer rendering unchanged (visual comparison)
4. ✅ CLI scripts produce complete 3D images
5. ✅ Code duplication eliminated (door-renderer.ts removed from viewer)
6. ✅ Performance impact <5% (measured via timing logs)
7. ✅ Documentation updated (README files, code examples)

