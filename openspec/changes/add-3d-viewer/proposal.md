## Why
Users want to visualize their floorplans in 3D to better understand the spatial layout. Flet's `InteractiveViewer` is limited to 2D, so a dedicated 3D viewer using Three.js is needed.

## What Changes
- Add a new script to export the floorplan DSL to a JSON format suitable for 3D rendering.
- Create a standalone 3D viewer application using Three.js.
- Integrate the 3D viewer into the project structure.
- **Improved Rendering**: Use Constructive Solid Geometry (CSG) for cleaner wall joints and cutouts.
- **Improved UX**: Add "Exploded View" controls to visualize multi-story structures.

## Impact
- Affected specs: `rendering` (adding export capability), `3d-viewer` (new capability).
- Affected code: `scripts/`, `language/src/`, `viewer/` (new directory).
