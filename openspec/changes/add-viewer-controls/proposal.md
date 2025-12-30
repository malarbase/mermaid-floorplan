## Why
The 3D viewer currently has minimal UI controls (only exploded view slider and file input). Users need more control over the visualization for presentation, analysis, and export purposes:

1. **Light position control** - Fixed directional light at (50, 100, 50) limits shadow visualization options
2. **No export capability** - Users cannot save 3D models for use in other software
3. **Camera locked to perspective** - No orthographic or isometric views for technical drawings

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

## What Changes
- Add light position controls (azimuth/elevation sliders or XYZ inputs)
- Add GLTF/GLB export button using Three.js GLTFExporter
- Add camera mode toggle (Perspective/Orthographic)
- Add FOV slider for perspective mode
- Add isometric view preset button
- Expand the controls panel UI

## Impact
- Affected specs: `3d-viewer`
- Affected code: `viewer/src/main.ts`, `viewer/index.html`
- New dependencies: Three.js GLTFExporter (already available in three/examples)

