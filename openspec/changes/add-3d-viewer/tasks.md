## 1. Data Export
- [x] 1.1 Create `scripts/export-json.ts` to transform `Floorplan` AST to JSON.
- [x] 1.2 Implement logic to resolve all room positions and convert to 3D coordinates (x, z).
- [x] 1.3 Map wall specifications and dimensions to 3D properties.

## 2. 3D Viewer Application
- [x] 2.1 Initialize a new Three.js project in `viewer/` (or similar structure).
- [x] 2.2 Create `viewer/index.html` with basic Three.js scene setup.
- [x] 2.3 Implement floor rendering logic (extruding 2D shapes).
- [x] 2.4 Implement wall generation logic using CSG (merging walls, subtracting door/window holes).
- [x] 2.5 Add camera controls (OrbitControls).
- [x] 2.6 Implement "Exploded View" slider/toggle to vertically separate floors.

## 3. Integration
- [x] 3.1 Update `Makefile` to include a `viewer` target.
- [x] 3.2 Ensure the viewer can load the exported JSON file.
- [x] 3.3 Add documentation on how to run the 3D viewer.
