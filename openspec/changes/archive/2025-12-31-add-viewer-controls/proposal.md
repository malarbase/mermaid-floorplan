## Why
The 3D viewer currently has minimal UI controls (only exploded view slider and file input). Users need more control over the visualization for presentation, analysis, and export purposes:

1. **Light position control** - Fixed directional light at (50, 100, 50) limits shadow visualization options
2. **No export capability** - Users cannot save 3D models for use in other software
3. **Camera locked to perspective** - No orthographic or isometric views for technical drawings
4. **No annotations** - Room areas, dimensions, and metrics are available in 2D SVG but not in 3D viewer
5. **Hidden validation warnings** - DSL validation warnings (door misalignments, wall conflicts, height mismatches) are only visible in the browser console, making them easy to miss during design review

**Research: GLTF/GLB Export**

[glTF (GL Transmission Format)](https://www.khronos.org/gltf/) is the standard for 3D model interchange:
- **GLB**: Binary format, single file containing all data
- **GLTF**: JSON format with separate binary/texture files
- Three.js provides `GLTFExporter` in `three/examples/jsm/exporters/GLTFExporter.js`
- Supports geometry, materials, textures, and scene hierarchy
- Compatible with Blender, Unity, Unreal, SketchUp, and web viewers

**Research: Camera Modes**

| Mode | FOV | Use Case |
|------|-----|----------|
| Perspective | 45-90° typical | Natural view, spatial understanding |
| Orthographic | N/A (parallel projection) | Technical drawings, measurements |
| Isometric | Orthographic at 35.264° pitch | Architectural presentations, game-style view |

Isometric view specifically uses camera angles that produce equal foreshortening on all axes (approximately 45° azimuth, 35.264° elevation).

**Research: 3D Annotations**

Three.js text rendering options:
- **CSS2DRenderer** - HTML elements positioned in 3D space (recommended for labels)
- **TextGeometry** - 3D text meshes (expensive, good for decoration)
- **Sprites with Canvas** - 2D text on billboards (good for always-facing labels)

For dimension lines and area labels, CSS2DRenderer provides the best balance of clarity and performance.

**Research: Validation Warning Display**

The DSL parser (`viewer/src/dsl-parser.ts`) already collects validation warnings from Langium's validation system:
- Warnings include: door position misalignments, wall type conflicts, height mismatches, missing shared boundaries
- Currently only logged to console via `console.warn()` in `main.ts`
- Each warning includes message text and line numbers for traceability

Best practices for warning overlays:
- **Collapsible panel** - Don't block the 3D view by default
- **Warning count badge** - Show number of warnings at a glance
- **Severity indicators** - Use ⚠️ icons and warning colors (#FFA500, #FFD700)
- **Line number links** - Help users locate issues in source file
- **Toggle visibility** - Allow users to hide/show for clean screenshots

## What Changes
- Add light position controls (azimuth/elevation sliders or XYZ inputs)
- Add GLTF/GLB export button using Three.js GLTFExporter
- Add camera mode toggle (Perspective/Orthographic)
- Add FOV slider for perspective mode
- Add isometric view preset button
- **Add annotation toggles (room areas, dimensions, floor summary)**
- **Add unit selection (area: sqft/sqm, length: ft/m)**
- **Add validation warnings overlay (toggleable panel showing DSL validation issues)**
- Expand the controls panel UI

## Impact
- Affected specs: `3d-viewer`
- Affected code: `viewer/src/main.ts`, `viewer/index.html`, `viewer/src/styles.css`
- New dependencies: Three.js GLTFExporter, CSS2DRenderer (already available in three/examples)
- Validation system integration: Uses existing warnings from `dsl-parser.ts`

