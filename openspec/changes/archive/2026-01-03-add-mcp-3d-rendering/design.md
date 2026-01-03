# 3D PNG Rendering Design

## Context

The MCP server provides a `render_floorplan` tool for AI assistants to visualize floorplans. Currently, it only supports 2D rendering (SVG and PNG formats showing top-down views). Users need 3D visualization for:
- Better spatial understanding of multi-floor layouts
- Visualizing vertical connections (stairs, lifts)
- Understanding room heights, elevations, and ceiling variations
- Architectural review with depth perception

The project already has a browser-based 3D viewer (`viewer/` package) using Three.js with CSG wall rendering. We can leverage similar techniques for headless server-side rendering.

## Goals / Non-Goals

**Goals:**
- Add 3D PNG rendering capability to the MCP server's `render_floorplan` tool
- Support isometric view (default) and perspective view with configurable camera
- Reuse existing JSON export pipeline for geometry data
- Render floors, walls, stairs, lifts with materials from style definitions
- Maintain backward compatibility with existing 2D rendering

**Non-Goals:**
- Real-time interactive 3D viewer in the MCP server (use browser viewer for that)
- Advanced lighting effects or shadows (keep it simple with ambient + directional light)
- Animation or camera motion (single static frame)
- Extensive CSG operations (basic wall cutouts for doors/windows only)
- Ray-tracing or path-tracing (standard rasterization is sufficient)

## Decisions

### 1. Library Selection: Three.js + Puppeteer

**Decision:** Use Three.js with Puppeteer (headless Chromium) for server-side 3D rendering.

**Alternatives Considered:**
- **Babylon.js with NullEngine**: Better headless support, but smaller ecosystem and less architectural visualization examples.
- **node-canvas-webgl**: Lightweight, but requires manual WebGL calls (too low-level).
- **headless-gl**: Only supports WebGL 1.0, not compatible with Three.js 0.170+ which requires WebGL 2.0.

**Rationale:**
- Three.js is already used in the `viewer/` package → code reuse potential
- Large ecosystem with extensive documentation
- Puppeteer provides full WebGL 2.0 support via headless Chromium
- Cross-platform compatible (macOS, Linux, Windows) without native dependencies
- JSON export format already uses Three.js coordinate conventions (x/z floor plane, y vertical)

### 2. Rendering Pipeline Architecture

**Pipeline:**
1. Parse DSL → Validate → Convert to JSON (`convertFloorplanToJson`)
2. Build Three.js scene from JSON data (floors, walls, stairs, lifts)
3. Setup camera (isometric or perspective based on options)
4. Setup lighting (ambient + directional)
5. Render scene to WebGL buffer via headless context
6. Extract pixel data and encode as PNG
7. Return PNG buffer as base64 in MCP response

**Code Structure:**
```
mcp-server/src/utils/
  renderer3d.ts         # Main 3D rendering module
    - buildFloorplanScene(jsonData, options)
    - setupCamera(options, sceneBounds)
    - setupLighting(scene, options)
    - render3DToPng(jsonData, options)
```

### 3. Camera Configuration

**Default: Isometric View**
- Orthographic camera
- Position: (diagonal distance, height, diagonal distance) relative to scene center
- Standard isometric angle: 30° from horizontal
- Automatically frames entire floorplan

**Optional: Perspective View**
- User-provided `cameraPosition` (x, y, z) and `cameraTarget` (look-at point)
- User-provided `fov` (field of view in degrees, default 50°)
- Useful for close-up views or specific angles

### 4. Geometry Creation Strategy

**Simplification vs Realism Trade-off:**
- **Floors**: Simple box geometry (thickness from config `floor_thickness`)
- **Walls**: Extrude wall outline to height (from `roomHeight` or config `default_height`)
- **Door/Window Cutouts**: Boolean subtraction (CSG) or simple gap in wall mesh
- **Stairs**: Simplified geometry based on stair type (defer complex CSG for MVP)
- **Lifts**: Simple box with door indicators

**Material Application:**
- Use `MaterialFactory` pattern similar to `viewer/` package
- Load colors from style definitions (`floor_color`, `wall_color`)
- Apply textures if provided (`floor_texture`, `wall_texture`)
- Set PBR properties (`roughness`, `metalness`)

### 5. Puppeteer-Based Rendering

**Approach:**
```typescript
import puppeteer from 'puppeteer';

const browser = await puppeteer.launch({
  headless: true,
  args: [
    '--no-sandbox',
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-webgl',
  ],
});
const page = await browser.newPage();

// Set HTML content with canvas
await page.setContent('<canvas id="canvas">');

// Inject Three.js from node_modules
await page.addScriptTag({ content: threeJsSource });

// Inject rendering code and execute
await page.evaluate(renderFloorplan, jsonData, options);
```

**PNG Extraction:**
```typescript
// Use Puppeteer's built-in screenshot capability
const canvasHandle = await page.$('canvas');
const pngBuffer = await canvasHandle.screenshot({
  type: 'png',
  omitBackground: false,
});
```

**Why Puppeteer over headless-gl:**
- headless-gl only supports WebGL 1.0
- Three.js 0.170+ requires WebGL 2.0 features
- Puppeteer uses Chrome's native WebGL2 implementation
- No native build dependencies required

## Risks / Trade-offs

### Risk 1: Browser Startup Overhead
- **Risk**: Puppeteer browser startup adds latency (~500ms-1s on first render)
- **Mitigation**: Use a shared browser instance across renders. First render is slower, subsequent renders are fast (~300-400ms).

### Risk 2: Performance for Large Floorplans
- **Risk**: Complex floorplans with many rooms/floors may be slow to render
- **Mitigation**: Start with basic geometry (no CSG). If needed, add geometry simplification or render caching.

### Risk 3: Dependency Size
- **Risk**: Puppeteer downloads Chromium (~200MB)
- **Mitigation**: Chromium is only downloaded once during npm install. The actual `node_modules` size is minimal. Keep 2D rendering as default.

### Risk 4: CSG Complexity
- **Risk**: Boolean operations for door/window cutouts may be complex
- **Mitigation**: Start without CSG (use simple gaps). Add CSG in future iteration if needed.

## Migration Plan

**Phase 1: MVP (Current Proposal)**
- Add `format: "3d-png"` option to `render_floorplan` tool
- Implement basic geometry (floors, walls without cutouts, stairs as boxes)
- Isometric view only
- No CSG operations

**Phase 2: Enhanced Geometry (Future)**
- Add door/window cutouts using CSG (three-bvh-csg or similar)
- Detailed stair geometry (treads, risers, handrails)
- Lift cabin details

**Phase 3: Advanced Features (Future)**
- Shadows and ambient occlusion
- Multiple camera presets (top-down, side view, corner view)
- Exploded view support

## CLI Script and Makefile Integration

### CLI Script: `scripts/generate-3d-images.ts`

**Purpose:** Provide command-line 3D rendering capability, parallel to `scripts/generate-images.ts` (2D rendering).

**Usage:**
```bash
npx tsx scripts/generate-3d-images.ts <input.floorplan> [output-dir] [options]

Options:
  --projection isometric|perspective   Camera projection mode (default: isometric)
  --camera-pos x,y,z                  Camera position for perspective mode
  --camera-target x,y,z               Camera look-at target for perspective mode
  --fov N                             Field of view in degrees (default: 50)
  --width N                           Output width in pixels (default: 1200)
  --height N                          Output height in pixels (default: 900)
  --all                               Render all floors (default: first floor only)
  --scale N                           Scale factor (for annotation text size)
```

**Example:**
```bash
# Isometric view (default)
npx tsx scripts/generate-3d-images.ts trial/TriplexVilla.floorplan trial --all

# Perspective view from specific angle
npx tsx scripts/generate-3d-images.ts trial/TriplexVilla.floorplan trial \
  --projection perspective \
  --camera-pos 50,30,50 \
  --camera-target 0,0,0 \
  --fov 60
```

### Makefile Targets

Add to `Makefile` for easy invocation:

```makefile
# 3D Rendering targets
export-3d: ## Generate 3D PNG (isometric view)
	npx tsx scripts/generate-3d-images.ts $(FLOORPLAN_FILE) $(OUTPUT_DIR) \
		--all --width 1200 --height 900

export-3d-perspective: ## Generate 3D PNG (perspective view)
	npx tsx scripts/generate-3d-images.ts $(FLOORPLAN_FILE) $(OUTPUT_DIR) \
		--all --projection perspective \
		--camera-pos $(CAMERA_POS) --camera-target $(CAMERA_TARGET) --fov $(FOV)
```

**Usage:**
```bash
# Isometric view
make export-3d FLOORPLAN_FILE=trial/TriplexVilla.floorplan

# Perspective view
make export-3d-perspective \
  FLOORPLAN_FILE=trial/TriplexVilla.floorplan \
  CAMERA_POS=50,30,50 \
  CAMERA_TARGET=0,0,0 \
  FOV=60
```

### Code Reuse Strategy

The CLI script will:
1. Import `render3DToPng` from `mcp-server/src/utils/renderer3d.ts`
2. Parse command-line arguments
3. Load and parse floorplan DSL (reuse from `scripts/generate-images.ts`)
4. Call `render3DToPng` with options
5. Write PNG buffer to output file

**Dependency:** The CLI script depends on the MCP server package, so users must build `mcp-server` first:
```bash
npm run build --workspace mcp-server
npx tsx scripts/generate-3d-images.ts ...
```

## Open Questions

1. **Should we support custom lighting configuration?**
   - **Proposal**: Start with fixed ambient + directional light. Add custom lighting in future if requested.

2. **Should we render annotations (area, dimensions) in 3D space?**
   - **Proposal**: Defer to Phase 2. For MVP, annotations only work in 2D mode.

3. **Should we support transparent walls for interior visualization?**
   - **Proposal**: Defer to Phase 2. Add `wallOpacity` option later.

4. **Default image resolution for 3D rendering?**
   - **Proposal**: Use 1200x900 for CLI/Makefile targets (higher than 2D's 800x600) due to depth perception needs. MCP server keeps 800x600 default for compatibility.

